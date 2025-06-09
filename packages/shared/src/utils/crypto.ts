/**
 * 암호화/해시 관련 유틸리티 함수
 */

/**
 * UUID v4 생성 (간단한 구현)
 */
export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // 폴백 구현
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 랜덤 토큰 생성
 */
export function generateToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 간단한 문자열 해시 (djb2 알고리즘)
 */
export function simpleHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return hash >>> 0; // 부호 없는 32비트 정수로 변환
}

/**
 * Base64 인코딩
 */
export function encodeBase64(str: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(str);
  }
  // Node.js 환경
  return Buffer.from(str).toString('base64');
}

/**
 * Base64 디코딩
 */
export function decodeBase64(str: string): string {
  if (typeof atob !== 'undefined') {
    return atob(str);
  }
  // Node.js 환경
  return Buffer.from(str, 'base64').toString();
} 