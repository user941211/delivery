#!/bin/bash

# 배달 플랫폼 애플리케이션 배포 자동화 스크립트
# Docker 이미지 빌드, 푸시, 배포를 자동화

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
배달 플랫폼 애플리케이션 배포 자동화 스크립트

사용법: $0 [OPTIONS] COMMAND

COMMANDS:
    build       Docker 이미지 빌드
    push        Docker 이미지 푸시 (ECR)
    deploy      EC2 인스턴스에 배포
    rollback    이전 버전으로 롤백
    status      배포 상태 확인
    logs        애플리케이션 로그 확인
    health      헬스체크 실행

OPTIONS:
    -e, --env ENVIRONMENT    환경 설정 (development, staging, production)
    -t, --tag TAG           Docker 이미지 태그 (기본값: latest)
    -r, --region REGION     AWS 리전 (기본값: ap-northeast-2)
    -f, --force             강제 실행
    -v, --verbose           상세 로그 출력
    -h, --help              이 도움말 출력
    --dry-run              실제 실행 없이 명령어만 출력

예제:
    $0 -e development build
    $0 -e production -t v1.2.3 deploy
    $0 -e staging rollback
    $0 -e production status

EOF
}

# 기본값 설정
ENVIRONMENT="development"
IMAGE_TAG="latest"
AWS_REGION="ap-northeast-2"
FORCE=false
VERBOSE=false
DRY_RUN=false
COMMAND=""

# 프로젝트 설정
PROJECT_NAME="delivery-platform"
ECR_REPOSITORY=""
ASG_NAME=""

# 명령행 인수 파싱
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
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
        build|push|deploy|rollback|status|logs|health)
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

# 환경별 설정
setup_environment() {
    ECR_REPOSITORY="${PROJECT_NAME}-${ENVIRONMENT}"
    ASG_NAME="${PROJECT_NAME}-${ENVIRONMENT}-app-asg"
    
    log_info "환경 설정:"
    log_info "  - 환경: $ENVIRONMENT"
    log_info "  - 이미지 태그: $IMAGE_TAG"
    log_info "  - ECR 저장소: $ECR_REPOSITORY"
    log_info "  - Auto Scaling Group: $ASG_NAME"
}

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

# Docker 확인
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker가 설치되지 않았습니다."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker 데몬이 실행되지 않았습니다."
        exit 1
    fi
    
    log_info "Docker 버전: $(docker --version)"
}

# ECR 로그인
ecr_login() {
    log_info "ECR에 로그인 중..."
    
    local ecr_password=$(aws ecr get-login-password --region "$AWS_REGION")
    local registry_url=$(aws sts get-caller-identity --query Account --output text).dkr.ecr.${AWS_REGION}.amazonaws.com
    
    if [[ "$DRY_RUN" == false ]]; then
        echo "$ecr_password" | docker login --username AWS --password-stdin "$registry_url"
        log_success "ECR 로그인 완료"
    else
        log_info "DRY RUN: ECR 로그인 시뮬레이션"
    fi
}

# Docker 이미지 빌드
build_image() {
    log_info "Docker 이미지 빌드 중..."
    
    local image_name="${PROJECT_NAME}:${IMAGE_TAG}"
    local build_args=""
    
    # 환경별 빌드 인수
    case $ENVIRONMENT in
        production)
            build_args="--build-arg NODE_ENV=production --build-arg BUILD_ENV=production"
            ;;
        staging)
            build_args="--build-arg NODE_ENV=staging --build-arg BUILD_ENV=staging"
            ;;
        *)
            build_args="--build-arg NODE_ENV=development --build-arg BUILD_ENV=development"
            ;;
    esac
    
    local docker_cmd="docker build $build_args -t $image_name ."
    
    if [[ "$VERBOSE" == true ]]; then
        docker_cmd="$docker_cmd --progress=plain"
    fi
    
    if [[ "$DRY_RUN" == false ]]; then
        eval "$docker_cmd"
        log_success "Docker 이미지 빌드 완료: $image_name"
    else
        log_info "DRY RUN: $docker_cmd"
    fi
}

# Docker 이미지 푸시
push_image() {
    log_info "Docker 이미지 푸시 중..."
    
    local aws_account=$(aws sts get-caller-identity --query Account --output text)
    local registry_url="${aws_account}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    local local_image="${PROJECT_NAME}:${IMAGE_TAG}"
    local remote_image="${registry_url}/${ECR_REPOSITORY}:${IMAGE_TAG}"
    
    # ECR 저장소 생성 (존재하지 않는 경우)
    if ! aws ecr describe-repositories --repository-names "$ECR_REPOSITORY" --region "$AWS_REGION" &> /dev/null; then
        log_info "ECR 저장소 생성 중: $ECR_REPOSITORY"
        if [[ "$DRY_RUN" == false ]]; then
            aws ecr create-repository --repository-name "$ECR_REPOSITORY" --region "$AWS_REGION"
            log_success "ECR 저장소 생성 완료"
        else
            log_info "DRY RUN: ECR 저장소 생성 시뮬레이션"
        fi
    fi
    
    # 이미지 태그 및 푸시
    if [[ "$DRY_RUN" == false ]]; then
        docker tag "$local_image" "$remote_image"
        docker push "$remote_image"
        log_success "Docker 이미지 푸시 완료: $remote_image"
    else
        log_info "DRY RUN: docker tag $local_image $remote_image"
        log_info "DRY RUN: docker push $remote_image"
    fi
}

