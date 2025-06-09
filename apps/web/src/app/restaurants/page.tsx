'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, Star, Clock, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

// 레스토랑 타입 정의
interface Restaurant {
  id: string;
  name: string;
  description: string;
  category: string;
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  deliveryFee: number;
  minOrder: number;
  imageUrl: string;
  isOpen: boolean;
  distance?: string;
}

// 카테고리 정의
const categories = [
  { id: 'all', name: '전체' },
  { id: 'korean', name: '한식' },
  { id: 'chinese', name: '중식' },
  { id: 'japanese', name: '일식' },
  { id: 'western', name: '양식' },
  { id: 'chicken', name: '치킨' },
  { id: 'pizza', name: '피자' },
  { id: 'burger', name: '버거' },
  { id: 'dessert', name: '디저트' },
];

// 샘플 레스토랑 데이터
const sampleRestaurants: Restaurant[] = [
  {
    id: '1',
    name: '맛있는 한식당',
    description: '정통 한식 요리를 제공하는 가정식 레스토랑',
    category: 'korean',
    rating: 4.5,
    reviewCount: 234,
    deliveryTime: '25-35분',
    deliveryFee: 2500,
    minOrder: 15000,
    imageUrl: '/images/restaurant-1.jpg',
    isOpen: true,
    distance: '1.2km',
  },
  {
    id: '2',
    name: '치킨마스터',
    description: '바삭하고 맛있는 치킨 전문점',
    category: 'chicken',
    rating: 4.8,
    reviewCount: 456,
    deliveryTime: '20-30분',
    deliveryFee: 3000,
    minOrder: 18000,
    imageUrl: '/images/restaurant-2.jpg',
    isOpen: true,
    distance: '0.8km',
  },
  {
    id: '3',
    name: '피자팰리스',
    description: '신선한 재료로 만든 수제 피자',
    category: 'pizza',
    rating: 4.3,
    reviewCount: 189,
    deliveryTime: '30-40분',
    deliveryFee: 2000,
    minOrder: 20000,
    imageUrl: '/images/restaurant-3.jpg',
    isOpen: false,
    distance: '2.1km',
  }
];

/**
 * 레스토랑 검색 및 목록 페이지
 * 검색, 필터링, 카테고리별 정렬 기능을 제공합니다.
 */
export default function RestaurantsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>(sampleRestaurants);

  // 검색 및 필터링 로직
  useEffect(() => {
    let filtered = sampleRestaurants;

    // 카테고리 필터링
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(restaurant => restaurant.category === selectedCategory);
    }

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(restaurant =>
        restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        restaurant.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRestaurants(filtered);
  }, [searchTerm, selectedCategory]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-orange-500">배달플랫폼</span>
            </Link>
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">서울시 강남구</span>
              <Button variant="outline">변경</Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* 검색 및 필터 섹션 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* 검색바 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="음식점 이름이나 메뉴를 검색하세요..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>

          {/* 카테고리 필터 */}
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* 결과 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            음식점 목록 ({filteredRestaurants.length}개)
          </h1>
        </div>

        {/* 레스토랑 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRestaurants.map((restaurant) => (
            <Card key={restaurant.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400">이미지</span>
                </div>
                {!restaurant.isOpen && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <span className="text-white font-semibold">영업 종료</span>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    restaurant.isOpen 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-400 text-white'
                  }`}>
                    {restaurant.isOpen ? '영업중' : '영업종료'}
                  </span>
                </div>
              </div>
              
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-start">
                  <span className="text-lg">{restaurant.name}</span>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium">{restaurant.rating}</span>
                    <span className="text-xs text-gray-500">({restaurant.reviewCount})</span>
                  </div>
                </CardTitle>
                <CardDescription>
                  {restaurant.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{restaurant.deliveryTime}</span>
                    </div>
                    <span>{restaurant.distance}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>배달비: {restaurant.deliveryFee.toLocaleString()}원</span>
                    <span>최소주문: {restaurant.minOrder.toLocaleString()}원</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full mt-4" 
                  disabled={!restaurant.isOpen}
                  asChild={restaurant.isOpen}
                >
                  {restaurant.isOpen ? (
                    <Link href={`/restaurants/${restaurant.id}`}>
                      메뉴 보기
                    </Link>
                  ) : (
                    '영업 종료'
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 검색 결과가 없을 때 */}
        {filteredRestaurants.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              검색 결과가 없습니다
            </h3>
            <p className="text-gray-500">
              다른 검색어를 시도하거나 카테고리를 변경해보세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 