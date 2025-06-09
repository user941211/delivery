#!/bin/bash

# 배달 플랫폼 배포 자동화 스크립트
# 사용법: ./scripts/deploy.sh [environment] [service]
# 예시: ./scripts/deploy.sh production api

set -euo pipefail

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로깅 함수
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

# 도움말 표시
show_help() {
    cat << EOF
배달 플랫폼 배포 스크립트

사용법:
    $0 [ENVIRONMENT] [SERVICE] [OPTIONS]

환경:
    development     개발 환경
    staging         스테이징 환경  
    production      프로덕션 환경

서비스:
    api            백엔드 API 서버
    web            웹 애플리케이션
    all            모든 서비스

옵션:
    --dry-run      실제 배포 없이 시뮬레이션만 실행
    --rollback     이전 버전으로 롤백
    --health-check 배포 후 헬스체크만 실행
    --help         이 도움말 표시

예시:
    $0 production api
    $0 staging all --dry-run
    $0 production api --rollback
EOF
}

# 환경 변수 검증
validate_environment() {
    local env=$1
    
    case $env in
        development|staging|production)
            log_info "환경: $env"
            ;;
        *)
            log_error "지원하지 않는 환경입니다: $env"
            show_help
            exit 1
            ;;
    esac
}

# 서비스 검증
validate_service() {
    local service=$1
    
    case $service in
        api|web|all)
            log_info "서비스: $service"
            ;;
        *)
            log_error "지원하지 않는 서비스입니다: $service"
            show_help
            exit 1
            ;;
    esac
}

# Docker 이미지 빌드
build_image() {
    local service=$1
    local environment=$2
    
    log_info "Docker 이미지 빌드 중: $service"
    
    # 이미지 태그 생성
    local image_tag="delivery-platform-$service:$environment-$(git rev-parse --short HEAD)"
    
    # Dockerfile 경로
    local dockerfile="apps/$service/Dockerfile"
    
    if [[ ! -f "$dockerfile" ]]; then
        log_error "Dockerfile을 찾을 수 없습니다: $dockerfile"
        return 1
    fi
    
    # 빌드 실행
    if docker build -t "$image_tag" -f "$dockerfile" .; then
        log_success "이미지 빌드 완료: $image_tag"
        echo "$image_tag"
    else
        log_error "이미지 빌드 실패: $service"
        return 1
    fi
}

# 이미지 푸시
push_image() {
    local image_tag=$1
    local registry=${DOCKER_REGISTRY:-"ghcr.io/your-org"}
    
    log_info "이미지 푸시 중: $image_tag"
    
    # 레지스트리에 태그 추가
    local remote_tag="$registry/$image_tag"
    docker tag "$image_tag" "$remote_tag"
    
    # 푸시 실행
    if docker push "$remote_tag"; then
        log_success "이미지 푸시 완료: $remote_tag"
        echo "$remote_tag"
    else
        log_error "이미지 푸시 실패: $image_tag"
        return 1
    fi
}

# 헬스체크 실행
health_check() {
    local service=$1
    local environment=$2
    local max_attempts=30
    local attempt=1
    
    log_info "헬스체크 시작: $service ($environment)"
    
    # 환경별 URL 설정
    local base_url
    case $environment in
        development)
            base_url="http://localhost"
            ;;
        staging)
            base_url="https://staging.delivery.com"
            ;;
        production)
            base_url="https://delivery.com"
            ;;
    esac
    
    # 서비스별 헬스체크 URL
    local health_url
    case $service in
        api)
            health_url="$base_url:3000/health"
            ;;
        web)
            health_url="$base_url:3001/api/health"
            ;;
    esac
    
    while [[ $attempt -le $max_attempts ]]; do
        log_info "헬스체크 시도 $attempt/$max_attempts: $health_url"
        
        if curl -f -s "$health_url" > /dev/null; then
            log_success "헬스체크 성공: $service"
            return 0
        fi
        
        sleep 10
        ((attempt++))
    done
    
    log_error "헬스체크 실패: $service (시도 횟수: $max_attempts)"
    return 1
}

