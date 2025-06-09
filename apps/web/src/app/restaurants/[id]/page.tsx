'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Clock, Star, MapPin, Plus, Minus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

// 메뉴 아이템 타입 정의
interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  options?: MenuOption[];
  isAvailable: boolean;
}

interface MenuOption {
  id: string;
  name: string;
  type: 'radio' | 'checkbox';
  required: boolean;
  choices: {
    id: string;
    name: string;
    price: number;
  }[];
}

// 장바구니 아이템 타입
interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  selectedOptions: { [optionId: string]: string[] };
  totalPrice: number;
}

// 레스토랑 상세 정보
interface RestaurantDetail {
  id: string;
  name: string;
  description: string;
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  deliveryFee: number;
  minOrder: number;
  isOpen: boolean;
  imageUrl: string;
  address: string;
  phone: string;
}

// 샘플 레스토랑 데이터
const sampleRestaurants: { [key: string]: RestaurantDetail } = {
  '1': {
    id: '1',
    name: '맛있는 한식당',
    description: '정통 한식 요리를 제공하는 가정식 레스토랑',
    rating: 4.5,
    reviewCount: 234,
    deliveryTime: '25-35분',
    deliveryFee: 2500,
    minOrder: 15000,
    isOpen: true,
    imageUrl: '/images/restaurant-1.jpg',
    address: '서울시 강남구 테헤란로 123',
    phone: '02-1234-5678',
  },
  '2': {
    id: '2',
    name: '치킨마스터',
    description: '바삭하고 맛있는 치킨 전문점',
    rating: 4.8,
    reviewCount: 456,
    deliveryTime: '20-30분',
    deliveryFee: 3000,
    minOrder: 18000,
    isOpen: true,
    imageUrl: '/images/restaurant-2.jpg',
    address: '서울시 강남구 강남대로 456',
    phone: '02-2345-6789',
  },
};

// 샘플 메뉴 데이터
const sampleMenus: { [restaurantId: string]: MenuItem[] } = {
  '1': [
    {
      id: 'm1',
      name: '김치찌개',
      description: '돼지고기와 김치로 우려낸 진한 국물의 김치찌개',
      price: 8000,
      category: '찌개류',
      imageUrl: '/images/menu-1.jpg',
      isAvailable: true,
      options: [
        {
          id: 'spice',
          name: '맵기 조절',
          type: 'radio',
          required: true,
          choices: [
            { id: 'mild', name: '순한맛', price: 0 },
            { id: 'medium', name: '보통맛', price: 0 },
            { id: 'hot', name: '매운맛', price: 0 },
          ],
        },
        {
          id: 'extras',
          name: '추가 옵션',
          type: 'checkbox',
          required: false,
          choices: [
            { id: 'rice', name: '공기밥 추가', price: 1000 },
            { id: 'egg', name: '계란 추가', price: 1500 },
            { id: 'cheese', name: '치즈 추가', price: 2000 },
          ],
        },
      ],
    },
    {
      id: 'm2',
      name: '불고기',
      description: '양념에 재운 소고기를 구워낸 달콤한 불고기',
      price: 15000,
      category: '구이류',
      imageUrl: '/images/menu-2.jpg',
      isAvailable: true,
      options: [
        {
          id: 'portion',
          name: '양 선택',
          type: 'radio',
          required: true,
          choices: [
            { id: 'small', name: '소(1인분)', price: 0 },
            { id: 'large', name: '대(2인분)', price: 8000 },
          ],
        },
      ],
    },
    {
      id: 'm3',
      name: '비빔밥',
      description: '신선한 나물과 고추장이 어우러진 건강한 비빔밥',
      price: 9000,
      category: '밥류',
      imageUrl: '/images/menu-3.jpg',
      isAvailable: false,
    },
  ],
  '2': [
    {
      id: 'm4',
      name: '후라이드 치킨',
      description: '바삭하고 맛있는 클래식 후라이드 치킨',
      price: 18000,
      category: '치킨',
      imageUrl: '/images/menu-4.jpg',
      isAvailable: true,
      options: [
        {
          id: 'size',
          name: '사이즈',
          type: 'radio',
          required: true,
          choices: [
            { id: 'half', name: '반마리', price: 0 },
            { id: 'whole', name: '한마리', price: 8000 },
          ],
        },
        {
          id: 'sides',
          name: '사이드 메뉴',
          type: 'checkbox',
          required: false,
          choices: [
            { id: 'pickles', name: '치킨무', price: 0 },
            { id: 'coleslaw', name: '코울슬로', price: 2000 },
            { id: 'potato', name: '감자튀김', price: 3000 },
          ],
        },
      ],
    },
    {
      id: 'm5',
      name: '양념치킨',
      description: '달콤하고 매콤한 양념이 일품인 양념치킨',
      price: 19000,
      category: '치킨',
      imageUrl: '/images/menu-5.jpg',
      isAvailable: true,
      options: [
        {
          id: 'size',
          name: '사이즈',
          type: 'radio',
          required: true,
          choices: [
            { id: 'half', name: '반마리', price: 0 },
            { id: 'whole', name: '한마리', price: 8000 },
          ],
        },
      ],
    },
  ],
};

