#!/bin/bash

# 배달 플랫폼 도메인 및 SSL 인증서 설정 스크립트
# Route 53과 Certificate Manager를 사용한 도메인 구성

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수들
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 도움말 함수
show_help() {
    cat << EOF
배달 플랫폼 도메인 및 SSL 인증서 설정 스크립트

사용법: $0 [OPTIONS] COMMAND

COMMANDS:
    check       도메인 상태 확인
    setup       도메인 및 SSL 인증서 설정
    verify      SSL 인증서 검증 상태 확인
    test        도메인 접속 테스트
    cleanup     도메인 설정 정리

OPTIONS:
    -d, --domain DOMAIN      도메인 이름 (예: delivery.com)
    -e, --env ENVIRONMENT    환경 설정 (development, staging, production)
    -r, --region REGION      AWS 리전 (기본값: ap-northeast-2)
    -h, --help               이 도움말 출력
    --dry-run                실제 실행 없이 명령어만 출력

예제:
    $0 -d delivery.com -e production setup
    $0 -d delivery.com check
    $0 -d delivery.com verify
    $0 -d delivery.com test

EOF
}

# 기본값 설정
DOMAIN=""
ENVIRONMENT="development"
AWS_REGION="ap-northeast-2"
DRY_RUN=false
COMMAND=""

# 명령행 인수 파싱
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--domain)
            DOMAIN="$2"
            shift 2
            ;;
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        check|setup|verify|test|cleanup)
            COMMAND="$1"
            shift
            ;;
        *)
            log_error "알 수 없는 옵션: $1"
            show_help
            exit 1
            ;;
    esac
done

# 필수 인수 확인
if [[ -z "$COMMAND" ]]; then
    log_error "명령어가 필요합니다."
    show_help
    exit 1
fi

if [[ -z "$DOMAIN" ]]; then
    log_error "도메인이 필요합니다. -d 옵션을 사용하세요."
    show_help
    exit 1
fi

# AWS CLI 확인
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI가 설치되지 않았습니다."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS 자격증명이 설정되지 않았습니다."
        exit 1
    fi
    
    local aws_account=$(aws sts get-caller-identity --query Account --output text)
    log_info "AWS 계정: $aws_account"
}

# Route 53 Hosted Zone 확인
check_hosted_zone() {
    log_info "Route 53 Hosted Zone 확인 중: $DOMAIN"
    
    local zone_id=$(aws route53 list-hosted-zones-by-name \
        --dns-name "$DOMAIN" \
        --query "HostedZones[?Name=='${DOMAIN}.'].Id" \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$zone_id" ]]; then
        # Zone ID에서 '/hostedzone/' 접두사 제거
        zone_id=$(echo "$zone_id" | sed 's|/hostedzone/||')
        log_success "Hosted Zone 발견: $zone_id"
        echo "$zone_id"
    else
        log_warning "Hosted Zone이 존재하지 않습니다: $DOMAIN"
        echo ""
    fi
}

# DNS 레코드 확인
check_dns_records() {
    local zone_id="$1"
    
    if [[ -z "$zone_id" ]]; then
        log_warning "Hosted Zone ID가 없어 DNS 레코드를 확인할 수 없습니다."
        return
    fi
    
    log_info "DNS 레코드 확인 중..."
    
    # A 레코드 확인
    local records=$(aws route53 list-resource-record-sets \
        --hosted-zone-id "$zone_id" \
        --query "ResourceRecordSets[?Type=='A'].Name" \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$records" ]]; then
        log_success "A 레코드 발견:"
        echo "$records" | tr '\t' '\n' | while read -r record; do
            echo "  - $record"
        done
    else
        log_warning "A 레코드가 없습니다."
    fi
}

# SSL 인증서 확인
check_ssl_certificate() {
    log_info "SSL 인증서 확인 중: $DOMAIN"
    
    local cert_arn=$(aws acm list-certificates \
        --region "$AWS_REGION" \
        --query "CertificateSummaryList[?DomainName=='$DOMAIN'].CertificateArn" \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$cert_arn" ]]; then
        log_success "SSL 인증서 발견: $cert_arn"
        
        # 인증서 상태 확인
        local status=$(aws acm describe-certificate \
            --certificate-arn "$cert_arn" \
            --region "$AWS_REGION" \
            --query "Certificate.Status" \
            --output text 2>/dev/null || echo "UNKNOWN")
        
        case $status in
            "ISSUED")
                log_success "SSL 인증서 상태: 발급 완료"
                ;;
            "PENDING_VALIDATION")
                log_warning "SSL 인증서 상태: 검증 대기 중"
                ;;
            "FAILED"|"VALIDATION_TIMED_OUT")
                log_error "SSL 인증서 상태: 실패 ($status)"
                ;;
            *)
                log_warning "SSL 인증서 상태: $status"
                ;;
        esac
        
        echo "$cert_arn"
    else
        log_warning "SSL 인증서가 없습니다: $DOMAIN"
        echo ""
    fi
}

# 도메인 접속 테스트
test_domain_connectivity() {
    log_info "도메인 접속 테스트 중..."
    
    # DNS 해석 테스트
    if nslookup "$DOMAIN" &> /dev/null; then
        local ip=$(nslookup "$DOMAIN" | grep "Address:" | tail -1 | awk '{print $2}')
        log_success "DNS 해석 성공: $DOMAIN -> $ip"
    else
        log_error "DNS 해석 실패: $DOMAIN"
        return 1
    fi
    
    # HTTP 접속 테스트
    if curl -s --connect-timeout 10 "http://$DOMAIN/health" &> /dev/null; then
        log_success "HTTP 접속 성공: http://$DOMAIN"
    else
        log_warning "HTTP 접속 실패: http://$DOMAIN"
    fi
    
    # HTTPS 접속 테스트
    if curl -s --connect-timeout 10 "https://$DOMAIN/health" &> /dev/null; then
        log_success "HTTPS 접속 성공: https://$DOMAIN"
        
        # SSL 인증서 정보 확인
        local cert_info=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -subject -dates 2>/dev/null || echo "")
        if [[ -n "$cert_info" ]]; then
            log_info "SSL 인증서 정보:"
            echo "$cert_info" | sed 's/^/  /'
        fi
    else
        log_warning "HTTPS 접속 실패: https://$DOMAIN"
    fi
}

