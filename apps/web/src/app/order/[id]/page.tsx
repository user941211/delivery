'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Phone, MapPin, Clock, CheckCircle, Circle, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

// 주문 상태 타입
type OrderStatus = 'confirmed' | 'preparing' | 'cooking' | 'ready' | 'pickup' | 'delivering' | 'delivered';

// 주문 정보 타입
interface OrderInfo {
  id: string;
  status: OrderStatus;
  createdAt: string;
  estimatedDeliveryTime: string;
  restaurant: {
    name: string;
    phone: string;
    address: string;
  };
  delivery: {
    address: string;
    phone: string;
    requests?: string;
  };
  items: {
    name: string;
    quantity: number;
    price: number;
    options: string[];
  }[];
  payment: {
    method: string;
    amount: number;
    deliveryFee: number;
  };
  driver?: {
    name: string;
    phone: string;
    vehicle: string;
  };
}

// 주문 상태 단계 정의
const orderSteps = [
  { key: 'confirmed' as OrderStatus, label: '주문 확인', description: '주문이 접수되었습니다' },
  { key: 'preparing' as OrderStatus, label: '조리 준비', description: '음식점에서 조리를 준비 중입니다' },
  { key: 'cooking' as OrderStatus, label: '조리 중', description: '맛있는 음식을 조리하고 있습니다' },
  { key: 'ready' as OrderStatus, label: '조리 완료', description: '음식 조리가 완료되었습니다' },
  { key: 'pickup' as OrderStatus, label: '픽업 완료', description: '배달 기사가 음식을 픽업했습니다' },
  { key: 'delivering' as OrderStatus, label: '배달 중', description: '배달 기사가 배달 중입니다' },
  { key: 'delivered' as OrderStatus, label: '배달 완료', description: '음식이 배달되었습니다' },
];

/**
 * 주문 추적 페이지
 * 실시간 주문 상태 추적 및 배달 정보를 제공합니다.
 */
