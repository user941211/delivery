/**
 * Jest 테스트 환경 설정
 * 모든 테스트 파일에서 공통으로 사용할 설정들
 */

// Testing Library Jest DOM matchers 추가
import '@testing-library/jest-dom'

// 기본 글로벌 설정
global.console = {
  ...console,
  // 테스트 중 불필요한 로그 숨기기
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} 