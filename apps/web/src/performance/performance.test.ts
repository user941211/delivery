/**
 * 프론트엔드 성능 테스트
 * 
 * React 컴포넌트 렌더링 성능, 리렌더링 최적화, 메모리 사용량을 측정합니다.
 * 외부 API 호출 없이 순수 컴포넌트 성능만 측정합니다.
 */

import React from 'react'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'

describe('Frontend Performance Tests', () => {
  /**
   * 컴포넌트 렌더링 성능 테스트
   */
  describe('Component Rendering Performance', () => {
    it('should render Button component within acceptable time', () => {
      // Given
      const maxRenderTime = 5
      const startTime = performance.now()

      // When
      render(<Button>Test Button</Button>)

      // Then
      const renderTime = performance.now() - startTime
      expect(renderTime).toBeLessThan(maxRenderTime)
    })

    it('should render multiple buttons efficiently', () => {
      // Given
      const buttonCount = 50
      const maxRenderTime = 50
      const startTime = performance.now()

      // When
      render(
        <div>
          {Array.from({ length: buttonCount }, (_, i) => (
            <Button key={i} variant={i % 2 === 0 ? 'default' : 'outline'}>
              Button {i}
            </Button>
          ))}
        </div>
      )

      // Then
      const renderTime = performance.now() - startTime
      expect(renderTime).toBeLessThan(maxRenderTime)
    })

    it('should handle dynamic prop changes efficiently', () => {
      // Given
      const maxReRenderTime = 10
      const { rerender } = render(<Button variant="default">Original</Button>)
      
      // When
      const startTime = performance.now()
      rerender(<Button variant="destructive">Updated</Button>)
      const reRenderTime = performance.now() - startTime

      // Then
      expect(reRenderTime).toBeLessThan(maxReRenderTime)
    })
  })

  /**
   * 사용자 상호작용 성능 테스트
   */
  describe('User Interaction Performance', () => {
    it('should handle click events quickly', async () => {
      // Given
      const user = userEvent.setup()
      const maxEventTime = 5
      let clickTime = 0
      
      const handleClick = () => {
        clickTime = performance.now()
      }

      render(<Button onClick={handleClick}>Click Me</Button>)
      const button = screen.getByRole('button')

      // When
      const startTime = performance.now()
      await user.click(button)
      
      // Then
      const eventHandlingTime = clickTime - startTime
      expect(eventHandlingTime).toBeLessThan(maxEventTime)
    })

    it('should handle rapid successive clicks efficiently', async () => {
      // Given
      const user = userEvent.setup()
      const clickCount = 10
      const maxTotalTime = 50
      let lastClickTime = 0
      
      const handleClick = () => {
        lastClickTime = performance.now()
      }

      render(<Button onClick={handleClick}>Rapid Click</Button>)
      const button = screen.getByRole('button')

      // When
      const startTime = performance.now()
      
      for (let i = 0; i < clickCount; i++) {
        await user.click(button)
      }
      
      // Then
      const totalTime = lastClickTime - startTime
      expect(totalTime).toBeLessThan(maxTotalTime)
    })
  })

  /**
   * 유틸리티 함수 성능 테스트
   */
  describe('Utility Function Performance', () => {
    it('should merge classes efficiently with cn function', () => {
      // Given
      const classCount = 20
      const maxMergeTime = 1
      const classNames = Array.from({ length: classCount }, (_, i) => `class-${i}`)
      
      // When
      const startTime = performance.now()
      const result = cn(...classNames)
      const mergeTime = performance.now() - startTime

      // Then
      expect(mergeTime).toBeLessThan(maxMergeTime)
      expect(result).toContain('class-0')
      expect(result).toContain('class-19')
    })

    it('should handle complex class merging efficiently', () => {
      // Given
      const maxMergeTime = 2
      const complexClasses = [
        'base-class',
        'text-sm hover:text-lg',
        'p-2 md:p-4',
        { 'active-class': true, 'inactive-class': false },
        'focus:ring-2 focus:ring-blue-500',
        ['array-class-1', 'array-class-2'],
        'final-class'
      ]

      // When
      const startTime = performance.now()
      const result = cn(...complexClasses)
      const mergeTime = performance.now() - startTime

      // Then
      expect(mergeTime).toBeLessThan(maxMergeTime)
      expect(typeof result).toBe('string')
    })

    it('should maintain performance with repeated calls', () => {
      // Given
      const callCount = 100
      const maxAverageTime = 0.5
      const times: number[] = []

      // When
      for (let i = 0; i < callCount; i++) {
        const startTime = performance.now()
        cn('base', { active: i % 2 === 0 }, `dynamic-${i}`)
        times.push(performance.now() - startTime)
      }

      // Then
      const averageTime = times.reduce((a, b) => a + b, 0) / times.length
      expect(averageTime).toBeLessThan(maxAverageTime)
    })
  })

  /**
   * 메모리 사용량 테스트
   */
  describe('Memory Usage Performance', () => {
    it('should not create memory leaks during component mounting/unmounting', () => {
      // Given
      const mountCount = 20
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0

      // When
      for (let i = 0; i < mountCount; i++) {
        const { unmount } = render(
          <Button variant="default">Memory Test {i}</Button>
        )
        unmount()
      }

      // Then
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      // 메모리 증가량이 합리적인 범위 내에 있어야 함
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowth = finalMemory - initialMemory
        expect(memoryGrowth).toBeLessThan(1024 * 1024)
      }
    })

    it('should handle large component trees efficiently', () => {
      // Given
      const componentCount = 100
      const maxRenderTime = 100

      // When
      const startTime = performance.now()
      
      const { unmount } = render(
        <div>
          {Array.from({ length: componentCount }, (_, i) => (
            <div key={i}>
              <Button size="sm">Button {i}</Button>
              <span>Text {i}</span>
            </div>
          ))}
        </div>
      )

      const renderTime = performance.now() - startTime

      // Then
      expect(renderTime).toBeLessThan(maxRenderTime)
      
      // Cleanup
      unmount()
    })
  })

  /**
   * 리렌더링 최적화 테스트
   */
  describe('Re-rendering Optimization', () => {
    it('should minimize unnecessary re-renders', () => {
      // Given
      let renderCount = 0
      
      const TestComponent = React.memo(({ value }: { value: string }) => {
        renderCount++
        return <Button>{value}</Button>
      })

      const { rerender } = render(<TestComponent value="initial" />)

      // When - 같은 props로 리렌더링
      rerender(<TestComponent value="initial" />)
      rerender(<TestComponent value="initial" />)

      // Then - 불필요한 리렌더링이 발생하지 않아야 함
      expect(renderCount).toBe(1)

      // When - 다른 props로 리렌더링
      rerender(<TestComponent value="changed" />)

      // Then - 필요한 리렌더링만 발생해야 함
      expect(renderCount).toBe(2)
    })

    it('should handle prop updates efficiently', () => {
      // Given
      const maxUpdateTime = 5
      const { rerender } = render(<Button variant="default">Original</Button>)

      const updates = [
        { variant: 'destructive' as const, children: 'Updated 1' },
        { variant: 'outline' as const, children: 'Updated 2' },
        { variant: 'secondary' as const, children: 'Updated 3' },
        { variant: 'ghost' as const, children: 'Updated 4' },
      ]

      // When
      updates.forEach(props => {
        const startTime = performance.now()
        rerender(<Button {...props} />)
        const updateTime = performance.now() - startTime
        
        // Then
        expect(updateTime).toBeLessThan(maxUpdateTime)
      })
    })
  })

  /**
   * 배치 업데이트 성능 테스트
   */
  describe('Batch Update Performance', () => {
    it('should handle multiple state updates efficiently', async () => {
      // Given
      const TestComponent = () => {
        const [count, setCount] = React.useState(0)
        const [text, setText] = React.useState('initial')
        
        const handleBatchUpdate = () => {
          // React 18의 자동 배치 기능 테스트
          setCount(prev => prev + 1)
          setText('updated')
        }

        return (
          <div>
            <Button onClick={handleBatchUpdate}>
              Count: {count}, Text: {text}
            </Button>
          </div>
        )
      }

      const user = userEvent.setup()
      render(<TestComponent />)
      const button = screen.getByRole('button')

      // When
      const startTime = performance.now()
      
      await act(async () => {
        await user.click(button)
      })
      
      const updateTime = performance.now() - startTime

      // Then
      expect(updateTime).toBeLessThan(10)
      expect(button).toHaveTextContent('Count: 1, Text: updated')
    })
  })
}) 