export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params.id as string;
  
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 샘플 주문 데이터 (실제로는 API에서 가져올 예정)
  useEffect(() => {
    const sampleOrder: OrderInfo = {
      id: orderId,
      status: 'delivering',
      createdAt: '2024-01-15T18:30:00Z',
      estimatedDeliveryTime: '2024-01-15T19:05:00Z',
      restaurant: {
        name: '맛있는 한식당',
        phone: '02-1234-5678',
        address: '서울시 강남구 테헤란로 123',
      },
      delivery: {
        address: '서울시 강남구 역삼동 456-78',
        phone: '010-1234-5678',
        requests: '문 앞에 놓아주세요',
      },
      items: [
        {
          name: '김치찌개',
          quantity: 1,
          price: 8000,
          options: ['보통맛', '공기밥 추가'],
        },
        {
          name: '불고기',
          quantity: 1,
          price: 15000,
          options: ['대(2인분)'],
        },
      ],
      payment: {
        method: '신용카드',
        amount: 23000,
        deliveryFee: 3000,
      },
      driver: {
        name: '김배달',
        phone: '010-9876-5432',
        vehicle: '오토바이',
      },
    };

    setOrderInfo(sampleOrder);
  }, [orderId]);

  // 실시간 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 주문 상태 업데이트 시뮬레이션 (실제로는 WebSocket이나 Server-Sent Events 사용)
  useEffect(() => {
    if (!orderInfo) return;

    const statusProgression: OrderStatus[] = ['confirmed', 'preparing', 'cooking', 'ready', 'pickup', 'delivering', 'delivered'];
    const currentIndex = statusProgression.indexOf(orderInfo.status);
    
    if (currentIndex < statusProgression.length - 1) {
      const timer = setTimeout(() => {
        setOrderInfo(prev => prev ? {
          ...prev,
          status: statusProgression[currentIndex + 1]
        } : null);
      }, 10000); // 10초마다 상태 변경 (데모용)

      return () => clearTimeout(timer);
    }
  }, [orderInfo?.status]);

  // 현재 단계 찾기
  const getCurrentStepIndex = (status: OrderStatus) => {
    return orderSteps.findIndex(step => step.key === status);
  };

  // 시간 포맷팅
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 예상 배달 시간까지 남은 시간 계산
  const getTimeRemaining = () => {
    if (!orderInfo) return '';
    
    const estimatedTime = new Date(orderInfo.estimatedDeliveryTime);
    const diff = estimatedTime.getTime() - currentTime.getTime();
    
    if (diff <= 0) return '곧 도착 예정';
    
    const minutes = Math.floor(diff / (1000 * 60));
    return `약 ${minutes}분 후 도착 예정`;
  };

  if (!orderInfo) {
    return <div className="flex items-center justify-center min-h-screen">로딩 중...</div>;
  }

  const currentStepIndex = getCurrentStepIndex(orderInfo.status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">주문 추적</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 주문 상태 요약 */}
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {orderSteps[currentStepIndex]?.label || '주문 진행 중'}
                </h2>
                <p className="text-gray-600 mb-4">
                  {orderSteps[currentStepIndex]?.description || '주문이 처리되고 있습니다'}
                </p>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-center space-x-2 text-orange-600">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">{getTimeRemaining()}</span>
                  </div>
                  <p className="text-sm text-orange-600 mt-1">
                    예상 배달 시간: {formatTime(orderInfo.estimatedDeliveryTime)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 주문 진행 상태 */}
          <Card>
            <CardHeader>
              <CardTitle>주문 진행 상태</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orderSteps.map((step, index) => {
                  const isCompleted = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  
                  return (
                    <div key={step.key} className="flex items-start space-x-4">
                      <div className="flex-shrink-0 mt-1">
                        {isCompleted ? (
                          <CheckCircle className={`h-6 w-6 ${isCurrent ? 'text-orange-500' : 'text-green-500'}`} />
                        ) : (
                          <Circle className="h-6 w-6 text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-medium ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                          {step.label}
                        </h3>
                        <p className={`text-sm ${isCompleted ? 'text-gray-600' : 'text-gray-400'}`}>
                          {step.description}
                        </p>
                        {isCurrent && (
                          <p className="text-xs text-orange-600 mt-1">진행 중</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 배달 기사 정보 (배달 시작 후 표시) */}
          {orderInfo.driver && orderInfo.status === 'delivering' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Truck className="h-5 w-5" />
                  <span>배달 기사 정보</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{orderInfo.driver.name}</h3>
                    <p className="text-sm text-gray-600">{orderInfo.driver.vehicle}</p>
                  </div>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Phone className="h-4 w-4" />
                    <span>연락하기</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 주문 정보 */}
            <Card>
              <CardHeader>
                <CardTitle>주문 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">주문 번호</h4>
                  <p className="text-sm text-gray-600">{orderInfo.id}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">주문 시간</h4>
                  <p className="text-sm text-gray-600">{formatTime(orderInfo.createdAt)}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">주문 내역</h4>
                  <div className="space-y-2">
                    {orderInfo.items.map((item, index) => (
                      <div key={index} className="text-sm">
                        <div className="flex justify-between">
                          <span>{item.name} x{item.quantity}</span>
                          <span>{(item.price * item.quantity).toLocaleString()}원</span>
                        </div>
                        {item.options.length > 0 && (
                          <p className="text-xs text-gray-500 ml-2">
                            옵션: {item.options.join(', ')}
                          </p>
                        )}
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between text-sm">
                        <span>배달비</span>
                        <span>{orderInfo.payment.deliveryFee.toLocaleString()}원</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>총 결제금액</span>
                        <span>{(orderInfo.payment.amount + orderInfo.payment.deliveryFee).toLocaleString()}원</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">결제 방법</h4>
                  <p className="text-sm text-gray-600">{orderInfo.payment.method}</p>
                </div>
              </CardContent>
            </Card>

            {/* 배달 정보 */}
            <Card>
              <CardHeader>
                <CardTitle>배달 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">음식점</h4>
                  <p className="text-sm text-gray-600">{orderInfo.restaurant.name}</p>
                  <p className="text-xs text-gray-500">{orderInfo.restaurant.address}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">배달 주소</h4>
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">{orderInfo.delivery.address}</p>
                      <p className="text-xs text-gray-500">{orderInfo.delivery.phone}</p>
                    </div>
                  </div>
                </div>

                {orderInfo.delivery.requests && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">배달 요청사항</h4>
                    <p className="text-sm text-gray-600">{orderInfo.delivery.requests}</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Button variant="outline" className="w-full flex items-center space-x-2">
                    <Phone className="h-4 w-4" />
                    <span>음식점 연락하기</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 주문 완료 후 리뷰 작성 버튼 */}
          {orderInfo.status === 'delivered' && (
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  맛있게 드셨나요?
                </h3>
                <p className="text-gray-600 mb-4">
                  음식과 배달 서비스는 어떠셨는지 알려주세요!
                </p>
                <Button className="w-full md:w-auto">
                  리뷰 작성하기
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 