/**
 * 레스토랑 메뉴 상세 및 주문 페이지
 * 메뉴 선택, 옵션 설정, 장바구니 관리 기능을 제공합니다.
 */
export default function RestaurantMenuPage() {
  const params = useParams();
  const restaurantId = params.id as string;
  
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<{ [optionId: string]: string[] }>({});
  const [quantity, setQuantity] = useState(1);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // 데이터 로드
  useEffect(() => {
    if (restaurantId && sampleRestaurants[restaurantId]) {
      setRestaurant(sampleRestaurants[restaurantId]);
      setMenuItems(sampleMenus[restaurantId] || []);
    }
  }, [restaurantId]);

  // 메뉴 카테고리 추출
  const categories = ['전체', ...Array.from(new Set(menuItems.map(item => item.category)))];

  // 필터된 메뉴 아이템
  const filteredMenuItems = selectedCategory === '전체' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  // 옵션 가격 계산
  const calculateOptionPrice = (menuItem: MenuItem, options: { [optionId: string]: string[] }) => {
    let optionPrice = 0;
    
    menuItem.options?.forEach(option => {
      const selectedChoices = options[option.id] || [];
      selectedChoices.forEach(choiceId => {
        const choice = option.choices.find(c => c.id === choiceId);
        if (choice) {
          optionPrice += choice.price;
        }
      });
    });
    
    return optionPrice;
  };

  // 장바구니에 추가
  const addToCart = () => {
    if (!selectedMenuItem) return;

    const optionPrice = calculateOptionPrice(selectedMenuItem, selectedOptions);
    const totalPrice = (selectedMenuItem.price + optionPrice) * quantity;

    const cartItem: CartItem = {
      menuItem: selectedMenuItem,
      quantity,
      selectedOptions: { ...selectedOptions },
      totalPrice,
    };

    setCart(prev => [...prev, cartItem]);
    setSelectedMenuItem(null);
    setSelectedOptions({});
    setQuantity(1);
  };

  // 장바구니 총액 계산
  const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const canOrder = restaurant && cartTotal >= restaurant.minOrder;

  if (!restaurant) {
    return <div className="flex items-center justify-center min-h-screen">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/restaurants" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">{restaurant.name}</h1>
          </div>
        </div>
      </header>

      {/* 레스토랑 정보 */}
      <div className="bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-2/3">
              <div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center mb-4">
                <span className="text-gray-400">레스토랑 이미지</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{restaurant.name}</h2>
              <p className="text-gray-600 mb-4">{restaurant.description}</p>
              
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span>{restaurant.rating}</span>
                  <span>({restaurant.reviewCount})</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{restaurant.deliveryTime}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>{restaurant.address}</span>
                </div>
              </div>
            </div>
            
            <div className="md:w-1/3">
              <Card>
                <CardHeader>
                  <CardTitle>주문 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>배달비</span>
                    <span>{restaurant.deliveryFee.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span>최소주문금액</span>
                    <span>{restaurant.minOrder.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span>배달시간</span>
                    <span>{restaurant.deliveryTime}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>영업상태</span>
                    <span className={restaurant.isOpen ? 'text-green-600' : 'text-red-600'}>
                      {restaurant.isOpen ? '영업중' : '영업종료'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 메뉴 섹션 */}
          <div className="lg:w-2/3">
            {/* 카테고리 필터 */}
            <div className="bg-white rounded-lg p-4 mb-6">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>

            {/* 메뉴 목록 */}
            <div className="space-y-4">
              {filteredMenuItems.map((menuItem) => (
                <Card 
                  key={menuItem.id} 
                  className={`cursor-pointer transition-shadow ${!menuItem.isAvailable ? 'opacity-50' : 'hover:shadow-md'}`}
                  onClick={() => menuItem.isAvailable && setSelectedMenuItem(menuItem)}
                >
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-400 text-xs">이미지</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {menuItem.name}
                          {!menuItem.isAvailable && <span className="text-red-500 ml-2">(품절)</span>}
                        </h3>
                        <p className="text-gray-600 text-sm mb-2 line-clamp-2">{menuItem.description}</p>
                        <p className="text-lg font-bold text-orange-600">{menuItem.price.toLocaleString()}원</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* 장바구니 섹션 */}
          <div className="lg:w-1/3">
            <div className="sticky top-24">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ShoppingCart className="h-5 w-5" />
                    <span>장바구니</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {cart.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">장바구니가 비어있습니다</p>
                  ) : (
                    <div className="space-y-4">
                      {cart.map((item, index) => (
                        <div key={index} className="border-b pb-4">
                          <h4 className="font-medium">{item.menuItem.name}</h4>
                          <p className="text-sm text-gray-600">수량: {item.quantity}</p>
                          <p className="text-sm font-medium">{item.totalPrice.toLocaleString()}원</p>
                        </div>
                      ))}
                      
                      <div className="border-t pt-4">
                        <div className="flex justify-between text-lg font-bold">
                          <span>총 주문금액</span>
                          <span>{cartTotal.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 mt-2">
                          <span>배달비</span>
                          <span>{restaurant.deliveryFee.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t">
                          <span>총 결제금액</span>
                          <span>{(cartTotal + restaurant.deliveryFee).toLocaleString()}원</span>
                        </div>
                      </div>

                      <Button 
                        className="w-full mt-4" 
                        disabled={!canOrder}
                        onClick={() => setShowOrderModal(true)}
                      >
                        {canOrder 
                          ? `${(cartTotal + restaurant.deliveryFee).toLocaleString()}원 주문하기`
                          : `최소주문금액 ${restaurant.minOrder.toLocaleString()}원`
                        }
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* 메뉴 선택 모달 */}
      {selectedMenuItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold">{selectedMenuItem.name}</h3>
                <button 
                  onClick={() => {
                    setSelectedMenuItem(null);
                    setSelectedOptions({});
                    setQuantity(1);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="h-48 bg-gray-200 rounded-lg flex items-center justify-center mb-4">
                <span className="text-gray-400">이미지</span>
              </div>
              
              <p className="text-gray-600 mb-4">{selectedMenuItem.description}</p>
              <p className="text-xl font-bold text-orange-600 mb-6">{selectedMenuItem.price.toLocaleString()}원</p>

              {/* 옵션 선택 */}
              {selectedMenuItem.options?.map((option) => (
                <div key={option.id} className="mb-6">
                  <h4 className="font-medium mb-3">
                    {option.name}
                    {option.required && <span className="text-red-500 ml-1">*</span>}
                  </h4>
                  <div className="space-y-2">
                    {option.choices.map((choice) => (
                      <label key={choice.id} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type={option.type}
                          name={option.id}
                          value={choice.id}
                          checked={selectedOptions[option.id]?.includes(choice.id) || false}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setSelectedOptions(prev => {
                              const newOptions = { ...prev };
                              
                              if (option.type === 'radio') {
                                newOptions[option.id] = isChecked ? [choice.id] : [];
                              } else {
                                const currentChoices = newOptions[option.id] || [];
                                if (isChecked) {
                                  newOptions[option.id] = [...currentChoices, choice.id];
                                } else {
                                  newOptions[option.id] = currentChoices.filter(id => id !== choice.id);
                                }
                              }
                              
                              return newOptions;
                            });
                          }}
                          className="w-4 h-4"
                        />
                        <span className="flex-1">{choice.name}</span>
                        <span className="text-gray-600">
                          {choice.price > 0 && `+${choice.price.toLocaleString()}원`}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {/* 수량 선택 */}
              <div className="flex items-center justify-between mb-6">
                <span className="font-medium">수량</span>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* 장바구니 담기 버튼 */}
              <Button 
                onClick={addToCart}
                className="w-full"
              >
                {((selectedMenuItem.price + calculateOptionPrice(selectedMenuItem, selectedOptions)) * quantity).toLocaleString()}원 장바구니 담기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 