# 기술 맥락 및 개발 환경

## 핵심 기술 스택

### 프론트엔드

```typescript
// 웹 애플리케이션
Framework: Next.js 14+ (App Router)
Language: TypeScript 5+
Styling: Tailwind CSS + shadcn/ui
State Management: Zustand + React Query (TanStack Query)
Forms: React Hook Form + Zod
Maps: React Leaflet (또는 Google Maps API)

// 모바일 애플리케이션
Framework: Expo 49+ (React Native)
Language: TypeScript 5+
Styling: NativeWind (Tailwind for React Native)
Navigation: Expo Router (React Navigation 6)
State Management: Zustand + React Query
Maps: react-native-maps
```

### 백엔드

```typescript
Framework: Nest.js 10+
Language: TypeScript 5+
Database ORM: Prisma (또는 TypeORM)
Validation: class-validator + class-transformer
Authentication: Passport.js + JWT
WebSocket: @nestjs/websockets + Socket.io
Queue: BullMQ + Redis
Cache: Redis
Documentation: @nestjs/swagger (OpenAPI)
```

### 데이터베이스 및 서비스

```sql
Primary DB: PostgreSQL 15+
Cache/Queue: Redis 7+
BaaS: Supabase (Auth, Realtime, Storage)
Search: PostgreSQL Full-text Search (초기), Elasticsearch (확장시)
File Storage: Supabase Storage (또는 AWS S3)
```

## 개발 도구 및 환경

### 패키지 관리 및 모노레포

```json
{
  "packageManager": "yarn",
  "workspaces": ["apps/*", "packages/*"],
  "devDependencies": {
    "@nx/workspace": "^17.0.0",
    "turbo": "^1.10.0",
    "lerna": "^7.0.0"
  }
}
```

### 코드 품질 도구

```javascript
// ESLint + Prettier
'@typescript-eslint/eslint-plugin';
'@typescript-eslint/parser';
'eslint-config-next';
'eslint-config-prettier';
'prettier';

// 커밋 관리
'husky'; // Git hooks
'lint-staged'; // Pre-commit linting
'commitizen'; // 표준화된 커밋 메시지
```

### 테스트 프레임워크

```typescript
// 단위/통합 테스트
Jest: '^29.0.0';
('@testing-library/react');
('@testing-library/react-native');

// E2E 테스트
Playwright: '^1.40.0'; // 웹
Detox: '^20.0.0'; // 모바일

// API 테스트
Supertest: '^6.0.0';
```

## 개발 환경 설정

### 로컬 개발 환경

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: delivery_dev
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    command: redis-server --appendonly yes

  adminer:
    image: adminer
    ports:
      - '8080:8080'
```

### 환경 변수 관리

```typescript
// .env.example
# Database
DATABASE_URL="postgresql://admin:password@localhost:5432/delivery_dev"
REDIS_URL="redis://localhost:6379"

# Supabase
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""

# JWT
JWT_SECRET=""
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_SECRET=""
REFRESH_TOKEN_EXPIRES_IN="7d"

# Payment (국내 PG사)
TOSS_PAYMENTS_CLIENT_KEY=""
TOSS_PAYMENTS_SECRET_KEY=""

# Maps
GOOGLE_MAPS_API_KEY=""
NAVER_MAPS_CLIENT_ID=""

# Notifications
FCM_SERVER_KEY=""
EXPO_ACCESS_TOKEN=""

# External APIs
WEATHER_API_KEY=""
SMS_API_KEY=""
```

## 주요 라이브러리 및 패키지

### 공통 유틸리티

```typescript
// 날짜/시간
"date-fns": "^2.30.0"
"dayjs": "^1.11.0"

// 유틸리티
"lodash": "^4.17.21"
"uuid": "^9.0.0"
"bcryptjs": "^2.4.3"

// 검증
"zod": "^3.22.0"
"yup": "^1.3.0"

// 네트워킹
"axios": "^1.5.0"
"socket.io-client": "^4.7.0"
```

### 웹 전용 라이브러리

```typescript
// UI 컴포넌트
"@radix-ui/react-*": "^1.0.0"
"lucide-react": "^0.290.0"
"react-hot-toast": "^2.4.0"

// 차트/데이터 시각화
"recharts": "^2.8.0"
"react-chartjs-2": "^5.2.0"

