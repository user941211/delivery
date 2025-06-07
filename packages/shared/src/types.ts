// 공통 타입 정의
export interface User {
  id: string;
  email: string;
  role: 'customer' | 'driver' | 'restaurant_owner' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
