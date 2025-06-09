/**
 * Jest 테스트 환경 전역 설정
 * 
 * 모든 테스트에서 공통으로 사용할 설정과 유틸리티를 정의합니다.
 */

// 테스트 타임아웃 연장
jest.setTimeout(30000);

// 환경 변수 설정
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '15m';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';

// 콘솔 로그 억제 (필요시 주석 해제)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// 전역 테스트 유틸리티
(global as any).testUtils = {
  /**
   * 비동기 지연 함수
   */
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * 랜덤 문자열 생성
   */
  randomString: (length = 10) => {
    return Math.random().toString(36).substring(2, length + 2);
  },
  
  /**
   * 테스트용 사용자 데이터 생성
   */
  createTestUser: (overrides = {}) => ({
    id: `test-user-${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    username: `testuser${Date.now()}`,
    fullName: '테스트 사용자',
    phone: '010-1234-5678',
    role: 'customer' as const,
    status: 'active' as const,
    isEmailVerified: false,
    isPhoneVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
};

// 테스트 실행 전후 정리
beforeEach(() => {
  // 각 테스트 전 실행할 설정
});

afterEach(() => {
  // 각 테스트 후 정리
  jest.clearAllMocks();
});

export {}; 