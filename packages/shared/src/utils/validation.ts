/**
 * 유효성 검사 관련 유틸리티 함수
 */

/**
 * 이메일 주소 유효성 검사
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 한국 휴대폰 번호 유효성 검사
 */
export function isValidKoreanPhone(phone: string): boolean {
  const phoneRegex = /^01[016789]\d{7,8}$/;
  const cleanPhone = phone.replace(/[^\d]/g, '');
  return phoneRegex.test(cleanPhone);
}

/**
 * 한국 일반전화 번호 유효성 검사
 */
export function isValidKoreanLandline(phone: string): boolean {
  const landlineRegex = /^0[2-6][1-5]?\d{6,8}$/;
  const cleanPhone = phone.replace(/[^\d]/g, '');
  return landlineRegex.test(cleanPhone);
}

/**
 * 비밀번호 강도 검사
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
} {
  const errors: string[] = [];
  let score = 0;

  // 최소 길이 검사
  if (password.length < 8) {
    errors.push('비밀번호는 최소 8자 이상이어야 합니다.');
  } else {
    score += 1;
  }

  // 대문자 포함 검사
  if (!/[A-Z]/.test(password)) {
    errors.push('대문자를 포함해야 합니다.');
  } else {
    score += 1;
  }

  // 소문자 포함 검사
  if (!/[a-z]/.test(password)) {
    errors.push('소문자를 포함해야 합니다.');
  } else {
    score += 1;
  }

  // 숫자 포함 검사
  if (!/\d/.test(password)) {
    errors.push('숫자를 포함해야 합니다.');
  } else {
    score += 1;
  }

  // 특수문자 포함 검사
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('특수문자를 포함해야 합니다.');
  } else {
    score += 1;
  }

  // 강도 계산
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (score >= 4) {
    strength = 'strong';
  } else if (score >= 2) {
    strength = 'medium';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength
  };
}

/**
 * 사업자등록번호 유효성 검사
 */
export function isValidBusinessNumber(businessNumber: string): boolean {
  const cleanNumber = businessNumber.replace(/[^\d]/g, '');
  
  if (cleanNumber.length !== 10) {
    return false;
  }

  // 체크섬 알고리즘
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanNumber[i]) * weights[i];
  }

  sum += Math.floor((parseInt(cleanNumber[8]) * 5) / 10);
  const checkDigit = (10 - (sum % 10)) % 10;

  return checkDigit === parseInt(cleanNumber[9]);
}

/**
 * 주민등록번호 유효성 검사 (개인정보 보호를 위해 기본적인 형식만 검사)
 */
export function isValidResidentNumber(residentNumber: string): boolean {
  const cleanNumber = residentNumber.replace(/[^\d]/g, '');
  
  if (cleanNumber.length !== 13) {
    return false;
  }

  // 생년월일 검사
  const year = parseInt(cleanNumber.substr(0, 2));
  const month = parseInt(cleanNumber.substr(2, 2));
  const day = parseInt(cleanNumber.substr(4, 2));

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // 성별 검사
  const genderCode = parseInt(cleanNumber[6]);
  if (genderCode < 1 || genderCode > 4) return false;

  return true;
}

/**
 * 우편번호 유효성 검사 (한국 5자리)
 */
export function isValidKoreanZipCode(zipCode: string): boolean {
  const zipRegex = /^\d{5}$/;
  return zipRegex.test(zipCode);
}

/**
 * 신용카드 번호 유효성 검사 (Luhn 알고리즘)
 */
export function isValidCreditCard(cardNumber: string): boolean {
  const cleanNumber = cardNumber.replace(/[^\d]/g, '');
  
  if (cleanNumber.length < 13 || cleanNumber.length > 19) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * URL 유효성 검사
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 나이 유효성 검사
 */
export function isValidAge(age: number): boolean {
  return age >= 0 && age <= 150;
}

/**
 * 가격 유효성 검사
 */
export function isValidPrice(price: number): boolean {
  return price >= 0 && price <= 10000000; // 최대 1천만원
}

/**
 * 한국어 이름 유효성 검사
 */
export function isValidKoreanName(name: string): boolean {
  const koreanNameRegex = /^[가-힣]{2,4}$/;
  return koreanNameRegex.test(name);
}

/**
 * 영문 이름 유효성 검사
 */
export function isValidEnglishName(name: string): boolean {
  const englishNameRegex = /^[a-zA-Z\s]{2,50}$/;
  return englishNameRegex.test(name);
}

/**
 * 파일 확장자 유효성 검사
 */
export function isValidFileExtension(filename: string, allowedExtensions: string[]): boolean {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (!extension) return false;
  return allowedExtensions.includes(extension);
}

/**
 * 파일 크기 유효성 검사
 */
export function isValidFileSize(fileSize: number, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return fileSize <= maxSizeInBytes;
} 