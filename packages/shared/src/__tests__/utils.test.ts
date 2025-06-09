/**
 * 유틸리티 함수 테스트
 */

import { formatCurrency } from '../utils/number';
import { formatDate, formatTime } from '../utils/date';
import { isValidEmail, isValidKoreanPhone } from '../utils/validation';
import { generateUuid } from '../utils/crypto';
import { calculateDistance } from '../utils/location';

describe('Utils Tests', () => {
  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(12000)).toBe('12,000원');
      expect(formatCurrency(12000, false)).toBe('12,000');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date)).toBe('2024년 01월 15일');
    });
  });

  describe('formatTime', () => {
    it('should format time correctly', () => {
      const date = new Date('2024-01-15T14:30:00');
      expect(formatTime(date)).toBe('14:30');
    });
  });

  describe('isValidEmail', () => {
    it('should validate email correctly', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
    });
  });

  describe('isValidKoreanPhone', () => {
    it('should validate Korean phone correctly', () => {
      expect(isValidKoreanPhone('01012345678')).toBe(true);
      expect(isValidKoreanPhone('010-1234-5678')).toBe(true);
      expect(isValidKoreanPhone('02-1234-5678')).toBe(false);
    });
  });

  describe('generateUuid', () => {
    it('should generate valid UUID', () => {
      const uuid = generateUuid();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance correctly', () => {
      const seoul = { latitude: 37.5665, longitude: 126.9780 };
      const busan = { latitude: 35.1796, longitude: 129.0756 };
      const distance = calculateDistance(seoul, busan);
      
      // 서울-부산 거리는 약 325km
      expect(distance).toBeGreaterThan(300);
      expect(distance).toBeLessThan(350);
    });
  });
}); 