# 서브도메인 테스트
test_subdomains() {
    local subdomains=("www" "api")
    
    for subdomain in "${subdomains[@]}"; do
        local full_domain="${subdomain}.${DOMAIN}"
        log_info "서브도메인 테스트: $full_domain"
        
        if nslookup "$full_domain" &> /dev/null; then
            log_success "DNS 해석 성공: $full_domain"
            
            # HTTPS 접속 테스트
            if curl -s --connect-timeout 5 "https://$full_domain/health" &> /dev/null; then
                log_success "HTTPS 접속 성공: https://$full_domain"
            else
                log_warning "HTTPS 접속 실패: https://$full_domain"
            fi
        else
            log_warning "DNS 해석 실패: $full_domain"
        fi
    done
}

# Terraform 변수 업데이트
update_terraform_vars() {
    local terraform_dir="./terraform"
    local vars_file="$terraform_dir/terraform-${ENVIRONMENT}.tfvars"
    
    if [[ ! -f "$vars_file" ]]; then
        vars_file="$terraform_dir/terraform.tfvars"
    fi
    
    if [[ ! -f "$vars_file" ]]; then
        log_warning "Terraform 변수 파일을 찾을 수 없습니다."
        return
    fi
    
    log_info "Terraform 변수 파일 업데이트: $vars_file"
    
    # 백업 생성
    cp "$vars_file" "${vars_file}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # 도메인 변수 업데이트
    if grep -q "domain_name" "$vars_file"; then
        sed -i.tmp "s/domain_name = .*/domain_name = \"$DOMAIN\"/" "$vars_file"
        rm -f "${vars_file}.tmp"
    else
        echo "domain_name = \"$DOMAIN\"" >> "$vars_file"
    fi
    
    log_success "Terraform 변수 파일이 업데이트되었습니다."
}

# DNS 전파 대기
wait_for_dns_propagation() {
    local timeout=300  # 5분
    local interval=30   # 30초
    local elapsed=0
    
    log_info "DNS 전파 대기 중... (최대 ${timeout}초)"
    
    while [[ $elapsed -lt $timeout ]]; do
        if nslookup "$DOMAIN" &> /dev/null; then
            log_success "DNS 전파 완료!"
            return 0
        fi
        
        log_info "DNS 전파 대기 중... (${elapsed}/${timeout}초)"
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    log_warning "DNS 전파 시간 초과. 수동으로 확인해주세요."
    return 1
}

# SSL 인증서 검증 대기
wait_for_ssl_validation() {
    local cert_arn="$1"
    local timeout=600  # 10분
    local interval=30   # 30초
    local elapsed=0
    
    log_info "SSL 인증서 검증 대기 중... (최대 ${timeout}초)"
    
    while [[ $elapsed -lt $timeout ]]; do
        local status=$(aws acm describe-certificate \
            --certificate-arn "$cert_arn" \
            --region "$AWS_REGION" \
            --query "Certificate.Status" \
            --output text 2>/dev/null || echo "UNKNOWN")
        
        case $status in
            "ISSUED")
                log_success "SSL 인증서 검증 완료!"
                return 0
                ;;
            "FAILED"|"VALIDATION_TIMED_OUT")
                log_error "SSL 인증서 검증 실패: $status"
                return 1
                ;;
            *)
                log_info "SSL 인증서 검증 대기 중... 상태: $status (${elapsed}/${timeout}초)"
                ;;
        esac
        
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    log_warning "SSL 인증서 검증 시간 초과."
    return 1
}

# 메인 실행 함수
main() {
    log_info "=== 배달 플랫폼 도메인 설정 시작 ==="
    log_info "도메인: $DOMAIN"
    log_info "환경: $ENVIRONMENT"
    log_info "리전: $AWS_REGION"
    log_info "명령어: $COMMAND"
    
    # AWS CLI 확인
    check_aws_cli
    
    case $COMMAND in
        check)
            log_info "도메인 상태 확인 중..."
            local zone_id=$(check_hosted_zone)
            check_dns_records "$zone_id"
            check_ssl_certificate
            ;;
        setup)
            log_info "도메인 및 SSL 인증서 설정 중..."
            update_terraform_vars
            log_info "Terraform을 사용하여 인프라를 배포하세요:"
            echo "  ./scripts/deploy-infrastructure.sh -e $ENVIRONMENT apply"
            ;;
        verify)
            log_info "SSL 인증서 검증 상태 확인 중..."
            local cert_arn=$(check_ssl_certificate)
            if [[ -n "$cert_arn" ]]; then
                wait_for_ssl_validation "$cert_arn"
            fi
            ;;
        test)
            log_info "도메인 접속 테스트 중..."
            test_domain_connectivity
            test_subdomains
            ;;
        cleanup)
            log_warning "도메인 설정 정리는 Terraform destroy를 사용하세요:"
            echo "  ./scripts/deploy-infrastructure.sh -e $ENVIRONMENT destroy"
            ;;
        *)
            log_error "지원하지 않는 명령어: $COMMAND"
            exit 1
            ;;
    esac
    
    log_success "=== 작업이 완료되었습니다! ==="
}

# 스크립트 실행
main "$@" 