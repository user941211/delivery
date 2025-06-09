import { View, Text, ScrollView } from 'react-native';

/**
 * 즐겨찾기 음식점 화면
 * 
 * 주요 기능:
 * - 즐겨찾는 음식점 목록 표시
 * - 빠른 주문 기능
 * - 즐겨찾기 추가/제거
 */

export default function FavoritesScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView style={{ flex: 1 }}>
        {/* 헤더 */}
        <View style={{ 
          backgroundColor: 'white', 
          paddingHorizontal: 16, 
          paddingVertical: 24, 
          borderBottomWidth: 1, 
          borderBottomColor: '#e5e7eb' 
        }}>
          <Text style={{ 
            fontSize: 24, 
            fontWeight: 'bold', 
            color: '#111827', 
            marginBottom: 8 
          }}>
            즐겨찾기
          </Text>
          <Text style={{ color: '#6b7280' }}>
            자주 주문하는 음식점을 관리하세요
          </Text>
        </View>

        {/* 즐겨찾기 목록 */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          {favoriteRestaurants.map((restaurant, index) => (
            <View 
              key={index}
              style={{ 
                backgroundColor: 'white', 
                padding: 16, 
                borderRadius: 12, 
                borderWidth: 1, 
                borderColor: '#e5e7eb',
                marginBottom: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1
              }}
            >
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start', 
                marginBottom: 8 
              }}>
                <Text style={{ 
                  fontSize: 18, 
                  fontWeight: '600', 
                  color: '#111827',
                  flex: 1,
                  marginRight: 8
                }}>
                  {restaurant.name}
                </Text>
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center' 
                }}>
                  <Text style={{ 
                    fontSize: 14, 
                    fontWeight: '600', 
                    color: '#fbbf24', 
                    marginRight: 4 
                  }}>
                    ⭐
                  </Text>
                  <Text style={{ 
                    fontSize: 14, 
                    fontWeight: '600', 
                    color: '#111827' 
                  }}>
                    {restaurant.rating}
                  </Text>
                </View>
              </View>
              
              <Text style={{ 
                color: '#6b7280', 
                marginBottom: 8,
                fontSize: 14
              }}>
                {restaurant.category} • 배달 {restaurant.deliveryTime}분
              </Text>
              
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <Text style={{ 
                  fontSize: 14, 
                  color: '#374151' 
                }}>
                  최소주문: {restaurant.minOrder.toLocaleString()}원
                </Text>
                <View style={{ 
                  backgroundColor: '#f97316', 
                  paddingHorizontal: 12, 
                  paddingVertical: 6, 
                  borderRadius: 6 
                }}>
                  <Text style={{ 
                    color: 'white', 
                    fontSize: 12, 
                    fontWeight: '600' 
                  }}>
                    주문하기
                  </Text>
                </View>
              </View>
              
              {restaurant.lastOrder && (
                <View style={{ 
                  marginTop: 12, 
                  paddingTop: 12, 
                  borderTopWidth: 1, 
                  borderTopColor: '#f3f4f6' 
                }}>
                  <Text style={{ 
                    fontSize: 12, 
                    color: '#6b7280' 
                  }}>
                    최근 주문: {restaurant.lastOrder}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* 빈 상태 메시지 (즐겨찾기가 없는 경우) */}
        {favoriteRestaurants.length === 0 && (
          <View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center', 
            paddingHorizontal: 32, 
            paddingVertical: 64 
          }}>
            <Text style={{ 
              fontSize: 64, 
              marginBottom: 16 
            }}>
              ❤️
            </Text>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: '600', 
              color: '#111827', 
              marginBottom: 8, 
              textAlign: 'center' 
            }}>
              즐겨찾기가 비어있어요
            </Text>
            <Text style={{ 
              fontSize: 14, 
              color: '#6b7280', 
              textAlign: 'center' 
            }}>
              음식점에서 하트 버튼을 눌러{'\n'}즐겨찾기에 추가해보세요
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// 샘플 즐겨찾기 데이터
const favoriteRestaurants = [
  {
    name: '맛있는 치킨집',
    category: '치킨',
    rating: 4.8,
    deliveryTime: 25,
    minOrder: 15000,
    lastOrder: '후라이드 치킨',
  },
  {
    name: '이탈리아 피자하우스',
    category: '피자',
    rating: 4.6,
    deliveryTime: 30,
    minOrder: 20000,
    lastOrder: '페퍼로니 피자',
  },
  {
    name: '프리미엄 스시',
    category: '일식',
    rating: 4.9,
    deliveryTime: 40,
    minOrder: 30000,
    lastOrder: '연어 초밥세트',
  },
]; 