'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

// 주문 아이템 타입
interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  options: string[];
}

// 배달 정보 타입
interface DeliveryInfo {
  address: string;
  addressDetail: string;
  phone: string;
  requests?: string;
}

// 결제 정보 타입
interface PaymentInfo {
  method: 'card' | 'cash' | 'digital';
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
}

/**
 * 주문 결제 페이지
 * 배달 정보 입력, 결제 수단 선택, 주문 확정 기능을 제공합니다.
 */
export default function CheckoutPage() {
  const router = useRouter();
  
  // 샘플 주문 데이터 (실제로는 장바구니에서 가져올 예정)
  const [orderItems] = useState<OrderItem[]>([
    {
      id: '1',
      name: '김치찌개',
      price: 8000,
      quantity: 1,
      options: ['보통맛', '공기밥 추가'],
    },
    {
      id: '2',
      name: '불고기',
      price: 15000,
      quantity: 1,
      options: ['대(2인분)'],
    },
  ]);

  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({
    address: '',
    addressDetail: '',
    phone: '',
    requests: '',
  });

  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    method: 'card',
  });

  const [isProcessing, setIsProcessing] = useState(false);

  // 가격 계산
  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = 3000;
  const total = subtotal + deliveryFee;

  // 주문 처리
  const handleOrder = async () => {
    setIsProcessing(true);
    
    // 유효성 검사
    if (!deliveryInfo.address || !deliveryInfo.phone) {
      alert('배달 정보를 모두 입력해주세요.');
      setIsProcessing(false);
      return;
    }

    if (paymentInfo.method === 'card' && (!paymentInfo.cardNumber || !paymentInfo.expiryDate || !paymentInfo.cvv)) {
      alert('카드 정보를 모두 입력해주세요.');
      setIsProcessing(false);
      return;
    }

    try {
      // 실제 주문 처리 로직 (API 호출)
      await new Promise(resolve => setTimeout(resolve, 2000)); // 시뮬레이션
      
      // 주문 완료 후 주문 추적 페이지로 이동
      const orderId = `ORDER_${Date.now()}`;
      router.push(`/order/${orderId}`);
    } catch (error) {
      alert('주문 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">주문하기</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 주문 정보 및 배달 정보 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 주문 상품 */}
            <Card>
              <CardHeader>
                <CardTitle>주문 상품</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderItems.map((item, index) => (
                    <div key={index} className="flex justify-between items-start border-b pb-4">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-600">수량: {item.quantity}</p>
                        {item.options.length > 0 && (
                          <p className="text-sm text-gray-500">옵션: {item.options.join(', ')}</p>
                        )}
                      </div>
                      <span className="font-medium">{(item.price * item.quantity).toLocaleString()}원</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 배달 정보 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>배달 정보</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    배달 주소 *
                  </label>
                  <input
                    type="text"
                    placeholder="도로명 주소를 입력하세요"
                    value={deliveryInfo.address}
                    onChange={(e) => setDeliveryInfo({...deliveryInfo, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    상세 주소
                  </label>
                  <input
                    type="text"
                    placeholder="동/호수 등 상세 주소"
                    value={deliveryInfo.addressDetail}
                    onChange={(e) => setDeliveryInfo({...deliveryInfo, addressDetail: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    연락처 *
                  </label>
                  <input
                    type="tel"
                    placeholder="휴대폰 번호를 입력하세요"
                    value={deliveryInfo.phone}
                    onChange={(e) => setDeliveryInfo({...deliveryInfo, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    배달 요청사항
                  </label>
                  <textarea
                    placeholder="문 앞에 놓아주세요, 벨 누르지 말아주세요 등"
                    value={deliveryInfo.requests}
                    onChange={(e) => setDeliveryInfo({...deliveryInfo, requests: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 결제 정보 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>결제 정보</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">결제 수단</label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={paymentInfo.method === 'card'}
                        onChange={(e) => setPaymentInfo({...paymentInfo, method: e.target.value as PaymentInfo['method']})}
                        className="w-4 h-4"
                      />
                      <span>신용/체크카드</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="digital"
                        checked={paymentInfo.method === 'digital'}
                        onChange={(e) => setPaymentInfo({...paymentInfo, method: e.target.value as PaymentInfo['method']})}
                        className="w-4 h-4"
                      />
                      <span>간편결제 (카카오페이, 네이버페이)</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cash"
                        checked={paymentInfo.method === 'cash'}
                        onChange={(e) => setPaymentInfo({...paymentInfo, method: e.target.value as PaymentInfo['method']})}
                        className="w-4 h-4"
                      />
                      <span>현금 결제</span>
                    </label>
                  </div>
                </div>

                {paymentInfo.method === 'card' && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">카드 번호</label>
                      <input
                        type="text"
                        placeholder="1234-5678-9012-3456"
                        value={paymentInfo.cardNumber || ''}
                        onChange={(e) => setPaymentInfo({...paymentInfo, cardNumber: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">유효기간</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={paymentInfo.expiryDate || ''}
                          onChange={(e) => setPaymentInfo({...paymentInfo, expiryDate: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                        <input
                          type="text"
                          placeholder="123"
                          value={paymentInfo.cvv || ''}
                          onChange={(e) => setPaymentInfo({...paymentInfo, cvv: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 주문 요약 */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card>
                <CardHeader>
                  <CardTitle>주문 요약</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>상품 금액</span>
                    <span>{subtotal.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span>배달비</span>
                    <span>{deliveryFee.toLocaleString()}원</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>총 결제 금액</span>
                      <span className="text-orange-600">{total.toLocaleString()}원</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>예상 배달 시간: 25-35분</span>
                    </div>
                  </div>

                  <Button 
                    onClick={handleOrder}
                    disabled={isProcessing}
                    className="w-full mt-6"
                  >
                    {isProcessing ? '주문 처리 중...' : `${total.toLocaleString()}원 결제하기`}
                  </Button>
                  
                  <p className="text-xs text-gray-500 text-center mt-4">
                    주문 완료 후 취소/변경이 어려우니 신중히 주문해주세요.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 