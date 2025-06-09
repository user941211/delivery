/**
 * 형식 변환 관련 유틸리티 함수
 */

/**
 * 전화번호를 표준 형식으로 포맷팅
 */
export function formatPhoneNumber(phone: string): string {
  const numbers = phone.replace(/\D/g, '');
  
  if (numbers.length === 11 && numbers.startsWith('01')) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
  } else if (numbers.length === 10 && numbers.startsWith('02')) {
    return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  } else if (numbers.length === 10) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`;
  }
  
  return phone;
}

/**
 * 사업자등록번호를 표준 형식으로 포맷팅
 */
export function formatBusinessNumber(businessNumber: string): string {
  const numbers = businessNumber.replace(/\D/g, '');
  if (numbers.length === 10) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5)}`;
  }
  return businessNumber;
}

/**
 * 주소를 한 줄로 조합
 */
export function formatAddress(addressParts: {
  province?: string;
  city?: string;
  district?: string;
  detail?: string;
}): string {
  const parts = [
    addressParts.province,
    addressParts.city,
    addressParts.district,
    addressParts.detail
  ].filter(Boolean);
  
  return parts.join(' ');
}

/**
 * 파일 크기를 읽기 쉬운 형식으로 변환
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * JSON을 보기 좋게 포맷팅
 */
export function formatJson(obj: any): string {
  return JSON.stringify(obj, null, 2);
}

/**
 * 배열을 문자열로 포맷팅
 */
export function formatArrayToString(
  arr: string[], 
  separator: string = ', ', 
  lastSeparator: string = ' 및 '
): string {
  if (arr.length === 0) return '';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return arr.join(lastSeparator);
  
  const allButLast = arr.slice(0, -1);
  const last = arr[arr.length - 1];
  
  return allButLast.join(separator) + lastSeparator + last;
} 