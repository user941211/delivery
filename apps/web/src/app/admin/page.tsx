'use client';

import { useState } from 'react';
import { 
  Users, 
  Store, 
  ShoppingBag, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Eye,
  Edit,
  Trash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// 관리자 통계 타입
interface AdminStats {
  totalUsers: number;
  totalRestaurants: number;
  totalOrders: number;
  totalRevenue: number;
  pendingRestaurants: number;
  activeUsers: number;
}

// 레스토랑 승인 대기 타입
interface PendingRestaurant {
  id: string;
  name: string;
  ownerName: string;
  address: string;
  phone: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

// 사용자 관리 타입
interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'owner' | 'driver';
  status: 'active' | 'suspended';
  joinedAt: string;
  lastActive: string;
}

/**
 * 관리자용 플랫폼 관리 대시보드
 * 전체 플랫폼 운영 현황을 관리합니다.
 */
export default function AdminDashboardPage() {
  // 샘플 데이터
  const [stats] = useState<AdminStats>({
    totalUsers: 15234,
    totalRestaurants: 1567,
    totalOrders: 89432,
    totalRevenue: 2387650000,
    pendingRestaurants: 23,
    activeUsers: 8934,
  });

  const [pendingRestaurants] = useState<PendingRestaurant[]>([
    {
      id: '1',
      name: '새로운 치킨집',
      ownerName: '김사장',
      address: '서울시 강남구 테헤란로 456',
      phone: '02-1234-5678',
      submittedAt: '2024-01-15T09:30:00Z',
      status: 'pending',
    },
    {
      id: '2',
      name: '맛있는 피자',
      ownerName: '이점주',
      address: '서울시 서초구 서초대로 789',
      phone: '02-2345-6789',
      submittedAt: '2024-01-14T14:20:00Z',
      status: 'pending',
    },
  ]);

  const [users] = useState<User[]>([
    {
      id: '1',
      name: '김고객',
      email: 'customer@example.com',
      role: 'customer',
      status: 'active',
      joinedAt: '2024-01-01T00:00:00Z',
      lastActive: '2024-01-15T18:30:00Z',
    },
    {
      id: '2',
      name: '박점주',
      email: 'owner@example.com',
      role: 'owner',
      status: 'active',
      joinedAt: '2024-01-05T00:00:00Z',
      lastActive: '2024-01-15T16:45:00Z',
    },
    {
      id: '3',
      name: '이배달',
      email: 'driver@example.com',
      role: 'driver',
      status: 'suspended',
      joinedAt: '2024-01-10T00:00:00Z',
      lastActive: '2024-01-14T12:20:00Z',
    },
  ]);

  // 레스토랑 승인/거부
  const handleRestaurantAction = (id: string, action: 'approve' | 'reject') => {
    console.log(`Restaurant ${id} ${action}ed`);
    // 실제로는 API 호출
  };

  // 사용자 상태 변경
  const handleUserAction = (id: string, action: 'suspend' | 'activate') => {
    console.log(`User ${id} ${action}ed`);
    // 실제로는 API 호출
  };

  // 시간 포맷팅
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  // 역할별 한글 라벨
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'customer': return '고객';
      case 'owner': return '점주';
      case 'driver': return '배달기사';
      default: return '알 수 없음';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">플랫폼 관리자</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">마지막 업데이트: 방금 전</span>
              <Button variant="outline">시스템 설정</Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* 플랫폼 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">총 사용자</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalUsers.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600">활성 사용자: {stats.activeUsers.toLocaleString()}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">등록 레스토랑</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalRestaurants.toLocaleString()}
                  </p>
                  <p className="text-xs text-yellow-600">승인 대기: {stats.pendingRestaurants}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Store className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">총 주문</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalOrders.toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-600">이번 달: +12.5%</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">총 매출</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(stats.totalRevenue / 100000000).toFixed(1)}억원
                  </p>
                  <p className="text-xs text-green-600">전월 대비: +8.3%</p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 레스토랑 승인 대기 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>레스토랑 승인 대기</span>
                <span className="text-sm font-normal text-gray-500">
                  {pendingRestaurants.length}건 대기 중
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingRestaurants.map((restaurant) => (
                  <div key={restaurant.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{restaurant.name}</h3>
                        <p className="text-sm text-gray-600">점주: {restaurant.ownerName}</p>
                        <p className="text-sm text-gray-600">{restaurant.address}</p>
                        <p className="text-sm text-gray-600">{restaurant.phone}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDate(restaurant.submittedAt)}
                      </span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleRestaurantAction(restaurant.id, 'approve')}
                        className="bg-green-600 hover:bg-green-700 flex items-center space-x-1"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>승인</span>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleRestaurantAction(restaurant.id, 'reject')}
                        className="flex items-center space-x-1"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>거부</span>
                      </Button>
                      <Button variant="outline" size="sm" className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span>상세</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 사용자 관리 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>사용자 관리</span>
                <Button variant="outline" size="sm">전체 보기</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{user.name}</h3>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                        <span className="px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                          {getRoleLabel(user.role)}
                        </span>
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                          user.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.status === 'active' ? '활성' : '정지'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 mb-3">
                      <p>가입일: {formatDate(user.joinedAt)}</p>
                      <p>최근 활동: {formatDate(user.lastActive)}</p>
                    </div>

                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant={user.status === 'active' ? 'destructive' : 'default'}
                        onClick={() => handleUserAction(user.id, user.status === 'active' ? 'suspend' : 'activate')}
                      >
                        {user.status === 'active' ? '정지' : '활성화'}
                      </Button>
                      <Button variant="outline" size="sm" className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span>상세</span>
                      </Button>
                      <Button variant="outline" size="sm" className="flex items-center space-x-1">
                        <Edit className="h-4 w-4" />
                        <span>수정</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 시스템 알림 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>시스템 알림</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">서버 부하 증가</p>
                  <p className="text-xs text-yellow-700">오후 시간대 서버 응답 시간이 평소보다 느려지고 있습니다.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">결제 시스템 정상</p>
                  <p className="text-xs text-green-700">모든 결제 게이트웨이가 정상적으로 작동하고 있습니다.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <Users className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">신규 사용자 증가</p>
                  <p className="text-xs text-blue-700">이번 주 신규 가입자가 전주 대비 15% 증가했습니다.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 