# 환경 설정 관리 가이드

배달 플랫폼의 환경별 설정 관리 방법을 설명합니다.

## 📋 목차

- [환경 구분](#환경-구분)
- [환경 파일 구조](#환경-파일-구조)
- [설정 방법](#설정-방법)
- [환경 변수 검증](#환경-변수-검증)
- [보안 고려사항](#보안-고려사항)
- [트러블슈팅](#트러블슈팅)

## 🌍 환경 구분

### Development (개발 환경)
- **목적**: 로컬 개발 및 테스트
- **특징**: 
  - 느슨한 보안 설정
  - 디버그 모드 활성화
  - 모킹 서비스 사용 가능
  - 로컬 데이터베이스 사용

### Staging (스테이징 환경)
- **목적**: 프로덕션 배포 전 최종 테스트
- **특징**:
  - 프로덕션과 유사한 설정
  - 테스트 API 키 사용
  - 별도의 데이터베이스
  - 제한된 외부 서비스 연동

### Production (프로덕션 환경)
- **목적**: 실제 서비스 운영
- **특징**:
  - 강화된 보안 설정
  - 실제 API 키 사용
  - 프로덕션 데이터베이스
  - 모든 외부 서비스 연동

## 📁 환경 파일 구조

```
프로젝트 루트/
├── .env                     # 기본 환경 변수 (공통)
├── .env.development         # 개발 환경 전용
├── .env.staging            # 스테이징 환경 전용
├── .env.production         # 프로덕션 환경 전용
├── .env.local              # 로컬 오버라이드 (git 제외)
├── env.example             # 전체 환경 변수 예제
├── env.development.example # 개발 환경 예제
├── env.staging.example     # 스테이징 환경 예제
└── env.production.example  # 프로덕션 환경 예제
```

### 로드 우선순위
1. `.env` (기본값)
2. `.env.{환경}` (환경별 설정)
3. `.env.local` (로컬 오버라이드, 최고 우선순위)

## ⚙️ 설정 방법

### 1. 초기 설정

```bash
# 1. 기본 환경 파일 복사
cp env.example .env

# 2. 환경별 파일 복사
cp env.development.example .env.development
cp env.staging.example .env.staging
cp env.production.example .env.production

# 3. 실제 값으로 수정
nano .env.development  # 개발 환경 설정
```

### 2. 환경별 실행

```bash
# 개발 환경
NODE_ENV=development npm run start:dev

# 스테이징 환경
NODE_ENV=staging npm run start:staging

# 프로덕션 환경
NODE_ENV=production npm run start:prod
```

### 3. 환경 설정 검증

```bash
# 환경 설정 로드 및 검증
node scripts/load-env.js development
node scripts/load-env.js staging
node scripts/load-env.js production
```

## 🔍 환경 변수 검증

### 필수 환경 변수

#### 모든 환경 공통
- `NODE_ENV`: 환경 구분
- `API_PORT`: API 서버 포트
- `DATABASE_URL`: 데이터베이스 연결 URL
- `JWT_SECRET`: JWT 토큰 비밀키
- `JWT_REFRESH_SECRET`: JWT 리프레시 토큰 비밀키

#### 스테이징/프로덕션 추가 필수
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_ANON_KEY`: Supabase 익명 키
- `REDIS_URL`: Redis 연결 URL

#### 프로덕션 전용 추가 필수
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase 서비스 역할 키
- `REDIS_PASSWORD`: Redis 비밀번호
- `NEXTAUTH_SECRET`: NextAuth.js 비밀키
- `ENCRYPTION_KEY`: 암호화 키
- `SENTRY_DSN`: Sentry 오류 추적 DSN

### 검증 방법

```typescript
// EnvConfigUtil 사용 예제
import { EnvConfigUtil } from './src/common/utils/env-config.util';

const envConfig = EnvConfigUtil.getInstance();

// 환경 설정 로드
envConfig.loadEnvironmentConfig();

// 환경 정보 출력
envConfig.logEnvironmentInfo();

// 보안 설정 검증 (프로덕션만)
envConfig.validateSecuritySettings();
```

## 🔒 보안 고려사항

### 1. 민감한 정보 관리

**절대 Git에 커밋하지 말 것:**
- 실제 API 키
- 데이터베이스 비밀번호
- JWT 비밀키
- 암호화 키

**`.gitignore`에 포함된 파일:**
```
.env
.env.local
.env.development
.env.staging
.env.production
```

### 2. 프로덕션 보안 체크리스트

- [ ] 모든 기본값이 실제 값으로 변경됨
- [ ] JWT 비밀키가 32자 이상의 강력한 값
- [ ] 데이터베이스 비밀번호가 복잡함
- [ ] API 키가 실제 프로덕션 키
- [ ] CORS 설정이 프로덕션 도메인만 허용
- [ ] 디버그 모드가 비활성화됨
- [ ] 레이트 리미팅이 적절히 설정됨

### 3. 환경별 보안 수준

| 설정 | 개발 | 스테이징 | 프로덕션 |
|------|------|----------|----------|
| JWT 만료시간 | 24시간 | 15분 | 15분 |
| 디버그 모드 | 활성화 | 비활성화 | 비활성화 |
| 레이트 리미팅 | 느슨함 | 보통 | 엄격함 |
| CORS | 모든 도메인 | 스테이징 도메인 | 프로덕션 도메인만 |
| 로그 레벨 | debug | info | warn |

## 🛠️ 트러블슈팅

### 자주 발생하는 문제

#### 1. 환경 변수가 로드되지 않음

**증상:**
```
❌ 필수 환경 변수가 누락되었습니다: DATABASE_URL, JWT_SECRET
```

**해결방법:**
```bash
# 1. 환경 파일 존재 확인
ls -la .env*

# 2. 환경 파일 내용 확인
cat .env.development

# 3. 환경 설정 스크립트 실행
node scripts/load-env.js development
```

#### 2. 프로덕션에서 보안 경고

**증상:**
```
❌ 프로덕션 환경에서 안전하지 않은 기본값이 감지되었습니다: JWT_SECRET
```

**해결방법:**
```bash
# 1. 프로덕션 환경 파일 확인
cat .env.production

# 2. 기본값을 실제 값으로 변경
# JWT_SECRET=CHANGE_THIS_SUPER_SECURE_JWT_SECRET_32_CHARS_MIN
# → JWT_SECRET=your-actual-super-secure-jwt-secret-key
```

#### 3. 데이터베이스 연결 실패

**증상:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**해결방법:**
```bash
# 1. 데이터베이스 URL 확인
echo $DATABASE_URL

# 2. 데이터베이스 서비스 상태 확인
docker-compose ps  # Docker 사용 시
pg_isready -h localhost -p 5432  # PostgreSQL 직접 설치 시

# 3. 환경별 데이터베이스 URL 확인
# 개발: postgresql://postgres:devpassword@localhost:5433/delivery_platform_dev
# 스테이징: postgresql://staging_user:staging_password@staging-db.example.com:5432/delivery_platform_staging
# 프로덕션: postgresql://prod_user:CHANGE_THIS_PASSWORD@prod-db.example.com:5432/delivery_platform_prod
```

### 환경 설정 디버깅

```bash
# 1. 환경 변수 전체 출력 (민감한 정보 제외)
node -e "
const { EnvConfigUtil } = require('./apps/api/src/common/utils/env-config.util');
const config = EnvConfigUtil.getInstance();
config.loadEnvironmentConfig();
console.log(JSON.stringify(config.exportSafeConfig(), null, 2));
"

# 2. 특정 환경 변수 확인
echo "NODE_ENV: $NODE_ENV"
echo "API_PORT: $API_PORT"
echo "DATABASE_URL: ${DATABASE_URL:0:30}..."  # 일부만 출력

# 3. 환경 설정 로드 테스트
node scripts/load-env.js development --verbose
```

## 📚 추가 리소스

- [dotenv 문서](https://github.com/motdotla/dotenv)
- [NestJS Configuration 문서](https://docs.nestjs.com/techniques/configuration)
- [환경 변수 보안 가이드](https://12factor.net/config)

## 🤝 기여하기

환경 설정 관련 개선사항이나 문제점을 발견하시면:

1. 이슈 등록
2. 풀 리퀘스트 제출
3. 문서 업데이트 제안

---

**⚠️ 주의사항**: 실제 환경 변수 값을 문서나 코드에 포함하지 마세요. 항상 예제 값이나 플레이스홀더를 사용하세요. 