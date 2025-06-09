# 관리자 대시보드 가이드

## 📋 개요

배달 플랫폼의 관리자 대시보드는 플랫폼 전체를 효율적으로 관리하고 모니터링할 수 있는 종합적인 관리 도구입니다.

### 🔧 주요 기능
- **통계 대시보드**: 사용자, 주문, 매출 등 핵심 지표 모니터링
- **사용자 관리**: 고객, 점주, 배달기사 계정 관리 및 상태 제어
- **레스토랑 관리**: 신규 레스토랑 승인 및 기존 레스토랑 관리
- **주문 모니터링**: 전체 주문 현황 및 이슈 관리
- **리뷰 관리**: 부적절한 리뷰 모니터링 및 관리
- **매출 분석**: 월별 매출 현황 및 수수료 추적
- **시스템 활동**: 플랫폼 활동 로그 및 이벤트 추적

---

## 🏗️ 시스템 구조

### 핵심 컴포넌트

#### 1. **AdminService**
- 플랫폼 전체 통계 수집 및 분석
- 사용자, 레스토랑, 주문, 리뷰 관리 로직
- 매출 분석 및 차트 데이터 생성

#### 2. **AdminController**
- 관리자 전용 REST API 엔드포인트 제공
- 권한 검증 및 요청 유효성 검사
- 응답 데이터 포맷팅

### 권한 및 보안
- **JWT 인증**: 관리자 계정 인증 필수
- **역할 기반 접근 제어**: `admin` 역할만 접근 가능
- **API 키 보호**: 모든 엔드포인트에 Bearer 토큰 필요

---

## 🌐 API 엔드포인트

모든 관리자 API는 `/admin` 경로 하위에 위치하며, 관리자 권한이 필요합니다.

### 📊 대시보드 통계

#### `GET /admin/dashboard`
**전체 플랫폼 개요 통계**

```json
{
  "timestamp": "2024-12-01T10:30:00Z",
  "users": {
    "total": 1250,
    "active": 1180,
    "inactive": 70,
    "today": 15,
    "thisWeek": 85,
    "thisMonth": 320,
    "byRole": {
      "customers": 1050,
      "drivers": 85,
      "restaurant_owners": 115,
      "admins": 2
    }
  },
  "restaurants": {
    "total": 115,
    "verified": 98,
    "pending": 17,
    "active": 85,
    "inactive": 30,
    "thisMonth": 12,
    "averageRating": 4.2
  },
  "orders": {
    "total": 3420,
    "today": 45,
    "thisWeek": 280,
    "thisMonth": 950,
    "byStatus": {
      "pending": 12,
      "confirmed": 8,
      "preparing": 15,
      "ready": 6,
      "picked_up": 18,
      "delivered": 3361,
      "cancelled": 85
    },
    "averageOrderValue": 28500
  },
  "revenue": {
    "total": 98500000,
    "today": 1280000,
    "thisWeek": 8950000,
    "thisMonth": 27300000,
    "commission": {
      "total": 2855000,
      "today": 38400,
      "thisWeek": 268500,
      "thisMonth": 819000
    }
  },
  "summary": {
    "totalUsers": 1250,
    "activeRestaurants": 85,
    "todayOrders": 45,
    "monthlyRevenue": 27300000
  }
}
```

---

## 👥 사용자 관리

### 사용자 목록 조회

#### `GET /admin/users?page=1&limit=20&role=customer&status=active`

**쿼리 파라미터:**
- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 20, 최대: 100)
- `role`: 역할 필터 (`customer`, `driver`, `restaurant_owner`, `admin`)
- `status`: 상태 필터 (`active`, `inactive`)

**응답:**
```json
{
  "users": [
    {
      "id": "user_123",
      "email": "customer@example.com",
      "full_name": "김고객",
      "phone": "010-1234-5678",
      "role": "customer",
      "is_active": true,
      "created_at": "2024-11-15T09:30:00Z",
      "last_login": "2024-12-01T08:15:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1250,
    "totalPages": 63
  }
}
```

### 사용자 상태 변경

#### `PUT /admin/users/:id/status`

