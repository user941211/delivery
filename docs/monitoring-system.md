# 모니터링 시스템 가이드

## 📋 개요

배달 플랫폼의 모니터링 시스템은 시스템 상태, 성능 메트릭, 로깅을 통합적으로 관리하여 안정적인 서비스 운영을 지원합니다.

### 🔧 주요 기능
- **헬스 체크**: 시스템, 데이터베이스, API 상태 모니터링
- **성능 메트릭**: CPU, 메모리, 디스크 사용률 추적
- **구조화된 로깅**: 요청 추적, 에러 로그, 비즈니스 이벤트 기록
- **Prometheus 호환**: 메트릭 수집 및 알림 시스템 연동
- **로그 관리**: 파일 로테이션, 자동 정리, 검색 기능

---

## 🏗️ 시스템 구조

### 핵심 컴포넌트

#### 1. **MonitoringService**
- 시스템 상태 체크 및 메트릭 수집
- 데이터베이스 연결 상태 모니터링
- Prometheus 형식 메트릭 생성

#### 2. **LoggingService**
- 구조화된 로그 생성 및 관리
- 파일 로테이션 및 자동 정리
- 콘솔 및 파일 출력 지원

#### 3. **MonitoringController**
- REST API 엔드포인트 제공
- 헬스 체크, 메트릭, 로그 조회 API

---

## 🌐 API 엔드포인트

### 헬스 체크

#### `GET /monitoring/health`
**전체 시스템 헬스 체크**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-01T10:30:00Z",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 15,
      "details": {
        "provider": "Supabase PostgreSQL"
      }
    },
    "system": {
      "status": "healthy",
      "details": {
        "memory": {
          "percentage": 45.2,
          "used": 2048,
          "total": 4096
        },
        "platform": "linux",
        "nodeVersion": "v18.17.0"
      }
    },
    "api": {
      "status": "healthy",
      "details": {
        "uptime": 3600,
        "environment": "production"
      }
    }
  },
  "uptime": 3600,
  "version": "1.0.0"
}
```

#### `GET /monitoring/ping`
**간단한 생존 확인**
```json
{
  "status": "ok",
  "timestamp": "2024-12-01T10:30:00Z",
  "message": "pong"
}
```

### 메트릭

#### `GET /monitoring/metrics` 🔒
**상세 시스템 메트릭 (관리자 전용)**
```json
{
  "timestamp": "2024-12-01T10:30:00Z",
  "system": {
    "memory": {
      "rss": 134217728,
      "heapTotal": 67108864,
      "heapUsed": 33554432
    },
    "cpu": {
      "user": 1250000,
      "system": 500000
    },
    "os": {
      "platform": "linux",
      "totalMemory": 4294967296,
      "freeMemory": 2147483648,
      "loadAverage": [0.5, 0.3, 0.1]
    }
  },
  "database": {
    "tables": {
      "users_count": 1250,
      "restaurants_count": 85,
      "orders_count": 3420
    },
    "activity": {
      "recent_orders_1h": 15,
      "recent_users_1h": 3
    }
  },
  "application": {
    "uptime": 3600,
    "environment": "production",
    "features": {
      "monitoring": true,
      "websockets": true
    }
  }
}
```

#### `GET /monitoring/metrics/prometheus`
**Prometheus 형식 메트릭**
```
# HELP delivery_platform_uptime_seconds Total uptime of the application
# TYPE delivery_platform_uptime_seconds counter
delivery_platform_uptime_seconds 3600

# HELP delivery_platform_memory_usage_bytes Memory usage in bytes
# TYPE delivery_platform_memory_usage_bytes gauge
delivery_platform_memory_usage_bytes{type="rss"} 134217728
delivery_platform_memory_usage_bytes{type="heap_used"} 33554432

