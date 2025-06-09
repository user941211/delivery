#!/bin/bash

# 배달 플랫폼 환경변수 설정 스크립트
# Usage: ./scripts/setup-env.sh [dev|vercel|railway]

set -e

# 색상 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 헬퍼 함수들
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  배달 플랫폼 환경변수 설정${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 사용법 출력
show_usage() {
    echo "사용법: $0 [dev|vercel|railway]"
    echo ""
    echo "옵션:"
    echo "  dev      로컬 개발 환경 설정"
    echo "  vercel   Vercel 배포를 위한 환경변수 가이드"
    echo "  railway  Railway 배포를 위한 환경변수 가이드"
    echo ""
    echo "예시:"
    echo "  $0 dev      # .env 파일 생성"
    echo "  $0 vercel   # Vercel 환경변수 설정 가이드"
    echo "  $0 railway  # Railway 환경변수 설정 가이드"
}

# 개발 환경 설정
setup_dev_env() {
    print_info "로컬 개발 환경을 설정합니다..."
    
    # .env 파일이 이미 존재하는지 확인
    if [ -f ".env" ]; then
        print_warning ".env 파일이 이미 존재합니다."
        read -p "덮어쓰시겠습니까? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "설정을 취소했습니다."
            exit 0
        fi
    fi
    
    # env.example에서 .env로 복사
    if [ -f "env.example" ]; then
        cp env.example .env
        print_success ".env 파일이 생성되었습니다."
    else
        print_error "env.example 파일을 찾을 수 없습니다."
        exit 1
    fi
    
    print_info "다음 단계:"
    echo "1. .env 파일을 열어서 필요한 API 키들을 설정하세요"
    echo "2. 특히 다음 항목들은 개발에 필요합니다:"
    echo "   - GOOGLE_MAPS_API_KEY (지도 기능)"
    echo "   - STRIPE_SECRET_KEY (결제 테스트)"
    echo "   - JWT_SECRET (보안을 위해 변경 권장)"
    echo ""
    echo "3. 설정 후 다음 명령어로 테스트:"
    echo "   yarn test:env"
}

# Vercel 배포 가이드
setup_vercel_env() {
    print_info "Vercel 배포를 위한 환경변수 설정 가이드"
    echo ""
    echo "📋 Vercel Dashboard에서 다음 환경변수들을 설정하세요:"
    echo ""
    echo "🔑 필수 환경변수:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "SUPABASE_URL=https://mpshybxfesdqjcysrtwr.supabase.co"
    echo "SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    echo "NEXTAUTH_SECRET=your-nextauth-secret-32-chars-minimum"
    echo "NEXTAUTH_URL=https://your-app.vercel.app"
    echo "API_URL=https://your-api.railway.app"
    echo "NODE_ENV=production"
    echo ""
    echo "🔧 선택적 환경변수:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "GOOGLE_MAPS_API_KEY=your-google-maps-key"
    echo "STRIPE_PUBLIC_KEY=pk_live_your-stripe-public-key"
    echo "GOOGLE_CLIENT_ID=your-google-oauth-client-id"
    echo "FCM_PROJECT_ID=your-firebase-project-id"
    echo "NEXT_TELEMETRY_DISABLED=1"
    echo ""
    echo "📖 설정 방법:"
    echo "1. Vercel Dashboard → 프로젝트 선택"
    echo "2. Settings → Environment Variables"
    echo "3. 위 변수들을 하나씩 추가"
    echo "4. Production, Preview, Development 환경 선택"
    echo ""
    echo "💡 팁:"
    echo "- API_URL은 Railway 배포 후에 업데이트하세요"
    echo "- NEXTAUTH_SECRET은 32자 이상의 랜덤 문자열 사용"
    echo "- 실제 도메인으로 NEXTAUTH_URL 업데이트 필요"
}

# Railway 배포 가이드  
setup_railway_env() {
    print_info "Railway 배포를 위한 환경변수 설정 가이드"
    echo ""
    echo "📋 Railway Dashboard에서 다음 환경변수들을 설정하세요:"
    echo ""
    echo "🔑 필수 환경변수:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "NODE_ENV=production"
    echo "PORT=8080"
    echo "SUPABASE_URL=https://mpshybxfesdqjcysrtwr.supabase.co"
    echo "SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    echo "SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key"
    echo "JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars"
    echo "JWT_REFRESH_SECRET=your-super-secret-refresh-key-32-chars"
    echo "CORS_ORIGINS=https://your-app.vercel.app"
    echo ""
    echo "💳 결제 서비스:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key"
    echo "STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret"
    echo ""
    echo "📱 알림 서비스:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "TWILIO_ACCOUNT_SID=your-twilio-account-sid"
    echo "TWILIO_AUTH_TOKEN=your-twilio-auth-token"
    echo "SENDGRID_API_KEY=SG.your-sendgrid-api-key"
    echo "FCM_SERVER_KEY=your-fcm-server-key"
    echo ""
    echo "💾 파일 스토리지:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "AWS_ACCESS_KEY_ID=your-aws-access-key"
    echo "AWS_SECRET_ACCESS_KEY=your-aws-secret-key"
    echo "AWS_S3_BUCKET=your-s3-bucket-name"
    echo ""
    echo "📖 설정 방법:"
    echo "1. Railway Dashboard → 프로젝트 선택"
    echo "2. Variables 탭"
    echo "3. 위 변수들을 하나씩 추가"
    echo ""
    echo "💡 팁:"
    echo "- PORT는 Railway가 자동으로 설정하므로 8080으로 고정"
    echo "- CORS_ORIGINS에 Vercel 도메인 설정 필요"
    echo "- JWT_SECRET들은 각각 다른 32자 이상 문자열 사용"
}

# GitHub Secrets 가이드
show_github_secrets() {
    print_info "GitHub Actions를 위한 Secrets 설정"
    echo ""
    echo "📋 GitHub Repository → Settings → Secrets and variables → Actions"
    echo ""
    echo "🔑 필요한 Secrets:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "VERCEL_TOKEN=your-vercel-token"
    echo "VERCEL_PROJECT_NAME=your-vercel-project-name"
    echo "RAILWAY_TOKEN=your-railway-token"
    echo "RAILWAY_SERVICE_NAME=your-railway-service-name"
    echo "RAILWAY_PROJECT_NAME=your-railway-project-name"
    echo "SUPABASE_URL=https://mpshybxfesdqjcysrtwr.supabase.co"
    echo "SUPABASE_ANON_KEY=your-supabase-anon-key"
    echo "NEXTAUTH_SECRET=your-nextauth-secret"
    echo "NEXTAUTH_URL=https://your-app.vercel.app"
    echo "SLACK_WEBHOOK_URL=your-slack-webhook-url (선택사항)"
    echo ""
    echo "🔧 토큰 발급 방법:"
    echo "- Vercel: vercel.com → Settings → Tokens"
    echo "- Railway: railway.app → Account → Tokens"
}

# API 키 확인
check_api_keys() {
    print_info "현재 설정된 API 키들을 확인합니다..."
    
    if [ ! -f ".env" ]; then
        print_error ".env 파일이 없습니다. 먼저 'dev' 옵션으로 설정하세요."
        exit 1
    fi
    
    # .env 파일 로드
    source .env
    
    echo ""
    echo "📊 API 키 상태:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Supabase
    if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_ANON_KEY" ]; then
        print_success "Supabase: 설정됨"
    else
        print_error "Supabase: 설정 필요"
    fi
    
    # Google Maps
    if [ -n "$GOOGLE_MAPS_API_KEY" ] && [ "$GOOGLE_MAPS_API_KEY" != "your-google-maps-api-key" ]; then
        print_success "Google Maps: 설정됨"
    else
        print_warning "Google Maps: 설정 필요 (지도 기능)"
    fi
    
    # Stripe
    if [ -n "$STRIPE_SECRET_KEY" ] && [ "$STRIPE_SECRET_KEY" != "sk_test_your-stripe-secret-key" ]; then
        print_success "Stripe: 설정됨"
    else
        print_warning "Stripe: 설정 필요 (결제 기능)"
    fi
    
    # JWT
    if [ -n "$JWT_SECRET" ] && [ "$JWT_SECRET" != "your-super-secret-jwt-key-change-this-in-production" ]; then
        print_success "JWT Secret: 설정됨"
    else
        print_warning "JWT Secret: 변경 권장 (보안)"
    fi
    
    echo ""
}

# 메인 함수
main() {
    print_header
    
    case "${1:-help}" in
        "dev")
            setup_dev_env
            echo ""
            check_api_keys
            ;;
        "vercel")
            setup_vercel_env
            ;;
        "railway")
            setup_railway_env
            ;;
        "github")
            show_github_secrets
            ;;
        "check")
            check_api_keys
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

# 스크립트 실행
main "$@" 