**요청 본문:**
```json
{
  "is_active": false
}
```

**응답:**
```json
{
  "id": "user_123",
  "email": "customer@example.com",
  "full_name": "김고객",
  "is_active": false,
  "updated_at": "2024-12-01T10:30:00Z"
}
```

---

## 🏪 레스토랑 관리

### 레스토랑 목록 조회

#### `GET /admin/restaurants?page=1&limit=20&status=pending`

**쿼리 파라미터:**
- `page`: 페이지 번호
- `limit`: 페이지당 항목 수
- `status`: 상태 필터 (`verified`, `pending`, `active`, `inactive`)

**응답:**
```json
{
  "restaurants": [
    {
      "id": "restaurant_123",
      "name": "맛있는 치킨집",
      "address": "서울시 강남구 테헤란로 123",
      "phone": "02-1234-5678",
      "category": "chicken",
      "is_verified": false,
      "is_open": true,
      "rating": 4.2,
      "created_at": "2024-11-20T14:30:00Z",
      "owner": {
        "id": "user_456",
        "full_name": "이점주",
        "email": "owner@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 17,
    "totalPages": 1
  }
}
```

### 레스토랑 승인/거부

#### `PUT /admin/restaurants/:id/verification`

**요청 본문:**
```json
{
  "is_verified": true
}
```

**응답:**
```json
{
  "id": "restaurant_123",
  "name": "맛있는 치킨집",
  "is_verified": true,
  "updated_at": "2024-12-01T10:30:00Z",
  "owner": {
    "id": "user_456",
    "full_name": "이점주",
    "email": "owner@example.com"
  }
}
```

---

## 📦 주문 관리

### 주문 목록 조회

#### `GET /admin/orders?page=1&limit=20&status=cancelled&date_from=2024-12-01&date_to=2024-12-31`

**쿼리 파라미터:**
- `page`: 페이지 번호
- `limit`: 페이지당 항목 수
- `status`: 주문 상태 필터
- `date_from`: 조회 시작 날짜 (YYYY-MM-DD)
- `date_to`: 조회 종료 날짜 (YYYY-MM-DD)

**응답:**
```json
{
  "orders": [
    {
      "id": "order_123",
      "order_number": "ORD-20241201-001",
      "status": "delivered",
      "total_amount": 28500,
      "delivery_fee": 3000,
      "created_at": "2024-12-01T12:30:00Z",
      "delivered_at": "2024-12-01T13:15:00Z",
      "customer": {
        "id": "user_123",
        "full_name": "김고객",
        "email": "customer@example.com"
      },
      "restaurant": {
        "id": "restaurant_456",
        "name": "맛있는 치킨집"
      },
      "driver": {
        "id": "user_789",
        "full_name": "박배달",
        "email": "driver@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 85,
    "totalPages": 5
  }
}
```

---

## ⭐ 리뷰 관리

### 리뷰 목록 조회

#### `GET /admin/reviews?page=1&limit=20&min_rating=1&max_rating=2`

**쿼리 파라미터:**
- `page`: 페이지 번호
- `limit`: 페이지당 항목 수
- `min_rating`: 최소 평점 (1-5)
- `max_rating`: 최대 평점 (1-5)

**응답:**
```json
{
  "reviews": [
    {
      "id": "review_123",
      "overall_rating": 1.5,
      "restaurant_rating": 1,
      "food_rating": 2,
      "service_rating": 2,
      "comment": "음식이 차갑게 와서 실망했습니다.",
      "is_visible": true,
      "helpful_count": 3,
      "created_at": "2024-12-01T13:30:00Z",
      "customer": {
        "id": "user_123",
        "full_name": "김고객"
      },
      "restaurant": {
        "id": "restaurant_456",
        "name": "맛있는 치킨집"
      },
      "responses": [
        {
          "id": "response_123",
          "responder_type": "restaurant_owner",
          "response_text": "불편을 드려 죄송합니다. 개선하겠습니다.",
          "created_at": "2024-12-01T14:00:00Z",
          "responder": {
            "id": "user_456",
            "full_name": "이점주"
          }
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 23,
    "totalPages": 2
  }
}
```

