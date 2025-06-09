'use client';

import { useState, useEffect } from 'react';
import { 
  Bell, 
  DollarSign, 
  Package, 
  Users, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  Menu,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

// 주문 상태 타입
type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed';

// 주문 정보 타입
interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  items: string[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  estimatedTime: number; // 분 단위
}

// 매출 통계 타입
interface SalesStats {
  todayRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  todayOrders: number;
  weeklyOrders: number;
  monthlyOrders: number;
}

// 레스토랑 정보 타입
interface RestaurantInfo {
  name: string;
  status: 'open' | 'closed';
  rating: number;
  totalReviews: number;
}

/**
 * 점주용 레스토랑 관리 대시보드 메인 페이지
 * 매출 현황, 주문 관리, 통계를 한눈에 볼 수 있습니다.
 */
export default function OwnerDashboardPage() {
  const [currentOrders, setCurrentOrders] = useState<Order[]>([]);
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null);
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 샘플 데이터 로드
  useEffect(() => {
    // 샘플 주문 데이터
    const sampleOrders: Order[] = [
      {
        id: '1',
        orderNumber: 'ORD-001',
        customerName: '김고객',
        items: ['김치찌개', '공기밥'],
        total: 9000,
        status: 'pending',
        createdAt: new Date().toISOString(),
        estimatedTime: 25,
      },
      {
        id: '2',
        orderNumber: 'ORD-002',
        customerName: '이고객',
        items: ['불고기', '된장찌개'],
        total: 18000,
        status: 'confirmed',
        createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
        estimatedTime: 30,
      },
      {
        id: '3',
        orderNumber: 'ORD-003',
        customerName: '박고객',
        items: ['비빔밥', '미역국'],
        total: 12000,
        status: 'preparing',
        createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
        estimatedTime: 20,
      },
      {
        id: '4',
        orderNumber: 'ORD-004',
        customerName: '최고객',
        items: ['갈비탕', '공기밥'],
        total: 15000,
        status: 'ready',
        createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
        estimatedTime: 25,
      },
    ];

    // 샘플 매출 통계
    const sampleStats: SalesStats = {
      todayRevenue: 245000,
      weeklyRevenue: 1890000,
      monthlyRevenue: 7560000,
      todayOrders: 28,
      weeklyOrders: 156,
      monthlyOrders: 634,
    };

    // 샘플 레스토랑 정보
    const sampleRestaurant: RestaurantInfo = {
      name: '맛있는 한식당',
      status: 'open',
      rating: 4.5,
      totalReviews: 234,
    };

    setCurrentOrders(sampleOrders);
    setSalesStats(sampleStats);
    setRestaurantInfo(sampleRestaurant);
  }, []);

  // 실시간 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 주문 상태 업데이트
  const updateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setCurrentOrders(prev => 
      prev.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };

  // 주문 상태별 스타일
  const getStatusStyle = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'preparing':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // 주문 상태별 한글 라벨
  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return '접수 대기';
      case 'confirmed':
        return '접수 완료';
      case 'preparing':
        return '조리 중';
      case 'ready':
        return '조리 완료';
      case 'completed':
        return '배달 완료';
      default:
        return '알 수 없음';
    }
  };

  // 시간 포맷팅
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return '방금 전';
    if (diffMinutes < 60) return `${diffMinutes}분 전`;
    
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!salesStats || !restaurantInfo) {
    return <div className="flex items-center justify-center min-h-screen">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">{restaurantInfo.name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                restaurantInfo.status === 'open' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {restaurantInfo.status === 'open' ? '영업중' : '영업종료'}
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                평점: ⭐ {restaurantInfo.rating} ({restaurantInfo.totalReviews}개)
              </div>
              <Button variant="outline" className="flex items-center space-x-2">
                <Bell className="h-4 w-4" />
                <span>알림</span>
              </Button>
              <Button variant="outline" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>설정</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">오늘 매출</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {salesStats.todayRevenue.toLocaleString()}원
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">오늘 주문</p>
                  <p className="text-2xl font-bold text-gray-900">{salesStats.todayOrders}건</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">이번 주 매출</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {salesStats.weeklyRevenue.toLocaleString()}원
                  </p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">이번 주 주문</p>
                  <p className="text-2xl font-bold text-gray-900">{salesStats.weeklyOrders}건</p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 실시간 주문 관리 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>실시간 주문 관리</span>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      전체 주문
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentOrders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-gray-900">#{order.orderNumber}</h3>
                          <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getStatusStyle(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{order.total.toLocaleString()}원</p>
                          <p className="text-xs text-gray-500">{formatTime(order.createdAt)}</p>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm text-gray-600">고객: {order.customerName}</p>
                        <p className="text-sm text-gray-600">메뉴: {order.items.join(', ')}</p>
                        <p className="text-sm text-gray-600">예상 조리시간: {order.estimatedTime}분</p>
                      </div>

                      <div className="flex space-x-2">
                        {order.status === 'pending' && (
                          <Button 
                            size="sm" 
                            onClick={() => updateOrderStatus(order.id, 'confirmed')}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            주문 접수
                          </Button>
                        )}
                        {order.status === 'confirmed' && (
                          <Button 
                            size="sm" 
                            onClick={() => updateOrderStatus(order.id, 'preparing')}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            조리 시작
                          </Button>
                        )}
                        {order.status === 'preparing' && (
                          <Button 
                            size="sm" 
                            onClick={() => updateOrderStatus(order.id, 'ready')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            조리 완료
                          </Button>
                        )}
                        {order.status === 'ready' && (
                          <Button 
                            size="sm" 
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            variant="outline"
                          >
                            픽업 완료
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          상세보기
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 사이드바 - 빠른 액션 및 알림 */}
          <div className="space-y-6">
            {/* 빠른 액션 */}
            <Card>
              <CardHeader>
                <CardTitle>빠른 액션</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/owner/menu">
                  <Button variant="outline" className="w-full justify-start">
                    <Menu className="h-4 w-4 mr-2" />
                    메뉴 관리
                  </Button>
                </Link>
                <Link href="/owner/analytics">
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    매출 분석
                  </Button>
                </Link>
                <Link href="/owner/settings">
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    레스토랑 설정
                  </Button>
                </Link>
                <Button 
                  variant={restaurantInfo.status === 'open' ? 'destructive' : 'default'}
                  className="w-full"
                  onClick={() => {
                    setRestaurantInfo(prev => prev ? {
                      ...prev,
                      status: prev.status === 'open' ? 'closed' : 'open'
                    } : null);
                  }}
                >
                  {restaurantInfo.status === 'open' ? '영업 종료' : '영업 시작'}
                </Button>
              </CardContent>
            </Card>

            {/* 알림 및 상태 */}
            <Card>
              <CardHeader>
                <CardTitle>알림</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">새로운 주문</p>
                      <p className="text-xs text-gray-500">3건의 새로운 주문이 접수되었습니다</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">일일 목표 달성</p>
                      <p className="text-xs text-gray-500">오늘 매출 목표를 달성했습니다!</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">조리 시간 알림</p>
                      <p className="text-xs text-gray-500">평균 조리 시간이 예상보다 5분 길어졌습니다</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 오늘의 요약 */}
            <Card>
              <CardHeader>
                <CardTitle>오늘의 요약</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">영업 시작</span>
                    <span className="font-medium">09:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">총 주문</span>
                    <span className="font-medium">{salesStats.todayOrders}건</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">평균 주문 금액</span>
                    <span className="font-medium">
                      {Math.round(salesStats.todayRevenue / salesStats.todayOrders).toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">인기 메뉴</span>
                    <span className="font-medium">김치찌개</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 