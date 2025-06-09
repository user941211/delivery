import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * 배달 플랫폼 홈 화면
 * 
 * 주요 기능:
 * - 사용자 환영 메시지
 * - 인기 음식점 표시
 * - 카테고리 검색
 * - 현재 주문 상태 표시
 */

export default function TabOneScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        {/* 헤더 섹션 */}
        <View className="bg-white px-4 py-6 border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            안녕하세요! 👋
          </Text>
          <Text className="text-gray-600">
            오늘은 어떤 음식을 드시고 싶으신가요?
          </Text>
        </View>

        {/* 검색 바 */}
        <View className="px-4 py-4">
          <Pressable className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <Text className="text-gray-500">음식점이나 메뉴를 검색해보세요...</Text>
          </Pressable>
        </View>

        {/* 카테고리 섹션 */}
        <View className="px-4 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            카테고리
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row space-x-3">
              {categories.map((category, index) => (
                <Pressable 
                  key={index}
                  className="bg-white px-4 py-3 rounded-lg border border-gray-200 shadow-sm"
                >
                  <Text className="text-sm font-medium text-gray-700">
                    {category.icon} {category.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* 인기 음식점 섹션 */}
        <View className="px-4 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            인기 음식점
          </Text>
          <View className="space-y-3">
            {restaurants.map((restaurant, index) => (
              <Pressable 
                key={index}
                className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm"
              >
                <View className="flex-row justify-between items-start mb-2">
                  <Text className="text-lg font-semibold text-gray-900">
                    {restaurant.name}
                  </Text>
                  <Text className="text-yellow-500 font-medium">
                    ⭐ {restaurant.rating}
                  </Text>
                </View>
                <Text className="text-gray-600 mb-2">
                  {restaurant.category} • {restaurant.deliveryTime}분
                </Text>
                <Text className="text-sm text-gray-500">
                  최소주문: {restaurant.minOrder.toLocaleString()}원
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// 샘플 데이터
const categories = [
  { name: '치킨', icon: '🍗' },
  { name: '피자', icon: '🍕' },
  { name: '한식', icon: '🍚' },
  { name: '중식', icon: '🥢' },
  { name: '일식', icon: '🍣' },
  { name: '양식', icon: '🍝' },
  { name: '족발', icon: '🍖' },
  { name: '카페', icon: '☕' },
];

const restaurants = [
  {
    name: '맛있는 치킨집',
    category: '치킨',
    rating: 4.8,
    deliveryTime: 25,
    minOrder: 15000,
  },
  {
    name: '이탈리아 피자하우스',
    category: '피자',
    rating: 4.6,
    deliveryTime: 30,
    minOrder: 20000,
  },
  {
    name: '한옥마을 한정식',
    category: '한식',
    rating: 4.9,
    deliveryTime: 35,
    minOrder: 25000,
  },
]; 