### 리뷰 표시/숨김

#### `PUT /admin/reviews/:id/visibility`

**요청 본문:**
```json
{
  "is_visible": false
}
```

**응답:**
```json
{
  "id": "review_123",
  "overall_rating": 1.5,
  "comment": "부적절한 내용",
  "is_visible": false,
  "updated_at": "2024-12-01T10:30:00Z",
  "customer": {
    "id": "user_123",
    "full_name": "김고객"
  },
  "restaurant": {
    "id": "restaurant_456",
    "name": "맛있는 치킨집"
  }
}
```

---

## 📈 분석 및 차트

### 월별 매출 차트

#### `GET /admin/analytics/revenue/2024`

**응답:**
```json
[
  {
    "month": 1,
    "revenue": 8500000,
    "commission": 255000,
    "orderCount": 320
  },
  {
    "month": 2,
    "revenue": 9200000,
    "commission": 276000,
    "orderCount": 350
  },
  {
    "month": 3,
    "revenue": 10100000,
    "commission": 303000,
    "orderCount": 385
  }
]
```

### 시스템 활동 로그

#### `GET /admin/activity?page=1&limit=50`

**응답:**
```json
{
  "activities": [
    {
      "type": "order",
      "action": "주문 delivered",
      "description": "김고객님이 주문을 delivered 상태로 변경했습니다",
      "timestamp": "2024-12-01T10:30:00Z",
      "entityId": "order_123"
    },
    {
      "type": "user",
      "action": "사용자 가입",
      "description": "이영희님이 customer 역할로 가입했습니다",
      "timestamp": "2024-12-01T10:25:00Z",
      "entityId": "user_456"
    },
    {
      "type": "restaurant",
      "action": "레스토랑 승인",
      "description": "맛있는 치킨집이 승인되었습니다",
      "timestamp": "2024-12-01T10:20:00Z",
      "entityId": "restaurant_789"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 250,
    "totalPages": 5
  }
}
```

---

## 🔐 권한 및 인증

### 인증 요구사항
모든 관리자 API는 다음 인증이 필요합니다:

```bash
Authorization: Bearer <JWT_TOKEN>
```

### 역할 기반 접근 제어
- **필요 역할**: `admin`
- **권한 범위**: 플랫폼 전체 데이터 접근
- **제한사항**: 읽기 전용 또는 수정 가능 (엔드포인트별 상이)

### JWT 토큰 구조
```json
{
  "sub": "admin_user_id",
  "email": "admin@company.com",
  "role": "admin",
  "iat": 1701430800,
  "exp": 1701517200
}
```

---

## 🖥️ 대시보드 UI 구성 가이드

### 메인 대시보드
1. **KPI 카드 영역**
   - 총 사용자 수
   - 활성 레스토랑 수
   - 일일 주문 수
   - 월간 매출

2. **차트 영역**
   - 월별 매출 추이 (라인 차트)
   - 주문 상태별 분포 (도넛 차트)
   - 사용자 역할별 분포 (바 차트)

3. **최근 활동 영역**
   - 실시간 활동 로그
   - 신규 가입 알림
   - 레스토랑 승인 대기

### 상세 관리 페이지
1. **사용자 관리**
   - 사용자 목록 테이블
   - 필터 및 검색 기능
   - 상태 변경 액션

2. **레스토랑 관리**
   - 승인 대기 레스토랑 우선 표시
   - 상세 정보 모달
   - 일괄 승인 기능

3. **주문 모니터링**
   - 실시간 주문 현황
   - 문제 주문 하이라이트
   - 상태별 필터링

4. **리뷰 관리**
   - 부정적 리뷰 우선 표시
   - 신고된 리뷰 관리
   - 일괄 처리 기능

---

## 🔧 설정 및 사용법

### 개발 환경 설정

#### 1. 관리자 계정 생성
```sql
-- Supabase SQL Editor에서 실행
INSERT INTO users (
  id,
  email,
  full_name,
  role,
  is_active,
  email_verified
) VALUES (
  gen_random_uuid(),
  'admin@company.com',
  '시스템 관리자',
  'admin',
  true,
  true
);
```

