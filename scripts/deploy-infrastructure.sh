#!/bin/bash

# 배달 플랫폼 인프라 배포 스크립트
# Terraform을 사용한 클라우드 인프라 자동 배포

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
배달 플랫폼 인프라 배포 스크립트

사용법: $0 [OPTIONS] COMMAND

COMMANDS:
    plan        Terraform plan 실행 (변경사항 미리보기)
    apply       인프라 배포 실행
    destroy     인프라 삭제
    output      배포된 인프라 정보 출력
    validate    Terraform 설정 검증
    init        Terraform 초기화

OPTIONS:
    -e, --env ENVIRONMENT    환경 설정 (development, staging, production)
    -p, --provider PROVIDER  클라우드 프로바이더 (aws, gcp, azure, multi)
    -v, --vars-file FILE     Terraform 변수 파일 경로
    -h, --help               이 도움말 출력
    --auto-approve           apply/destroy 시 자동 승인
    --dry-run                실제 배포 없이 명령어만 출력

예제:
    $0 -e development plan
    $0 -e production apply
    $0 -e staging destroy --auto-approve
    $0 output

EOF
}

# 기본값 설정
ENVIRONMENT="development"
CLOUD_PROVIDER="aws"
VARS_FILE=""
AUTO_APPROVE=false
DRY_RUN=false
COMMAND=""

# 명령행 인수 파싱
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -p|--provider)
            CLOUD_PROVIDER="$2"
            shift 2
            ;;
        -v|--vars-file)
            VARS_FILE="$2"
            shift 2
            ;;
        --auto-approve)
            AUTO_APPROVE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        plan|apply|destroy|output|validate|init)
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

# 환경 변수 검증
validate_environment() {
    case $ENVIRONMENT in
        development|staging|production)
            log_info "환경: $ENVIRONMENT"
            ;;
        *)
            log_error "지원하지 않는 환경: $ENVIRONMENT"
            log_error "지원되는 환경: development, staging, production"
            exit 1
            ;;
    esac
}

# 클라우드 프로바이더 검증
validate_provider() {
    case $CLOUD_PROVIDER in
        aws|gcp|azure|multi)
            log_info "클라우드 프로바이더: $CLOUD_PROVIDER"
            ;;
        *)
            log_error "지원하지 않는 프로바이더: $CLOUD_PROVIDER"
            log_error "지원되는 프로바이더: aws, gcp, azure, multi"
            exit 1
            ;;
    esac
}

# 필수 도구 확인
check_prerequisites() {
    log_info "필수 도구 확인 중..."
    
    # Terraform 확인
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform이 설치되지 않았습니다."
        log_error "설치 방법: https://www.terraform.io/downloads.html"
        exit 1
    fi
    
    local tf_version=$(terraform version -json 2>/dev/null | jq -r '.terraform_version' 2>/dev/null || terraform version | head -1)
    log_info "Terraform 버전: $tf_version"
    
    # AWS CLI 확인 (AWS 사용 시)
    if [[ "$CLOUD_PROVIDER" == "aws" || "$CLOUD_PROVIDER" == "multi" ]]; then
        if ! command -v aws &> /dev/null; then
            log_error "AWS CLI가 설치되지 않았습니다."
            log_error "설치 방법: https://aws.amazon.com/cli/"
            exit 1
        fi
        
        # AWS 자격증명 확인
        if ! aws sts get-caller-identity &> /dev/null; then
            log_error "AWS 자격증명이 설정되지 않았습니다."
            log_error "aws configure를 실행하여 설정하세요."
            exit 1
        fi
        
        local aws_account=$(aws sts get-caller-identity --query Account --output text)
        log_info "AWS 계정: $aws_account"
    fi
}

# Terraform 작업 디렉토리 설정
setup_terraform_directory() {
    local terraform_dir="./terraform"
    
    if [[ ! -d "$terraform_dir" ]]; then
        log_error "Terraform 디렉토리를 찾을 수 없습니다: $terraform_dir"
        exit 1
    fi
    
    cd "$terraform_dir"
    log_info "작업 디렉토리: $(pwd)"
}

