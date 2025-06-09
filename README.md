# 🚀 배달 플랫폼

고객, 배달 기사, 점주를 연결하는 종합적인 배달 플랫폼입니다.

## 📋 프로젝트 개요

이 프로젝트는 실시간 주문 관리, 배달 추적, 결제 처리를 포함한 완전한 배달 서비스 생태계를
제공합니다.

### 🏗️ 시스템 구조

- **웹 앱** (Next.js): 고객 및 점주용 웹 인터페이스
- **모바일 앱** (Expo): 고객 및 배달기사용 네이티브 앱
- **API 서버** (NestJS): 백엔드 REST API 및 WebSocket
- **데이터베이스** (Supabase): PostgreSQL + 실시간 기능
- **파일 스토리지** (AWS S3/Cloudflare R2): 이미지 및 정적 파일

## 🛠️ 기술 스택

### Frontend

- **웹**: Next.js 14, TypeScript, Tailwind CSS, Radix UI
- **모바일**: Expo, React Native, TypeScript

### Backend

- **API**: NestJS, TypeScript, Socket.io, Swagger
- **데이터베이스**: Supabase (PostgreSQL), Prisma ORM
- **인증**: JWT, NextAuth.js, Supabase Auth

### 배포 & 인프라

- **웹 배포**: Vercel
- **API 배포**: Railway
- **모바일 배포**: Expo Application Services (EAS)
- **CI/CD**: GitHub Actions

### 외부 서비스

- **지도**: Google Maps API
- **결제**: Stripe, 토스페이먼츠
- **알림**: Firebase Cloud Messaging
- **SMS**: Twilio
- **이메일**: SendGrid

## 🚀 빠른 시작

### 필수 요구사항

- Node.js 18.0.0 이상
- Yarn 4.0.0 이상
- Git

### 1. 프로젝트 클론

```bash
git clone https://github.com/your-org/delivery-platform.git
cd delivery-platform
```

### 2. 의존성 설치

```bash
# Yarn 활성화
corepack enable

# 의존성 설치
yarn install
```

### 3. 환경변수 설정

```bash
# 환경변수 파일 복사
cp env.example .env

# 필수 환경변수 설정
# Supabase URL과 키는 이미 설정되어 있습니다
```

### 4. 개발 서버 시작

```bash
# 모든 서비스 동시 시작
yarn dev

# 또는 개별 서비스 시작
yarn dev:web     # 웹 앱 (포트 3000)
yarn dev:api     # API 서버 (포트 3001)
yarn dev:mobile  # 모바일 앱 (Expo)
```

### 5. 접속 확인

- **웹 앱**: http://localhost:3000
- **API 서버**: http://localhost:3001
- **API 문서**: http://localhost:3001/api
- **모바일 앱**: Expo Go 앱으로 QR 코드 스캔

## 📱 사용법

### 고객 (웹/모바일)

1. 회원가입 및 로그인
2. 음식점 검색 및 메뉴 선택
3. 장바구니에 추가 후 주문
4. 실시간 배달 추적
5. 리뷰 작성

### 점주 (웹)

1. 레스토랑 등록 및 승인 대기
2. 메뉴 관리 (추가, 수정, 삭제)
3. 주문 접수 및 처리
4. 매출 통계 확인

### 배달기사 (모바일)

1. 배달기사 등록 및 승인
2. 배달 가능 지역 설정
3. 주문 배정 받기
4. 실시간 위치 업데이트
5. 배달 완료 처리

### 관리자 (웹)

1. 전체 플랫폼 통계 확인
2. 사용자 및 레스토랑 관리
3. 주문 모니터링
4. 리뷰 관리
5. 시스템 활동 로그 확인

## 🚀 배포

### Vercel (웹 앱) + Railway (API) 배포

상세한 배포 가이드는 [배포 문서](docs/deployment-vercel.md)를 참조하세요.

#### 간단 배포 명령어

```bash
# Vercel CLI 설치
yarn global add vercel

# Railway CLI 설치
yarn global add @railway/cli

# 웹 앱 배포
yarn deploy:web

# API 서버 배포
yarn deploy:api

# 전체 배포
yarn deploy
```

#### 필수 환경변수 설정

**Vercel (웹 앱)**:

```bash
SUPABASE_URL=https://mpshybxfesdqjcysrtwr.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-app.vercel.app
API_URL=https://your-api.railway.app
```

**Railway (API 서버)**:

```bash
NODE_ENV=production
SUPABASE_URL=https://mpshybxfesdqjcysrtwr.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
CORS_ORIGINS=https://your-app.vercel.app
```

## 🧪 테스트

```bash
# 모든 테스트 실행
yarn test

# 특정 앱 테스트
yarn test:api
yarn test:web

# 테스트 커버리지
yarn test:cov

# E2E 테스트
yarn test:e2e
```

## 📦 빌드

```bash
# 모든 앱 빌드
yarn build

# 특정 앱 빌드
yarn build:web
yarn build:api
yarn build:mobile
```

## 🔧 개발 도구

### 코드 품질

```bash
# 린트 검사
yarn lint

# 린트 자동 수정
yarn lint:fix

# 타입 검사
yarn type-check

# 코드 포맷팅
yarn format
```

### 데이터베이스

```bash
# Supabase 연결 테스트
yarn supabase:test

# 데이터베이스 스키마 적용
yarn schema:apply

# 테스트 데이터 생성
yarn db:seed
```

## 📁 프로젝트 구조

```
delivery-platform/
├── apps/
│   ├── api/           # NestJS API 서버
│   ├── web/           # Next.js 웹 앱
│   └── mobile/        # Expo 모바일 앱
├── packages/
│   ├── database/      # Supabase 스키마 및 타입
│   ├── shared/        # 공통 유틸리티
│   └── ui/           # 공통 UI 컴포넌트
├── docs/             # 문서
├── scripts/          # 빌드 및 배포 스크립트
└── tools/           # 개발 도구
```

## 📄 API 문서

- **개발 환경**: http://localhost:3001/api
- **프로덕션**: https://your-api.railway.app/api

주요 API 엔드포인트:

- `/auth` - 인증 관련
- `/users` - 사용자 관리
- `/restaurants` - 레스토랑 관리
- `/orders` - 주문 관리
- `/reviews` - 리뷰 시스템
- `/admin` - 관리자 기능
- `/monitoring` - 시스템 모니터링

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 개발 가이드라인

- TypeScript 사용 필수
- ESLint + Prettier 설정 준수
- 테스트 코드 작성
- 커밋 메시지 컨벤션 준수

## 📞 지원

문제가 발생하거나 질문이 있으시면:

1. [GitHub Issues](https://github.com/your-org/delivery-platform/issues) 생성
2. [문서](docs/) 확인
3. [FAQ](docs/faq.md) 참조

## 📜 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙏 감사의 말

이 프로젝트는 다음 오픈소스 프로젝트들을 기반으로 합니다:

- [Next.js](https://nextjs.org/)
- [NestJS](https://nestjs.com/)
- [Expo](https://expo.dev/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**배달 플랫폼 개발팀**