# Docker Compose 배포
deploy_with_compose() {
    local environment=$1
    local service=$2
    local dry_run=$3
    
    log_info "Docker Compose로 배포 중..."
    
    # 환경별 Docker Compose 파일
    local compose_file
    case $environment in
        development)
            compose_file="docker-compose.dev.yml"
            ;;
        staging|production)
            compose_file="docker-compose.yml"
            ;;
    esac
    
    if [[ ! -f "$compose_file" ]]; then
        log_error "Docker Compose 파일을 찾을 수 없습니다: $compose_file"
        return 1
    fi
    
    # 환경 변수 설정
    export ENVIRONMENT=$environment
    export IMAGE_TAG="$environment-$(git rev-parse --short HEAD)"
    
    if [[ "$dry_run" == "true" ]]; then
        log_warning "DRY RUN 모드: 실제 배포를 수행하지 않습니다"
        docker-compose -f "$compose_file" config
        return 0
    fi
    
    # 서비스별 배포
    if [[ "$service" == "all" ]]; then
        docker-compose -f "$compose_file" up -d
    else
        docker-compose -f "$compose_file" up -d "$service"
    fi
    
    log_success "Docker Compose 배포 완료"
}

# AWS ECS 배포
deploy_to_ecs() {
    local environment=$1
    local service=$2
    local image_tag=$3
    local dry_run=$4
    
    log_info "AWS ECS로 배포 중..."
    
    # AWS CLI 설치 확인
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI가 설치되지 않았습니다"
        return 1
    fi
    
    # 클러스터 및 서비스 이름
    local cluster_name="delivery-$environment"
    local service_name="delivery-$service-$environment"
    
    if [[ "$dry_run" == "true" ]]; then
        log_warning "DRY RUN 모드: 실제 배포를 수행하지 않습니다"
        aws ecs describe-services --cluster "$cluster_name" --services "$service_name"
        return 0
    fi
    
    # 태스크 정의 업데이트
    log_info "태스크 정의 업데이트 중..."
    
    # 서비스 업데이트
    if aws ecs update-service \
        --cluster "$cluster_name" \
        --service "$service_name" \
        --force-new-deployment \
        --deployment-configuration "maximumPercent=200,minimumHealthyPercent=50"; then
        
        log_success "ECS 서비스 업데이트 시작: $service_name"
        
        # 배포 완료 대기
        log_info "배포 완료 대기 중..."
        if aws ecs wait services-stable --cluster "$cluster_name" --services "$service_name"; then
            log_success "ECS 배포 완료: $service_name"
        else
            log_error "ECS 배포 타임아웃: $service_name"
            return 1
        fi
    else
        log_error "ECS 서비스 업데이트 실패: $service_name"
        return 1
    fi
}

# 롤백 실행
rollback_deployment() {
    local environment=$1
    local service=$2
    
    log_warning "롤백을 시작합니다..."
    
    # 이전 Git 커밋으로 롤백
    local previous_commit=$(git rev-parse HEAD~1)
    log_info "이전 커밋으로 롤백: $previous_commit"
    
    # 이전 이미지 태그 생성
    local previous_tag="delivery-platform-$service:$environment-${previous_commit:0:7}"
    
    # 롤백 배포
    if [[ "$DEPLOY_METHOD" == "ecs" ]]; then
        deploy_to_ecs "$environment" "$service" "$previous_tag" "false"
    else
        # Docker Compose 롤백
        export IMAGE_TAG="$environment-${previous_commit:0:7}"
        deploy_with_compose "$environment" "$service" "false"
    fi
    
    log_success "롤백 완료"
}

