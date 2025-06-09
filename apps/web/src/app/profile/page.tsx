'use client';

import { useState } from 'react';
import { User, MapPin, Phone, Mail, CreditCard, Clock, Star, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// 사용자 정보 타입
interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  joinedAt: string;
  orderCount: number;
  favoriteRestaurants: string[];
}

// 주문 히스토리 타입
interface OrderHistory {
  id: string;
  restaurantName: string;
  items: string[];
  total: number;
  date: string;
  status: string;
}

/**
 * 사용자 계정 및 프로필 관리 페이지
 * 개인정보 수정, 주문 히스토리, 주소 관리 등을 제공합니다.
 */
export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>({
    id: '1',
    name: '김고객',
    email: 'customer@example.com',
    phone: '010-1234-5678',
    address: '서울시 강남구 역삼동 456-78',
    joinedAt: '2024-01-01T00:00:00Z',
    orderCount: 47,
    favoriteRestaurants: ['맛있는 한식당', '치킨마스터'],
  });

  const [orderHistory] = useState<OrderHistory[]>([
    {
      id: '1',
      restaurantName: '맛있는 한식당',
      items: ['김치찌개', '공기밥'],
      total: 9000,
      date: '2024-01-15T18:30:00Z',
      status: '배달 완료',
    },
    {
      id: '2',
      restaurantName: '치킨마스터',
      items: ['후라이드 치킨', '감자튀김'],
      total: 21000,
      date: '2024-01-14T19:45:00Z',
      status: '배달 완료',
    },
  ]);

  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    setIsEditing(false);
    // 실제로는 API 호출
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">내 정보</h1>
            <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
              <Settings className="h-4 w-4 mr-2" />
              {isEditing ? '취소' : '수정'}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 프로필 정보 */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>기본 정보</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({...profile, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <p className="text-gray-900">{profile.email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({...profile, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <p className="text-gray-900">{profile.phone}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.address}
                      onChange={(e) => setProfile({...profile, address: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <p className="text-gray-900">{profile.address}</p>
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="pt-4">
                    <Button onClick={handleSave} className="mr-2">
                      저장
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      취소
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 주문 히스토리 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>주문 히스토리</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderHistory.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{order.restaurantName}</h3>
                          <p className="text-sm text-gray-600">{order.items.join(', ')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{order.total.toLocaleString()}원</p>
                          <p className="text-sm text-gray-500">{formatDate(order.date)}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                          {order.status}
                        </span>
                        <div className="space-x-2">
                          <Button variant="outline" size="sm">재주문</Button>
                          <Button variant="outline" size="sm">리뷰 작성</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 사이드바 */}
          <div className="space-y-6">
            {/* 활동 요약 */}
            <Card>
              <CardHeader>
                <CardTitle>활동 요약</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">가입일</span>
                  <span className="font-medium">{formatDate(profile.joinedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">총 주문</span>
                  <span className="font-medium">{profile.orderCount}회</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">즐겨찾는 음식점</span>
                  <span className="font-medium">{profile.favoriteRestaurants.length}곳</span>
                </div>
              </CardContent>
            </Card>

            {/* 즐겨찾는 음식점 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>즐겨찾는 음식점</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {profile.favoriteRestaurants.map((restaurant, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-gray-900">{restaurant}</span>
                      <Button variant="outline" size="sm">주문하기</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 빠른 액션 */}
            <Card>
              <CardHeader>
                <CardTitle>빠른 액션</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <CreditCard className="h-4 w-4 mr-2" />
                  결제 수단 관리
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <MapPin className="h-4 w-4 mr-2" />
                  배달 주소 관리
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Star className="h-4 w-4 mr-2" />
                  내가 쓴 리뷰
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  알림 설정
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 