# 인스턴스 교체 (배포)
deploy_application() {
    log_info "애플리케이션 배포 중..."
    
    # Launch Template 업데이트
    local lt_id=$(aws ec2 describe-auto-scaling-groups \
        --auto-scaling-group-names "$ASG_NAME" \
        --region "$AWS_REGION" \
        --query "AutoScalingGroups[0].LaunchTemplate.LaunchTemplateId" \
        --output text 2>/dev/null || echo "")
    
    if [[ -z "$lt_id" || "$lt_id" == "None" ]]; then
        log_error "Launch Template을 찾을 수 없습니다."
        return 1
    fi
    
    log_info "Launch Template 업데이트: $lt_id"
    
    # 새 Launch Template 버전 생성
    if [[ "$DRY_RUN" == false ]]; then
        local new_version=$(aws ec2 create-launch-template-version \
            --launch-template-id "$lt_id" \
            --source-version '$Latest' \
            --region "$AWS_REGION" \
            --query "LaunchTemplateVersion.VersionNumber" \
            --output text)
        
        log_success "Launch Template 새 버전 생성: $new_version"
        
        # Auto Scaling Group 인스턴스 교체
        log_info "Auto Scaling Group 인스턴스 교체 시작..."
        aws autoscaling start-instance-refresh \
            --auto-scaling-group-name "$ASG_NAME" \
            --region "$AWS_REGION" \
            --preferences '{
                "InstanceWarmup": 300,
                "MinHealthyPercentage": 50,
                "CheckpointPercentages": [50],
                "CheckpointDelay": 600
            }'
        
        log_success "인스턴스 교체 시작됨"
        
        # 배포 상태 모니터링
        monitor_deployment
    else
        log_info "DRY RUN: Launch Template 업데이트 및 인스턴스 교체 시뮬레이션"
    fi
}

# 배포 상태 모니터링
monitor_deployment() {
    log_info "배포 상태 모니터링 중..."
    
    local timeout=1800  # 30분
    local interval=30   # 30초
    local elapsed=0
    
    while [[ $elapsed -lt $timeout ]]; do
        local refresh_status=$(aws autoscaling describe-instance-refreshes \
            --auto-scaling-group-name "$ASG_NAME" \
            --region "$AWS_REGION" \
            --query "InstanceRefreshes[0].Status" \
            --output text 2>/dev/null || echo "Unknown")
        
        case $refresh_status in
            "Successful")
                log_success "배포 완료!"
                return 0
                ;;
            "Failed"|"Cancelled")
                log_error "배포 실패: $refresh_status"
                return 1
                ;;
            "InProgress"|"Pending")
                local percentage=$(aws autoscaling describe-instance-refreshes \
                    --auto-scaling-group-name "$ASG_NAME" \
                    --region "$AWS_REGION" \
                    --query "InstanceRefreshes[0].PercentageComplete" \
                    --output text 2>/dev/null || echo "0")
                log_info "배포 진행 중... ${percentage}% 완료 (${elapsed}/${timeout}초)"
                ;;
            *)
                log_warning "알 수 없는 상태: $refresh_status"
                ;;
        esac
        
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    log_warning "배포 모니터링 시간 초과"
    return 1
}

# 롤백
rollback_deployment() {
    log_warning "이전 버전으로 롤백 중..."
    
    if [[ "$FORCE" == false ]]; then
        read -p "정말로 롤백하시겠습니까? (yes/no): " confirm
        if [[ "$confirm" != "yes" ]]; then
            log_info "롤백이 취소되었습니다."
            return 0
        fi
    fi
    
    # 이전 Launch Template 버전으로 롤백
    local lt_id=$(aws ec2 describe-auto-scaling-groups \
        --auto-scaling-group-names "$ASG_NAME" \
        --region "$AWS_REGION" \
        --query "AutoScalingGroups[0].LaunchTemplate.LaunchTemplateId" \
        --output text)
    
    local current_version=$(aws ec2 describe-auto-scaling-groups \
        --auto-scaling-group-names "$ASG_NAME" \
        --region "$AWS_REGION" \
        --query "AutoScalingGroups[0].LaunchTemplate.Version" \
        --output text)
    
    local previous_version=$((current_version - 1))
    
    if [[ $previous_version -lt 1 ]]; then
        log_error "롤백할 이전 버전이 없습니다."
        return 1
    fi
    
    if [[ "$DRY_RUN" == false ]]; then
        # Auto Scaling Group 업데이트
        aws autoscaling update-auto-scaling-group \
            --auto-scaling-group-name "$ASG_NAME" \
            --launch-template "{\"LaunchTemplateId\":\"$lt_id\",\"Version\":\"$previous_version\"}" \
            --region "$AWS_REGION"
        
        # 인스턴스 교체
        aws autoscaling start-instance-refresh \
            --auto-scaling-group-name "$ASG_NAME" \
            --region "$AWS_REGION"
        
        log_success "롤백 시작됨 (버전: $previous_version)"
        monitor_deployment
    else
        log_info "DRY RUN: 롤백 시뮬레이션 (버전: $previous_version)"
    fi
}

