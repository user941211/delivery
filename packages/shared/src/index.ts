/**
 * @package delivery-shared
 * @description 배달 플랫폼 공통 타입 및 유틸리티 패키지
 * 
 * 이 패키지는 프론트엔드와 백엔드에서 공통으로 사용되는
 * TypeScript 타입 정의, 유틸리티 함수, 상수, Zod 스키마를 제공합니다.
 * 
 * @author Delivery Platform Team
 * @version 1.0.0
 */

// =========================
// 타입 정의 (Types)
// =========================
export * from './types';

// =========================
// 상수 정의 (Constants)
// =========================
export * from './constants';

// =========================
// 유틸리티 함수 (Utils)
// =========================
export * from './utils';

// =========================
// Zod 스키마 (Schemas)
// =========================
export * from './schemas';

// =========================
// 버전 정보
// =========================
export const PACKAGE_VERSION = '1.0.0';
export const PACKAGE_NAME = '@delivery/shared';

// =========================
// 패키지 정보
// =========================
export const packageInfo = {
  name: PACKAGE_NAME,
  version: PACKAGE_VERSION,
  description: '배달 플랫폼 공통 타입 및 유틸리티 패키지',
  author: 'Delivery Platform Team',
  license: 'MIT'
} as const;
