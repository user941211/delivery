/**
 * 숫자/가격 관련 유틸리티 함수
 */

/**
 * 숫자를 한국 원화 형식으로 포맷팅
 */
export function formatCurrency(amount: number, includeSymbol: boolean = true): string {
  const formatter = new Intl.NumberFormat('ko-KR');
  const formatted = formatter.format(amount);
  return includeSymbol ? `${formatted}원` : formatted;
}

/**
 * 숫자를 천 단위 콤마가 포함된 문자열로 변환
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ko-KR').format(num);
}

/**
 * 퍼센트 형식으로 포맷팅
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * 할인율 계산
 */
export function calculateDiscountRate(originalPrice: number, discountedPrice: number): number {
  if (originalPrice <= 0) return 0;
  return (originalPrice - discountedPrice) / originalPrice;
}

/**
 * 할인 금액 계산
 */
export function calculateDiscountAmount(
  originalPrice: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number,
  maxDiscount?: number
): number {
  let discountAmount = 0;

  if (discountType === 'percentage') {
    discountAmount = originalPrice * (discountValue / 100);
  } else {
    discountAmount = discountValue;
  }

  // 최대 할인 금액 제한
  if (maxDiscount && discountAmount > maxDiscount) {
    discountAmount = maxDiscount;
  }

  // 원본 가격을 초과할 수 없음
  if (discountAmount > originalPrice) {
    discountAmount = originalPrice;
  }

  return Math.round(discountAmount);
}

/**
 * 배달비 계산
 */
export function calculateDeliveryFee(
  basePrice: number,
  distance: number,
  additionalFeePerKm: number = 0,
  timeMultiplier: number = 1,
  weatherMultiplier: number = 1
): number {
  let fee = basePrice;

  // 거리별 추가 요금
  if (distance > 0 && additionalFeePerKm > 0) {
    fee += Math.ceil(distance) * additionalFeePerKm;
  }

  // 시간대/날씨 할증
  fee *= timeMultiplier * weatherMultiplier;

  return Math.round(fee);
}

/**
 * 팁 계산 (권장 팁 금액들)
 */
export function calculateTipOptions(orderAmount: number): number[] {
  const tipPercentages = [0.05, 0.1, 0.15, 0.2]; // 5%, 10%, 15%, 20%
  return tipPercentages.map(percentage => 
    Math.round(orderAmount * percentage / 100) * 100 // 100원 단위로 반올림
  );
}

/**
 * 플랫폼 수수료 계산
 */
export function calculatePlatformFee(amount: number, feeRate: number): number {
  return Math.round(amount * feeRate);
}

/**
 * 두 수가 같은지 부동소수점 오차를 고려하여 비교
 */
export function isEqual(a: number, b: number, tolerance: number = 0.01): boolean {
  return Math.abs(a - b) < tolerance;
}

/**
 * 숫자를 특정 범위 내로 제한
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 평균 계산
 */
export function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, num) => acc + num, 0);
  return sum / numbers.length;
}

/**
 * 평점을 별점 문자열로 변환 (예: 4.2 -> "★★★★☆")
 */
export function formatRatingStars(rating: number, maxStars: number = 5): string {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = maxStars - fullStars - halfStar;

  return '★'.repeat(fullStars) + 
         (halfStar ? '☆' : '') + 
         '☆'.repeat(emptyStars);
}

/**
 * 숫자를 단위와 함께 표시 (예: 1200 -> "1.2K")
 */
export function formatNumberWithUnit(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * 무작위 숫자 생성 (min 이상 max 미만)
 */
export function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * 거리 포맷팅 (미터/킬로미터)
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * 분을 시간:분 형식으로 변환 (예: 90 -> "1시간 30분")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}분`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}시간`;
  }
  
  return `${hours}시간 ${remainingMinutes}분`;
} 