# HELP delivery_platform_database_records Total records in database tables
# TYPE delivery_platform_database_records gauge
delivery_platform_database_records{table="users"} 1250
delivery_platform_database_records{table="orders"} 3420
```

### 개별 상태 체크

#### `GET /monitoring/database` 🔒
**데이터베이스 상태 체크**
```json
{
  "status": "healthy",
  "message": "Database connection successful",
  "responseTime": 15,
  "details": {
    "provider": "Supabase PostgreSQL",
    "query": "SELECT count from users LIMIT 1"
  }
}
```

#### `GET /monitoring/system` 🔒
**시스템 리소스 상태**
```json
{
  "status": "healthy",
  "message": "System resources normal",
  "details": {
    "memory": {
      "used": 2048,
      "total": 4096,
      "percentage": 50.0,
      "threshold": 80
    },
    "heap": {
      "used": 32,
      "total": 64,
      "threshold": 1024
    },
    "platform": "linux",
    "nodeVersion": "v18.17.0"
  }
}
```

### 로그 관리

#### `GET /monitoring/logs/stats?hours=24` 🔒
**로그 통계 조회**
```json
{
  "period": {
    "start": "2024-11-30T10:30:00Z",
    "end": "2024-12-01T10:30:00Z",
    "hours": 24
  },
  "counts": {
    "error": 5,
    "warn": 23,
    "info": 1250,
    "debug": 3420
  }
}
```

#### `GET /monitoring/info`
**서버 정보 조회**
```json
{
  "name": "Delivery Platform API",
  "version": "1.0.0",
  "environment": "production",
  "nodeVersion": "v18.17.0",
  "platform": "linux",
  "architecture": "x64",
  "timezone": "Asia/Seoul",
  "startTime": "2024-12-01T09:00:00Z",
  "uptime": 3600
}
```

---

## 📝 로깅 시스템

### 로그 레벨
- **ERROR**: 시스템 오류, 예외 상황
- **WARN**: 경고 메시지, 잠재적 문제
- **INFO**: 일반 정보, 비즈니스 이벤트
- **DEBUG**: 디버깅 정보, 상세 추적

### 로그 구조
```json
{
  "timestamp": "2024-12-01T10:30:00Z",
  "level": "info",
  "message": "User login successful",
  "context": "AuthService",
  "meta": {
    "userId": "user_123",
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  },
  "requestId": "req_abc123",
  "userId": "user_123"
}
```

### 특수 로그 타입

#### HTTP 요청 로그
```typescript
loggingService.logHttpRequest(
  'POST',
  '/api/orders',
  201,
  150, // 응답 시간 (ms)
  'user_123'
);
```

#### 데이터베이스 쿼리 로그
```typescript
loggingService.logDatabaseQuery(
  'SELECT * FROM orders WHERE id = $1',
  25, // 실행 시간 (ms)
  error // 에러 객체 (선택사항)
);
```

#### 사용자 액션 로그
```typescript
loggingService.logUserAction(
  'user_123',
  'create_order',
  'orders',
  { orderId: 'order_456', amount: 25000 }
);
```

#### 비즈니스 이벤트 로그
```typescript
loggingService.logBusinessEvent(
  'order_delivered',
  { orderId: 'order_456', deliveryTime: 1800 },
  'OrderService'
);
```

---

## 🔧 설정 및 사용법

### 환경 변수
```bash
# 로그 레벨 설정
LOG_LEVEL=info

# 로그 파일 경로
LOG_DIR=./logs

# 모니터링 활성화
MONITORING_ENABLED=true

# Prometheus 메트릭 활성화
PROMETHEUS_ENABLED=true
```

### 개발 환경에서 사용

#### 1. 헬스 체크 확인
```bash
curl http://localhost:3000/monitoring/health
```

#### 2. 시스템 메트릭 조회
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/monitoring/metrics
```

#### 3. Prometheus 메트릭 수집
```bash
curl http://localhost:3000/monitoring/metrics/prometheus
```

### 프로덕션 환경 설정

#### 1. 로드 밸런서 헬스 체크
```yaml
# docker-compose.yml
services:
  api:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/monitoring/ping"]
      interval: 30s
      timeout: 10s
      retries: 3
```

#### 2. Prometheus 수집 설정
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'delivery-platform'
    static_configs:
      - targets: ['api:3000']
    metrics_path: '/monitoring/metrics/prometheus'
    scrape_interval: 15s
