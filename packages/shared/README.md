# @delivery-platform/shared

배달 플랫폼에서 사용되는 공통 타입, 상수, 유틸리티 함수를 제공하는 패키지입니다.

## 📦 설치

```bash
npm install @delivery-platform/shared
```

## 🚀 사용법

### 타입 정의

```typescript
import { User, Restaurant, Order, DeliveryStatus } from '@delivery-platform/shared';

const user: User = {
  id: '1',
  email: 'user@example.com',
  name: '홍길동',
  role: 'customer'
};
```

### 상수

```typescript
import { DELIVERY_STATUS, PAYMENT_METHODS, UI_COLORS } from '@delivery-platform/shared';

console.log(DELIVERY_STATUS.PENDING); // '배달 준비 중'
console.log(PAYMENT_METHODS.CARD); // '카드'
console.log(UI_COLORS.PRIMARY); // '#007bff'
```

### 유틸리티 함수

```typescript
import { 
  formatCurrency, 
  formatDate, 
  isValidEmail, 
  calculateDistance 
} from '@delivery-platform/shared';

// 통화 포맷팅
formatCurrency(12000); // '12,000원'

// 날짜 포맷팅
formatDate(new Date()); // '2024년 01월 15일'

// 이메일 유효성 검사
isValidEmail('test@example.com'); // true

// 거리 계산
const seoul = { latitude: 37.5665, longitude: 126.9780 };
const busan = { latitude: 35.1796, longitude: 129.0756 };
calculateDistance(seoul, busan); // 약 325km
```

### Zod 스키마

```typescript
import { userSchema, orderSchema } from '@delivery-platform/shared';

// 사용자 데이터 검증
const userData = userSchema.parse({
  email: 'user@example.com',
  name: '홍길동',
  role: 'customer'
});

// 주문 데이터 검증
const orderData = orderSchema.parse({
  restaurantId: 'rest-1',
  items: [{ menuId: 'menu-1', quantity: 2 }],
  totalAmount: 25000
});
```

## 📁 구조

```
src/
├── types/          # TypeScript 타입 정의
├── constants/      # 상수 정의
├── utils/          # 유틸리티 함수
├── schemas/        # Zod 검증 스키마
└── index.ts        # 메인 export 파일
```

## 🧪 테스트

```bash
npm test
```

## 🔧 빌드

```bash
npm run build
```

## 📝 라이선스

MIT 