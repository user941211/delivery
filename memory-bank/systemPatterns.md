# 시스템 아키텍처 및 패턴

## 전체 시스템 아키텍처

### 고수준 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js Web   │    │  Expo Mobile    │    │ Admin Dashboard │
│     Client      │    │     Client      │    │   (점주/관리자)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Load Balancer │
                    │   (Optional)    │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Nest.js API   │
                    │     Server      │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │    Supabase     │    │     Redis       │
│   (Main DB)     │    │   (Auth/RT)     │    │   (Cache/Queue) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 모노레포 구조

```
delivery-platform/
├── apps/
│   ├── web/                 # Next.js 웹 애플리케이션
│   ├── mobile/              # Expo 모바일 앱
│   └── api/                 # Nest.js 백엔드
├── packages/
│   ├── shared/              # 공통 타입 및 유틸리티
│   ├── ui/                  # 공용 UI 컴포넌트
│   └── database/            # 데이터베이스 스키마 및 마이그레이션
└── tools/
    ├── scripts/             # 빌드 및 배포 스크립트
    └── config/              # 공통 설정 파일
```

## 핵심 설계 패턴

### 1. 모듈화 패턴 (Nest.js)

```typescript
// 도메인별 모듈 분리
AuthModule; // 인증 및 권한 관리
UsersModule; // 사용자 관리
RestaurantsModule; // 레스토랑 및 메뉴 관리
OrdersModule; // 주문 처리
DeliveryModule; // 배달 관리
PaymentsModule; // 결제 처리
ChatModule; // 실시간 채팅
NotificationsModule; // 알림 서비스
```

### 2. 계층형 아키텍처

```typescript
Controller Layer  // HTTP 요청 처리 및 응답
├── Service Layer    // 비즈니스 로직
├── Repository Layer // 데이터 액세스
└── Entity Layer     // 데이터 모델
```

### 3. 이벤트 기반 아키텍처

```typescript
// 주요 도메인 이벤트
OrderCreatedEvent; // 주문 생성
OrderAcceptedEvent; // 주문 수락
DriverAssignedEvent; // 배달기사 배정
DeliveryStartedEvent; // 배달 시작
DeliveryCompletedEvent; // 배달 완료
```

## 데이터베이스 설계

### 핵심 엔티티 관계

```sql
Users ─┬─ Customers
       ├─ Drivers
       └─ RestaurantOwners

Restaurants ──┬─ MenuItems
              └─ Orders ──┬─ OrderItems
                          ├─ Payments
                          ├─ Deliveries
                          └─ Reviews

ChatRooms ── ChatMessages
DeliveryTracking ── LocationUpdates
```

### 데이터베이스 최적화 전략

- **인덱싱**: 자주 조회되는 컬럼 (location, status, timestamps)
- **파티셔닝**: 대용량 테이블 (orders, messages, tracking)
- **정규화**: 3NF 준수로 데이터 일관성 보장
- **비정규화**: 성능 최적화가 필요한 읽기 전용 데이터

## 실시간 기능 아키텍처

### WebSocket 연결 관리

```typescript
// 실시간 이벤트 처리
OrderStatusUpdates; // 주문 상태 변경
LocationTracking; // 위치 추적
ChatMessages; // 채팅 메시지
DriverAvailability; // 배달기사 가용성
```

### 확장성 고려사항

- **수평 확장**: Redis Adapter로 다중 서버 지원
- **커넥션 풀링**: WebSocket 연결 최적화
- **이벤트 스토어**: 중요 이벤트 영속화

## 보안 아키텍처

### 인증 및 권한

```typescript
// JWT 기반 인증
AccessToken; // 15분 만료
RefreshToken; // 7일 만료

// 역할 기반 접근 제어 (RBAC)
Roles: Customer | Driver | RestaurantOwner | Admin;
Permissions: CREATE | READ | UPDATE | DELETE;
Resources: Orders | Restaurants | Users | Payments;
```

### 데이터 보호

- **암호화**: 민감 정보 AES-256 암호화
- **해싱**: 비밀번호 bcrypt 해싱
- **HTTPS**: 모든 통신 TLS 1.3
- **CORS**: 엄격한 CORS 정책

## 성능 최적화 패턴

### 캐싱 전략

```typescript
// Redis 캐싱 레이어
UserSessions; // 사용자 세션 (30분)
RestaurantMenus; // 메뉴 데이터 (1시간)
LocationData; // 위치 정보 (10분)
SearchResults; // 검색 결과 (5분)
```

### 데이터베이스 최적화

- **커넥션 풀**: PostgreSQL 커넥션 풀링
- **쿼리 최적화**: N+1 문제 해결 (DataLoader 패턴)
- **읽기 복제본**: 읽기 트래픽 분산
- **배치 처리**: 대량 데이터 처리 최적화

## 에러 처리 및 복구

### 에러 처리 전략

```typescript
// 계층별 에러 처리
ValidationError; // 입력 데이터 검증
BusinessLogicError; // 비즈니스 규칙 위반
DatabaseError; // 데이터베이스 오류
ExternalAPIError; // 외부 API 호출 실패
```

### 복구 메커니즘

- **재시도 로직**: 지수 백오프 알고리즘
- **회로 차단기**: 외부 서비스 장애 대응
- **대체 서비스**: 결제/지도 API 대체 경로
- **데이터 백업**: 정기적 백업 및 복구 테스트

## 모니터링 및 관찰성

### 로깅 전략

```typescript
// 구조화된 로깅
Info; // 일반 정보 (요청/응답)
Warn; // 경고 (성능 저하)
Error; // 오류 (예외 발생)
Debug; // 디버그 (개발 환경)
```

### 메트릭 수집

- **애플리케이션 메트릭**: 응답 시간, 처리량, 에러율
- **비즈니스 메트릭**: 주문 수, 배달 완료율, 사용자 활동
- **인프라 메트릭**: CPU, 메모리, 디스크, 네트워크

## 확장성 및 유연성

### 마이크로서비스 전환 준비

```typescript
// 향후 분리 가능한 서비스
AuthService; // 인증 서비스
OrderService; // 주문 서비스
DeliveryService; // 배달 서비스
PaymentService; // 결제 서비스
NotificationService; // 알림 서비스
```

### API 설계 원칙

- **RESTful**: 표준 HTTP 메서드 사용
- **GraphQL**: 복잡한 쿼리 최적화
- **버전 관리**: API 버전 관리 전략
- **문서화**: OpenAPI/Swagger 자동 생성