```

#### 3. Grafana 대시보드
- **업타임 모니터링**: `delivery_platform_uptime_seconds`
- **메모리 사용률**: `delivery_platform_memory_usage_bytes`
- **데이터베이스 레코드 수**: `delivery_platform_database_records`

---

## 🔍 로그 파일 관리

### 로그 파일 구조
```
logs/
├── error-2024-12-01.log      # 에러 로그
├── warn-2024-12-01.log       # 경고 로그
├── info-2024-12-01.log       # 정보 로그
├── debug-2024-12-01.log      # 디버그 로그
└── archived/                 # 로테이션된 파일들
    ├── error-2024-11-30-10-30-00.log
    └── info-2024-11-30-15-45-30.log
```

### 자동 로테이션
- **파일 크기**: 10MB 초과 시 자동 로테이션
- **보관 기간**: 최대 10개 파일 유지
- **명명 규칙**: `{level}-{date}-{timestamp}.log`

### 로그 검색 및 분석
```bash
# 에러 로그 검색
grep "ERROR" logs/error-2024-12-01.log

# 특정 사용자 액션 추적
grep "user_123" logs/info-2024-12-01.log

# JSON 로그 파싱
jq '.level == "error"' logs/error-2024-12-01.log
```

---

## 🚨 알림 및 경고

### 시스템 임계치
- **메모리 사용률**: 80% 초과 시 경고
- **힙 메모리**: 1GB 초과 시 경고
- **데이터베이스 응답 시간**: 1초 초과 시 경고
- **에러 로그**: 분당 10개 초과 시 알림

### 알림 설정 (예시)
```yaml
# alertmanager.yml
groups:
- name: delivery-platform
  rules:
  - alert: HighMemoryUsage
    expr: delivery_platform_memory_usage_bytes{type="heap_used"} > 1000000000
    for: 5m
    annotations:
      summary: "High memory usage detected"
      
  - alert: DatabaseSlow
    expr: delivery_platform_database_response_time > 1000
    for: 2m
    annotations:
      summary: "Database response time is slow"
```

---

## 🔧 확장 및 커스터마이징

### 커스텀 메트릭 추가
```typescript
// monitoring.service.ts에서
private getCustomMetrics() {
  return {
    active_users: this.getActiveUserCount(),
    pending_orders: this.getPendingOrderCount(),
    delivery_success_rate: this.getDeliverySuccessRate()
  };
}
```

### 커스텀 로그 타입
```typescript
// logging.service.ts에서
logDeliveryEvent(
  orderId: string,
  event: 'picked_up' | 'delivered' | 'cancelled',
  meta: Record<string, any>
) {
  this.logWithMeta('info', `Delivery ${event}`, {
    orderId,
    event,
    ...meta
  }, 'DeliveryTracking');
}
```

### 외부 모니터링 도구 연동
- **Sentry**: 에러 추적 및 성능 모니터링
- **DataDog**: APM 및 로그 관리
- **New Relic**: 애플리케이션 성능 모니터링
- **Elastic Stack**: 로그 수집 및 분석

---

## ❓ 문제 해결

### 일반적인 문제들

#### 1. 헬스 체크 실패
```bash
# 로그 확인
tail -f logs/error-$(date +%Y-%m-%d).log

# 데이터베이스 연결 확인
curl http://localhost:3000/monitoring/database
```

#### 2. 높은 메모리 사용률
```bash
# 시스템 메트릭 확인
curl http://localhost:3000/monitoring/system

# Node.js 힙 덤프 생성
kill -USR2 <PID>
```

#### 3. 로그 파일 누락
```bash
# 로그 디렉토리 권한 확인
ls -la logs/

# 로그 서비스 재시작
pm2 restart delivery-api
```

---

## 📊 성능 최적화

### 모니터링 오버헤드 최소화
- 메트릭 수집 주기 조정
- 불필요한 로그 레벨 비활성화
- 로그 파일 비동기 쓰기 사용

### 확장성 고려사항
- 로그 중앙화 (ELK Stack, Fluentd)
- 메트릭 수집 분산화
- 알림 규칙 최적화

---

*이 모니터링 시스템은 배달 플랫폼의 안정적인 운영을 위해 지속적으로 개선되고 있습니다.* 