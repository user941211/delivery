import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind CSS 클래스들을 조건부로 결합하고 중복을 제거하는 유틸리티 함수
 * clsx로 조건부 클래스를 처리하고, tailwind-merge로 중복된 클래스를 제거합니다.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
} 