#### 2. 환경 변수 설정
```bash
# .env 파일
ADMIN_DEFAULT_EMAIL=admin@company.com
ADMIN_DEFAULT_PASSWORD=SecurePassword123!
JWT_SECRET=your-secret-key
```

#### 3. API 테스트
```bash
# 관리자 로그인
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "SecurePassword123!"
  }'

# 대시보드 통계 조회
curl -X GET http://localhost:3000/admin/dashboard \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### 프로덕션 배포

#### 1. 보안 설정
- JWT 비밀키 강화
- HTTPS 강제 적용
- IP 화이트리스트 설정
- 접근 로그 활성화

#### 2. 성능 최적화
- 데이터베이스 인덱스 최적화
- 캐싱 전략 적용
- API 응답 압축

#### 3. 모니터링
- 관리자 액션 로깅
- 이상 행동 탐지
- 성능 메트릭 수집

---

## 📊 주요 메트릭 및 KPI

### 비즈니스 메트릭
- **DAU/MAU**: 일간/월간 활성 사용자
- **주문 전환율**: 방문자 대비 주문 비율
- **평균 주문 가격**: AOV (Average Order Value)
- **고객 생애 가치**: CLV (Customer Lifetime Value)

### 운영 메트릭
- **주문 처리 시간**: 주문부터 배달까지 평균 시간
- **취소율**: 전체 주문 대비 취소 주문 비율
- **레스토랑 활성도**: 월간 활성 레스토랑 비율
- **배달기사 효율성**: 시간당 배달 완료 건수

### 수익 메트릭
- **총 거래액**: GMV (Gross Merchandise Value)
- **플랫폼 수수료**: 레스토랑 수수료 + 배달 수수료
- **월간 순익**: 수수료 - 운영비
- **수수료율**: 거래액 대비 수수료 비율

---

## 🚨 알림 및 경고

### 자동 알림 설정
1. **신규 레스토랑 등록**: 승인 요청 알림
2. **고객 불만사항**: 낮은 평점 리뷰 알림
3. **시스템 이상**: 주문 처리 지연 알림
4. **매출 급감**: 일일 매출 20% 이상 감소 시

### 임계치 설정
```json
{
  "alerts": {
    "lowRatingThreshold": 2.0,
    "orderDelayMinutes": 60,
    "revenueDropPercentage": 20,
    "systemErrorRate": 5
  }
}
```

---

## 📱 모바일 대응

### 반응형 디자인
- 태블릿/모바일 최적화
- 터치 친화적 인터페이스
- 핵심 기능 우선 표시

### PWA 지원
- 오프라인 기본 기능
- 푸시 알림 지원
- 앱 설치 옵션

---

## 🔍 문제 해결

### 일반적인 문제들

#### 1. 대시보드 로딩 느림
```bash
# 데이터베이스 쿼리 최적화 확인
EXPLAIN ANALYZE SELECT * FROM orders 
WHERE created_at >= '2024-12-01';

# 인덱스 추가
CREATE INDEX idx_orders_created_at ON orders(created_at);
```

#### 2. 권한 오류
```bash
# JWT 토큰 검증
curl -X GET http://localhost:3000/auth/verify \
  -H "Authorization: Bearer <JWT_TOKEN>"

# 사용자 역할 확인
SELECT id, email, role FROM users WHERE email = 'admin@company.com';
```

#### 3. 통계 데이터 불일치
```bash
# 데이터 정합성 검사
SELECT 
  COUNT(*) as total_orders,
  COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
  SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END) as total_revenue
FROM orders;
```

---

## 🔄 데이터 백업 및 복구

### 정기 백업
- **일일**: 핵심 비즈니스 데이터
- **주간**: 전체 데이터베이스
- **월간**: 아카이브 데이터

### 복구 절차
1. 백업 파일 확인
2. 서비스 중단 공지
3. 데이터 복구 실행
4. 데이터 정합성 검증
5. 서비스 재개

---

*이 관리자 대시보드는 배달 플랫폼의 효율적인 운영을 위해 지속적으로 개선되고 있습니다.* 