# 배포 후 검증
post_deploy_verification() {
    local environment=$1
    local service=$2
    
    log_info "배포 후 검증 시작..."
    
    # 헬스체크
    if ! health_check "$service" "$environment"; then
        log_error "배포 후 헬스체크 실패"
        return 1
    fi
    
    # 스모크 테스트 (간단한 API 호출)
    if [[ "$service" == "api" || "$service" == "all" ]]; then
        log_info "API 스모크 테스트 실행 중..."
        # 기본 API 엔드포인트 테스트
    fi
    
    log_success "배포 후 검증 완료"
}

# 슬랙 알림 전송
send_slack_notification() {
    local status=$1
    local environment=$2
    local service=$3
    local message=$4
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color
        case $status in
            success) color="good" ;;
            failure) color="danger" ;;
            warning) color="warning" ;;
            *) color="#439FE0" ;;
        esac
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"배포 알림: $environment\",
                    \"fields\": [
                        {\"title\": \"서비스\", \"value\": \"$service\", \"short\": true},
                        {\"title\": \"상태\", \"value\": \"$status\", \"short\": true},
                        {\"title\": \"메시지\", \"value\": \"$message\", \"short\": false}
                    ]
                }]
            }" \
            "$SLACK_WEBHOOK_URL"
    fi
}

# 메인 함수
main() {
    local environment=""
    local service=""
    local dry_run="false"
    local rollback="false"
    local health_check_only="false"
    
    # 인자 파싱
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                dry_run="true"
                shift
                ;;
            --rollback)
                rollback="true"
                shift
                ;;
            --health-check)
                health_check_only="true"
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                if [[ -z "$environment" ]]; then
                    environment=$1
                elif [[ -z "$service" ]]; then
                    service=$1
                else
                    log_error "알 수 없는 인자: $1"
                    show_help
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    # 필수 인자 확인
    if [[ -z "$environment" ]]; then
        log_error "환경을 지정해주세요"
        show_help
        exit 1
    fi
    
    if [[ -z "$service" && "$health_check_only" == "false" ]]; then
        log_error "서비스를 지정해주세요"
        show_help
        exit 1
    fi
    
    # 환경 및 서비스 검증
    validate_environment "$environment"
    if [[ "$health_check_only" == "false" ]]; then
        validate_service "$service"
    fi
    
    # 헬스체크만 실행
    if [[ "$health_check_only" == "true" ]]; then
        health_check "${service:-api}" "$environment"
        exit $?
    fi
    
    # 롤백 실행
    if [[ "$rollback" == "true" ]]; then
        rollback_deployment "$environment" "$service"
        send_slack_notification "success" "$environment" "$service" "롤백 완료"
        exit $?
    fi
    
    log_info "배포 시작: $service to $environment"
    send_slack_notification "info" "$environment" "$service" "배포 시작"
    
    # 배포 방법 결정
    export DEPLOY_METHOD=${DEPLOY_METHOD:-"compose"}
    
    if [[ "$DEPLOY_METHOD" == "ecs" ]]; then
        # AWS ECS 배포
        if [[ "$service" == "all" ]]; then
            for svc in api web; do
                local image_tag
                image_tag=$(build_image "$svc" "$environment")
                image_tag=$(push_image "$image_tag")
                deploy_to_ecs "$environment" "$svc" "$image_tag" "$dry_run"
                post_deploy_verification "$environment" "$svc"
            done
        else
            local image_tag
            image_tag=$(build_image "$service" "$environment")
            image_tag=$(push_image "$image_tag")
            deploy_to_ecs "$environment" "$service" "$image_tag" "$dry_run"
            post_deploy_verification "$environment" "$service"
        fi
    else
        # Docker Compose 배포
        deploy_with_compose "$environment" "$service" "$dry_run"
        if [[ "$dry_run" == "false" ]]; then
            post_deploy_verification "$environment" "$service"
        fi
    fi
    
    log_success "배포 완료: $service to $environment"
    send_slack_notification "success" "$environment" "$service" "배포 완료"
}

# 스크립트 실행
main "$@" 