# Terraform 변수 파일 설정
setup_vars_file() {
    if [[ -n "$VARS_FILE" ]]; then
        if [[ ! -f "$VARS_FILE" ]]; then
            log_error "변수 파일을 찾을 수 없습니다: $VARS_FILE"
            exit 1
        fi
        log_info "변수 파일: $VARS_FILE"
    else
        # 환경별 기본 변수 파일 확인
        local default_vars="terraform.tfvars"
        local env_vars="terraform-${ENVIRONMENT}.tfvars"
        
        if [[ -f "$env_vars" ]]; then
            VARS_FILE="$env_vars"
            log_info "환경별 변수 파일 사용: $VARS_FILE"
        elif [[ -f "$default_vars" ]]; then
            VARS_FILE="$default_vars"
            log_info "기본 변수 파일 사용: $VARS_FILE"
        else
            log_warning "변수 파일을 찾을 수 없습니다. 기본값을 사용합니다."
        fi
    fi
}

# Terraform 명령어 실행
run_terraform_command() {
    local cmd="$1"
    local tf_cmd="terraform $cmd"
    
    # 변수 파일 추가
    if [[ -n "$VARS_FILE" && "$cmd" != "init" && "$cmd" != "validate" ]]; then
        tf_cmd="$tf_cmd -var-file=\"$VARS_FILE\""
    fi
    
    # 환경 변수 추가
    tf_cmd="$tf_cmd -var=\"environment=$ENVIRONMENT\" -var=\"cloud_provider=$CLOUD_PROVIDER\""
    
    # auto-approve 추가 (apply/destroy 시)
    if [[ "$AUTO_APPROVE" == true && ("$cmd" == "apply" || "$cmd" == "destroy") ]]; then
        tf_cmd="$tf_cmd -auto-approve"
    fi
    
    log_info "실행할 명령어: $tf_cmd"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_warning "DRY RUN 모드: 실제 명령어를 실행하지 않습니다."
        return 0
    fi
    
    # Terraform 명령어 실행
    eval "$tf_cmd"
}

# 상태 백업
backup_state() {
    if [[ -f "terraform.tfstate" ]]; then
        local backup_file="terraform.tfstate.backup.$(date +%Y%m%d_%H%M%S)"
        cp terraform.tfstate "$backup_file"
        log_info "상태 파일 백업: $backup_file"
    fi
}

# 배포 후 정보 출력
show_deployment_info() {
    if [[ "$COMMAND" == "apply" && "$DRY_RUN" == false ]]; then
        log_success "배포가 완료되었습니다!"
        log_info "배포 정보를 확인하려면 다음 명령어를 실행하세요:"
        echo "    $0 output"
        echo ""
        log_info "접속 URL 확인:"
        terraform output application_urls 2>/dev/null || true
    fi
}

# 메인 실행 함수
main() {
    log_info "=== 배달 플랫폼 인프라 배포 시작 ==="
    log_info "명령어: $COMMAND"
    
    # 검증
    validate_environment
    validate_provider
    check_prerequisites
    
    # 설정
    setup_terraform_directory
    setup_vars_file
    
    # 상태 백업 (apply/destroy 전)
    if [[ "$COMMAND" == "apply" || "$COMMAND" == "destroy" ]]; then
        backup_state
    fi
    
    # Terraform 명령어 실행
    case $COMMAND in
        init)
            log_info "Terraform 초기화 중..."
            run_terraform_command "init"
            ;;
        validate)
            log_info "Terraform 설정 검증 중..."
            run_terraform_command "validate"
            ;;
        plan)
            log_info "Terraform 계획 생성 중..."
            run_terraform_command "plan"
            ;;
        apply)
            log_info "인프라 배포 중..."
            run_terraform_command "apply"
            show_deployment_info
            ;;
        destroy)
            log_warning "인프라를 삭제합니다!"
            if [[ "$AUTO_APPROVE" == false ]]; then
                read -p "정말로 인프라를 삭제하시겠습니까? (yes/no): " confirm
                if [[ "$confirm" != "yes" ]]; then
                    log_info "삭제가 취소되었습니다."
                    exit 0
                fi
            fi
            run_terraform_command "destroy"
            ;;
        output)
            log_info "배포 정보 출력 중..."
            terraform output
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