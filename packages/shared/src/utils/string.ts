/**
 * 문자열 관련 유틸리티 함수
 */

/**
 * 문자열의 첫 글자를 대문자로 변환
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * 카멜케이스를 스네이크케이스로 변환
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * 스네이크케이스를 카멜케이스로 변환
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 문자열을 특정 길이로 자르고 말줄임표 추가
 */
export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * 한국어 이름 마스킹 (예: 홍길동 -> 홍*동)
 */
export function maskKoreanName(name: string): string {
  if (!name || name.length < 2) return name;
  
  if (name.length === 2) {
    return name[0] + '*';
  }
  
  const first = name[0];
  const last = name[name.length - 1];
  const middle = '*'.repeat(name.length - 2);
  
  return first + middle + last;
}

/**
 * 전화번호 마스킹 (예: 010-1234-5678 -> 010-****-5678)
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return phone;
  
  // 하이픈 제거 후 숫자만 추출
  const numbers = phone.replace(/\D/g, '');
  
  if (numbers.length === 11) {
    // 010-****-5678 형태
    return `${numbers.slice(0, 3)}-****-${numbers.slice(7)}`;
  } else if (numbers.length === 10) {
    // 02-***-5678 형태
    return `${numbers.slice(0, 2)}-***-${numbers.slice(6)}`;
  }
  
  return phone;
}

/**
 * 이메일 마스킹 (예: user@example.com -> u***@example.com)
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  
  const [local, domain] = email.split('@');
  if (local.length <= 1) return email;
  
  const maskedLocal = local[0] + '*'.repeat(Math.max(0, local.length - 1));
  return `${maskedLocal}@${domain}`;
}

/**
 * 신용카드 번호 마스킹 (예: 1234567890123456 -> ****-****-****-3456)
 */
export function maskCardNumber(cardNumber: string): string {
  if (!cardNumber) return cardNumber;
  
  const numbers = cardNumber.replace(/\D/g, '');
  if (numbers.length < 4) return cardNumber;
  
  const lastFour = numbers.slice(-4);
  const masked = '****-****-****-' + lastFour;
  
  return masked;
}

/**
 * 랜덤 문자열 생성
 */
export function generateRandomString(length: number, includeNumbers: boolean = true): string {
  let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  if (includeNumbers) {
    chars += '0123456789';
  }
  
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * 문자열에서 숫자만 추출
 */
export function extractNumbers(str: string): string {
  return str.replace(/\D/g, '');
}

/**
 * 문자열에서 한글만 추출
 */
export function extractKorean(str: string): string {
  return str.replace(/[^가-힣]/g, '');
}

/**
 * 문자열이 비어있는지 체크 (null, undefined, 빈 문자열, 공백 문자열)
 */
export function isEmpty(str: string | null | undefined): boolean {
  return !str || str.trim().length === 0;
}

/**
 * 문자열 배열을 자연스러운 형태로 조합 (예: ['사과', '바나나', '오렌지'] -> '사과, 바나나, 오렌지')
 */
export function joinNaturally(items: string[], separator: string = ', ', lastSeparator: string = ', '): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return items.join(lastSeparator);
  
  const allButLast = items.slice(0, -1);
  const last = items[items.length - 1];
  
  return allButLast.join(separator) + lastSeparator + last;
}

/**
 * HTML 태그 제거
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * URL 슬러그 생성 (한글 포함)
 */
export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
} 