/**
 * utils.ts 단위 테스트
 * 
 * cn 유틸리티 함수의 동작을 검증합니다.
 * Tailwind CSS 클래스 병합 및 조건부 결합 로직을 테스트합니다.
 */

import { cn } from './utils'

describe('utils', () => {
  describe('cn function', () => {
    /**
     * 기본 기능 테스트
     */
    it('should combine basic class names', () => {
      // Given & When
      const result = cn('class1', 'class2', 'class3')

      // Then
      expect(result).toBe('class1 class2 class3')
    })

    /**
     * 조건부 클래스 테스트
     */
    it('should handle conditional classes with clsx', () => {
      // Given
      const isActive = true
      const isDisabled = false

      // When
      const result = cn('base-class', {
        'active-class': isActive,
        'disabled-class': isDisabled,
      })

      // Then
      expect(result).toBe('base-class active-class')
    })

    /**
     * Tailwind 클래스 병합 테스트
     */
    it('should merge conflicting Tailwind classes', () => {
      // Given: 같은 속성의 다른 값들
      const result1 = cn('text-red-500', 'text-blue-500')
      const result2 = cn('p-4', 'p-8')
      const result3 = cn('m-2', 'm-4')

      // When & Then: 마지막 클래스가 우선됨
      expect(result1).toBe('text-blue-500')
      expect(result2).toBe('p-8')
      expect(result3).toBe('m-4')
    })

    /**
     * 복합 케이스 테스트
     */
    it('should handle complex combinations with conditions and conflicts', () => {
      // Given
      const size = 'large'
      const isSelected = true
      const isHovered = false

      // When
      const result = cn(
        'base-class',
        'text-sm', // 기본 텍스트 크기
        'p-2', // 기본 패딩
        {
          'text-lg': size === 'large', // 큰 텍스트로 덮어쓰기
          'p-4': size === 'large', // 큰 패딩으로 덮어쓰기
          'bg-blue-500': isSelected,
          'hover:bg-gray-100': isHovered,
        }
      )

      // Then: 조건부 클래스가 기본 클래스를 덮어씀
      expect(result).toBe('base-class text-lg p-4 bg-blue-500')
    })

    /**
     * undefined 및 null 처리 테스트
     */
    it('should handle undefined and null values', () => {
      // Given & When
      const result = cn(
        'base-class',
        undefined,
        null,
        'valid-class',
        false && 'conditional-class'
      )

      // Then
      expect(result).toBe('base-class valid-class')
    })

    /**
     * 빈 값 처리 테스트
     */
    it('should handle empty values', () => {
      // Given & When
      const result = cn('', '  ', 'valid-class', '')

      // Then
      expect(result).toBe('valid-class')
    })

    /**
     * 배열 입력 테스트
     */
    it('should handle array inputs', () => {
      // Given & When
      const result = cn(['class1', 'class2'], 'class3', ['class4'])

      // Then
      expect(result).toBe('class1 class2 class3 class4')
    })

    /**
     * 중복 클래스 처리 테스트
     */
    it('should handle duplicate classes (clsx behavior)', () => {
      // Given & When
      const result = cn('duplicate-class', 'other-class', 'duplicate-class')

      // Then: clsx는 중복 클래스를 그대로 유지함
      expect(result).toBe('duplicate-class other-class duplicate-class')
    })

    /**
     * 복잡한 Tailwind 변형 테스트
     */
    it('should handle complex Tailwind variants', () => {
      // Given & When
      const result = cn(
        'hover:bg-red-500',
        'focus:bg-blue-500',
        'hover:bg-green-500', // 같은 variant의 다른 값
        'dark:text-white',
        'sm:text-lg',
        'md:text-xl'
      )

      // Then: hover variant는 마지막 것이 우선됨
      expect(result).toContain('hover:bg-green-500')
      expect(result).not.toContain('hover:bg-red-500')
      expect(result).toContain('focus:bg-blue-500')
      expect(result).toContain('dark:text-white')
      expect(result).toContain('sm:text-lg')
      expect(result).toContain('md:text-xl')
    })

    /**
     * 공백 문자 정규화 테스트
     */
    it('should normalize whitespace', () => {
      // Given & When
      const result = cn('  class1  ', '   class2   ', 'class3')

      // Then
      expect(result).toBe('class1 class2 class3')
      expect(result).not.toMatch(/\s{2,}/) // 연속된 공백이 없어야 함
    })

    /**
     * 인수 없음 테스트
     */
    it('should return empty string when no arguments provided', () => {
      // Given & When
      const result = cn()

      // Then
      expect(result).toBe('')
    })

    /**
     * 성능 테스트 (많은 클래스)
     */
    it('should handle many classes efficiently', () => {
      // Given
      const manyClasses = Array.from({ length: 100 }, (_, i) => `class-${i}`)
      
      // When
      const start = performance.now()
      const result = cn(...manyClasses)
      const end = performance.now()

      // Then
      expect(result).toContain('class-0')
      expect(result).toContain('class-99')
      expect(end - start).toBeLessThan(10) // 10ms 이하로 실행되어야 함
    })

    /**
     * 실제 사용 케이스 시뮬레이션
     */
    it('should work in realistic component scenarios', () => {
      // Given: 실제 컴포넌트에서 사용될 법한 시나리오들
      const isPrimary = true
      const isSecondary = false
      const isMedium = true
      const isLoading = false
      const isDisabled = true

      // When
      const buttonClasses = cn(
        // 기본 버튼 스타일
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        
        // 변형별 스타일
        {
          // Primary variant
          'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500': 
            isPrimary && !isDisabled,
          'bg-blue-300 text-white cursor-not-allowed': 
            isPrimary && isDisabled,
          
          // Secondary variant  
          'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500': 
            isSecondary && !isDisabled,
        },
        
        // 크기별 스타일
        {
          'h-8 px-3 text-sm': !isMedium,
          'h-10 px-4 text-base': isMedium,
          'h-12 px-6 text-lg': false,
        },
        
        // 로딩 상태
        isLoading && 'opacity-50 cursor-wait'
      )

      // Then
      expect(buttonClasses).toContain('inline-flex')
      expect(buttonClasses).toContain('bg-blue-300') // disabled primary
      expect(buttonClasses).toContain('h-10') // md size
      expect(buttonClasses).toContain('cursor-not-allowed')
      expect(buttonClasses).not.toContain('hover:bg-blue-700') // disabled이므로 hover 없음
    })
  })
}) 