# 배포 상태 확인
check_status() {
    log_info "배포 상태 확인 중..."
    
    # Auto Scaling Group 상태
    local asg_info=$(aws autoscaling describe-auto-scaling-groups \
        --auto-scaling-group-names "$ASG_NAME" \
        --region "$AWS_REGION" \
        --query "AutoScalingGroups[0].[DesiredCapacity,MinSize,MaxSize,Instances[?LifecycleState=='InService']|length(@)]" \
        --output text 2>/dev/null || echo "0 0 0 0")
    
    read -r desired min_size max_size in_service <<< "$asg_info"
    
    log_info "Auto Scaling Group 상태:"
    log_info "  - 희망 용량: $desired"
    log_info "  - 최소 크기: $min_size"
    log_info "  - 최대 크기: $max_size"
    log_info "  - 서비스 중 인스턴스: $in_service"
    
    # 로드 밸런서 상태
    local healthy_targets=$(aws elbv2 describe-target-health \
        --target-group-arn "$(get_target_group_arn)" \
        --region "$AWS_REGION" \
        --query "length(TargetHealthDescriptions[?TargetHealth.State=='healthy'])" \
        --output text 2>/dev/null || echo "0")
    
    log_info "로드 밸런서 상태:"
    log_info "  - 건강한 타겟: $healthy_targets"
    
    # 인스턴스 교체 상태
    local refresh_status=$(aws autoscaling describe-instance-refreshes \
        --auto-scaling-group-name "$ASG_NAME" \
        --region "$AWS_REGION" \
        --query "InstanceRefreshes[0].[Status,PercentageComplete]" \
        --output text 2>/dev/null || echo "None 0")
    
    read -r status percentage <<< "$refresh_status"
    
    if [[ "$status" != "None" ]]; then
        log_info "인스턴스 교체 상태:"
        log_info "  - 상태: $status"
        log_info "  - 진행률: $percentage%"
    fi
}

# Target Group ARN 조회
get_target_group_arn() {
    aws elbv2 describe-target-groups \
        --names "${PROJECT_NAME}-${ENVIRONMENT}-app-tg" \
        --region "$AWS_REGION" \
        --query "TargetGroups[0].TargetGroupArn" \
        --output text 2>/dev/null || echo ""
}

# 애플리케이션 로그 확인
check_logs() {
    log_info "애플리케이션 로그 확인 중..."
    
    local log_group="/delivery-platform/${ENVIRONMENT}/app"
    local start_time=$(date -d "1 hour ago" +%s)000
    
    aws logs filter-log-events \
        --log-group-name "$log_group" \
        --start-time "$start_time" \
        --region "$AWS_REGION" \
        --query "events[].[timestamp,message]" \
        --output text | \
    while read -r timestamp message; do
        local formatted_time=$(date -d "@$((timestamp / 1000))" "+%Y-%m-%d %H:%M:%S")
        echo "[$formatted_time] $message"
    done
}

# 헬스체크
health_check() {
    log_info "헬스체크 실행 중..."
    
    # 로드 밸런서 DNS 조회
    local lb_dns=$(aws elbv2 describe-load-balancers \
        --names "${PROJECT_NAME}-${ENVIRONMENT}-alb" \
        --region "$AWS_REGION" \
        --query "LoadBalancers[0].DNSName" \
        --output text 2>/dev/null || echo "")
    
    if [[ -z "$lb_dns" ]]; then
        log_error "로드 밸런서를 찾을 수 없습니다."
        return 1
    fi
    
    local health_url="http://$lb_dns/health"
    log_info "헬스체크 URL: $health_url"
    
    if curl -f -s --connect-timeout 10 "$health_url" > /dev/null; then
        log_success "헬스체크 성공"
        
        # 상세 응답 정보
        if [[ "$VERBOSE" == true ]]; then
            curl -s "$health_url" | jq . 2>/dev/null || curl -s "$health_url"
        fi
    else
        log_error "헬스체크 실패"
        return 1
    fi
}

# 메인 실행 함수
main() {
    log_info "=== 배달 플랫폼 애플리케이션 배포 시작 ==="
    log_info "명령어: $COMMAND"
    
    # 환경 설정
    setup_environment
    
    # 기본 확인
    check_aws_cli
    
    case $COMMAND in
        build)
            check_docker
            build_image
            ;;
        push)
            check_docker
            ecr_login
            push_image
            ;;
        deploy)
            deploy_application
            ;;
        rollback)
            rollback_deployment
            ;;
        status)
            check_status
            ;;
        logs)
            check_logs
            ;;
        health)
            health_check
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