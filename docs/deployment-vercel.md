# Vercel + Railway 배포 가이드

## 📋 개요

이 가이드는 배달 플랫폼을 Vercel (웹 앱)과 Railway (API 서버)로 배포하는 방법을 설명합니다.

### 🏗️ 배포 구조
- **웹 앱 (Next.js)**: Vercel
- **API 서버 (NestJS)**: Railway
- **모바일 앱 (Expo)**: Expo 서비스
- **데이터베이스**: Supabase (클라우드)
- **파일 스토리지**: AWS S3 또는 Cloudflare R2

---

## 🚀 1단계: Vercel 웹 앱 배포

### 1.1 Vercel 계정 설정
1. [Vercel](https://vercel.com)에 GitHub 계정으로 로그인
2. 프로젝트 Import 선택
3. GitHub 저장소 선택

### 1.2 프로젝트 설정
```bash
# 프로젝트 루트 설정
Root Directory: apps/web

# Build 설정
Build Command: yarn build
Output Directory: .next
Install Command: yarn install

# Node.js 버전
Node.js Version: 18.x
```

### 1.3 환경변수 설정
Vercel Dashboard > Settings > Environment Variables에서 다음 변수들을 설정:

#### 필수 환경변수
```bash
# Supabase 설정
SUPABASE_URL=https://mpshybxfesdqjcysrtwr.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

# NextAuth.js 설정
NEXTAUTH_SECRET=your-nextauth-secret-32-chars-minimum
NEXTAUTH_URL=https://your-app.vercel.app

# API 서버 URL (Railway 배포 후 업데이트)
API_URL=https://your-api.railway.app

# 환경 구분
NODE_ENV=production
```

#### 선택적 환경변수
```bash
# 외부 서비스
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
STRIPE_PUBLIC_KEY=pk_live_your-stripe-public-key
GOOGLE_CLIENT_ID=your-google-oauth-client-id
FCM_PROJECT_ID=your-firebase-project-id

# Vercel 최적화
NEXT_TELEMETRY_DISABLED=1
```

### 1.4 커스텀 도메인 설정 (선택사항)
1. Vercel Dashboard > Domains
2. 커스텀 도메인 추가
3. DNS 레코드 설정

---

## 🚂 2단계: Railway API 서버 배포

### 2.1 Railway 계정 설정
1. [Railway](https://railway.app)에 GitHub 계정으로 로그인
2. New Project 선택
3. Deploy from GitHub repo 선택

### 2.2 프로젝트 설정
```bash
# Start Command
cd apps/api && yarn start:prod

# Build Command  
cd apps/api && yarn build

# Health Check
/health
```

### 2.3 환경변수 설정
Railway Dashboard > Variables에서 다음 변수들을 설정:

#### 필수 환경변수
```bash
# 기본 설정
NODE_ENV=production
PORT=8080

# Supabase 설정
SUPABASE_URL=https://mpshybxfesdqjcysrtwr.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# JWT 설정
JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-32-chars

# CORS 설정 (Vercel 도메인)
CORS_ORIGINS=https://your-app.vercel.app
```

#### 필요한 외부 서비스 API 키
```bash
# 결제 서비스
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret

# SMS 서비스
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token

# 이메일 서비스
SENDGRID_API_KEY=SG.your-sendgrid-api-key

# 파일 스토리지
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-s3-bucket-name

# 푸시 알림
FCM_SERVER_KEY=your-fcm-server-key
```

### 2.4 도메인 설정
1. Railway에서 자동 생성된 도메인 확인
2. Vercel의 `API_URL` 환경변수 업데이트

---

## 📱 3단계: Expo 모바일 앱 배포

### 3.1 Expo 계정 설정
```bash
# Expo CLI 설치
npm install -g @expo/cli

# 로그인
expo login
```

### 3.2 앱 빌드 및 배포
```bash
# 모바일 앱 디렉토리로 이동
cd apps/mobile

# 프로덕션 빌드
expo build:android
expo build:ios

# 스토어 배포
expo upload:android
expo upload:ios
```

---

## 🔧 4단계: 도메인 및 DNS 설정

### 4.1 DNS 레코드 설정
```bash
# A 레코드 (Vercel)
your-domain.com -> 76.76.19.61 (Vercel IP)

# CNAME 레코드
api.your-domain.com -> your-app.railway.app
```

### 4.2 SSL 인증서
- Vercel: 자동 SSL 설정
- Railway: 자동 SSL 설정

---

## 📊 5단계: 모니터링 및 로깅 설정

### 5.1 Vercel Analytics 설정
```bash
# Vercel Dashboard에서 Analytics 활성화
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your-analytics-id
```

### 5.2 Railway 모니터링
- Railway Dashboard에서 메트릭 확인
- 로그 실시간 모니터링

### 5.3 외부 모니터링 (선택사항)
```bash
# Sentry 에러 추적
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# 로그 레벨 설정
LOG_LEVEL=info
```

---

## 🛠️ 개발 워크플로우

### 로컬 개발
```bash
# 전체 개발 서버 시작
yarn dev

# 개별 서비스 시작
yarn dev:web    # Next.js 웹 앱
yarn dev:api    # NestJS API 서버
yarn dev:mobile # Expo 모바일 앱
```

### 배포 워크플로우
```bash
# 1. 코드 푸시
git push origin main

# 2. 자동 배포 (Vercel/Railway)
# - Vercel: main 브랜치 푸시 시 자동 배포
# - Railway: main 브랜치 푸시 시 자동 배포

# 3. 수동 배포 (필요시)
yarn deploy:web  # Vercel 배포
yarn deploy:api  # Railway 배포
```

---

## 🔍 환경변수 관리

### 로컬 개발용
```bash
# 환경변수 파일 생성
cp env.example .env
cp env.vercel.example .env.local

# Vercel 환경변수 동기화
yarn vercel:pull
```

### 프로덕션 환경변수 검증
```bash
# 필수 환경변수 체크
yarn test:env
```

---

## 🚨 문제 해결

### 일반적인 문제들

#### 1. 빌드 실패
```bash
# 의존성 문제
yarn clean && yarn install

# 타입 체크 오류
yarn type-check

# 메모리 부족 (Vercel)
# vercel.json에서 memory 설정 증가
```

#### 2. API 연결 실패
```bash
# CORS 오류
# Railway에서 CORS_ORIGINS 환경변수 확인

# 환경변수 누락
# Vercel/Railway Dashboard에서 API_URL 확인
```

#### 3. 데이터베이스 연결 실패
```bash
# Supabase 키 확인
# SUPABASE_URL과 SUPABASE_ANON_KEY 검증
```

### 디버깅 도구
```bash
# Vercel 로그 확인
vercel logs

# Railway 로그 확인
railway logs

# 로컬 디버깅
yarn vercel:dev  # Vercel 로컬 환경
```

---

## 💰 비용 최적화

### Vercel
- **Hobby 플랜**: 무료 (개인 프로젝트)
- **Pro 플랜**: $20/월 (상업적 사용)

### Railway
- **Developer 플랜**: $5/월 (기본 사용)
- **Team 플랜**: $20/월 (확장 사용)

### 총 예상 비용
- **개발/테스트**: $0-10/월
- **소규모 운영**: $25-50/월
- **중간 규모**: $100-200/월

---

## 📈 확장성 고려사항

### 트래픽 증가 대응
1. **Vercel Edge Functions** 활용
2. **Railway 수직/수평 확장**
3. **CDN 설정** (Vercel 자동 제공)
4. **Database Connection Pooling**

### 모니터링 강화
1. **Uptime Robot** 활용
2. **Slack 알림** 연동
3. **성능 메트릭** 수집

---

*이 배포 가이드는 배달 플랫폼의 안정적인 운영을 위해 지속적으로 업데이트됩니다.* 