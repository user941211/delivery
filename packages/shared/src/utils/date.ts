/**
 * 날짜/시간 관련 유틸리티 함수
 */

/**
 * 날짜를 한국어 형식으로 포맷팅
 */
export function formatDate(date: Date | string, pattern: string = 'yyyy년 MM월 dd일'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date provided');
  }

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  // 간단한 패턴 매칭
  return pattern
    .replace('yyyy', String(year))
    .replace('MM', month)
    .replace('dd', day);
}

/**
 * 시간을 한국어 형식으로 포맷팅
 */
export function formatTime(date: Date | string, pattern: string = 'HH:mm'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date provided');
  }

  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');

  return pattern
    .replace('HH', hours)
    .replace('mm', minutes);
}

/**
 * 날짜와 시간을 모두 포맷팅
 */
export function formatDateTime(date: Date | string, pattern: string = 'yyyy년 MM월 dd일 HH:mm'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date provided');
  }

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');

  return pattern
    .replace('yyyy', String(year))
    .replace('MM', month)
    .replace('dd', day)
    .replace('HH', hours)
    .replace('mm', minutes);
}

/**
 * 상대적 시간 표시 (몇 분 전, 몇 시간 전 등)
 */
export function getTimeAgo(date: Date | string): string {
  const now = new Date();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date provided');
  }

  const diffMs = now.getTime() - dateObj.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) {
    return '방금 전';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  } else if (diffMinutes < 1440) { // 24시간
    const hours = Math.floor(diffMinutes / 60);
    return `${hours}시간 전`;
  } else if (diffMinutes < 10080) { // 7일
    const days = Math.floor(diffMinutes / 1440);
    return `${days}일 전`;
  } else {
    return formatDate(dateObj, 'yyyy.MM.dd');
  }
}

/**
 * 배달 예상 시간 계산
 */
export function calculateEstimatedDeliveryTime(preparationMinutes: number, deliveryMinutes: number): Date {
  const now = new Date();
  return new Date(now.getTime() + (preparationMinutes + deliveryMinutes) * 60 * 1000);
}

/**
 * 영업시간 체크
 */
export function isWithinBusinessHours(
  businessHours: { openTime: string; closeTime: string; isClosed: boolean }[],
  checkDate: Date = new Date()
): boolean {
  const dayOfWeek = checkDate.getDay();
  const todayHours = businessHours[dayOfWeek];

  if (!todayHours || todayHours.isClosed) {
    return false;
  }

  const currentTime = formatTime(checkDate, 'HH:mm');
  return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
}

/**
 * 한국 시간대로 변환
 */
export function toKoreanTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date provided');
  }
  
  // 한국은 UTC+9
  const koreanTime = new Date(dateObj.getTime() + (9 * 60 * 60 * 1000));
  return koreanTime;
}

/**
 * 오늘의 시작과 끝 시간 가져오기
 */
export function getTodayRange(): { start: Date; end: Date } {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  
  return { start, end };
}

/**
 * 시간 문자열을 분으로 변환 (예: "14:30" -> 870)
 */
export function timeStringToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * 분을 시간 문자열로 변환 (예: 870 -> "14:30")
 */
export function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
} 