// 지도
"leaflet": "^1.9.0"
"react-leaflet": "^4.2.0"
```

### 모바일 전용 라이브러리

```typescript
// UI/UX
"react-native-paper": "^5.11.0"
"react-native-vector-icons": "^10.0.0"
"react-native-gesture-handler": "^2.13.0"

// 지도/위치
"react-native-maps": "^1.8.0"
"expo-location": "^16.0.0"

// 카메라/미디어
"expo-camera": "^13.0.0"
"expo-image-picker": "^14.0.0"

// 알림
"expo-notifications": "^0.23.0"
```

### 백엔드 전용 라이브러리

```typescript
// 인증/보안
"@nestjs/passport": "^10.0.0"
"passport-jwt": "^4.0.0"
"helmet": "^7.0.0"
"express-rate-limit": "^7.0.0"

// 파일 처리
"multer": "^1.4.5"
"sharp": "^0.32.0"

// 외부 API
"@nestjs/axios": "^3.0.0"
"node-cron": "^3.0.0"

// 모니터링
"@nestjs/terminus": "^10.0.0"
"@sentry/node": "^7.0.0"
```

## 배포 및 인프라

### 배포 옵션

```yaml
# Option 1: Vercel + Supabase
Web: Vercel (자동 배포)
API: Vercel Functions (또는 Railway)
DB: Supabase PostgreSQL
Storage: Supabase Storage

# Option 2: AWS 기반
Web: AWS Amplify (또는 S3 + CloudFront)
API: AWS ECS (또는 EC2)
DB: AWS RDS PostgreSQL
Storage: AWS S3
Cache: AWS ElastiCache (Redis)

# Option 3: 자체 서버
Web: Nginx + PM2
API: Docker + Nginx
DB: Self-hosted PostgreSQL
Storage: MinIO (S3 호환)
```

### CI/CD 파이프라인

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: yarn install --frozen-lockfile
      - run: yarn test
      - run: yarn build

  deploy-web:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}

  deploy-api:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t delivery-api .
      - run: docker push ${{ secrets.DOCKER_REGISTRY }}/delivery-api
```

## 성능 및 모니터링

### 모니터링 도구

```typescript
// 에러 추적
"@sentry/react": "^7.0.0"
"@sentry/react-native": "^5.0.0"
"@sentry/node": "^7.0.0"

// 분석
"@vercel/analytics": "^1.0.0"
"react-ga4": "^2.1.0"

// 성능 모니터링
"web-vitals": "^3.5.0"
"@react-native-performance/flipper-plugin": "^0.1.0"
```

### 로깅 설정

```typescript
// Winston 로거 설정
import { createLogger, format, transports } from 'winston';

export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
  transports: [
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  ],
});
```

## 보안 고려사항

### 보안 라이브러리

```typescript
// API 보안
"helmet": "^7.0.0"           // 보안 헤더
"express-rate-limit": "^7.0.0" // Rate limiting
"express-validator": "^7.0.0"   // 입력 검증
"cors": "^2.8.5"             // CORS 설정

// 데이터 보안
"bcryptjs": "^2.4.3"         // 비밀번호 해싱
"crypto": "node built-in"     // 암호화
"jsonwebtoken": "^9.0.0"     // JWT 토큰
```

### 환경별 보안 설정

```typescript
// Production 환경 보안 체크리스트
- HTTPS 강제 사용
- 환경 변수 암호화
- API Rate Limiting
- CORS 정책 설정
- SQL Injection 방어
- XSS 방어
- CSRF 토큰 사용
- 민감 정보 로깅 방지
```

## 개발 워크플로우

### Git 전략

```bash
# 브랜치 전략 (Git Flow)
main        # 프로덕션 배포
develop     # 개발 통합
feature/*   # 기능 개발
release/*   # 릴리스 준비
hotfix/*    # 긴급 수정
```

### 코드 리뷰 프로세스

1. Feature 브랜치에서 개발
2. PR 생성 (템플릿 사용)
3. 자동 테스트 통과 확인
4. 코드 리뷰 (최소 1명)
5. Develop 브랜치로 머지
6. 자동 배포 (스테이징 환경)

### 릴리스 프로세스

1. Release 브랜치 생성
2. 버전 번호 업데이트
3. 최종 테스트 및 QA
4. Main 브랜치로 머지
5. 태그 생성 및 프로덕션 배포
6. Develop 브랜치로 백머지
