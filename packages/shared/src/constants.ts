// 공통 상수 정의
export const API_ENDPOINTS = {
  AUTH: '/auth',
  USERS: '/users',
  RESTAURANTS: '/restaurants',
  ORDERS: '/orders',
  DELIVERY: '/delivery',
} as const;

export const USER_ROLES = {
  CUSTOMER: 'customer',
  DRIVER: 'driver',
  RESTAURANT_OWNER: 'restaurant_owner',
  ADMIN: 'admin',
} as const;
