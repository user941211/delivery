import { View, Text, ScrollView } from 'react-native';

/**
 * 주문 현황 및 주문 내역 화면
 * 
 * 주요 기능:
 * - 현재 진행 중인 주문 상태 표시
 * - 과거 주문 내역 조회
 * - 주문 재주문 기능
 */

export default function OrdersScreen() {
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
            주문 내역
          </Text>
          <Text style={{ color: '#6b7280' }}>
            진행 중인 주문과 과거 주문을 확인하세요
          </Text>
        </View>

        {/* 현재 주문 상태 */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          <Text style={{ 
            fontSize: 18, 
            fontWeight: '600', 
            color: '#111827', 
            marginBottom: 16 
          }}>
            진행 중인 주문
          </Text>
          
          <View style={{ 
            backgroundColor: 'white', 
            padding: 16, 
            borderRadius: 8, 
            borderWidth: 1, 
            borderColor: '#e5e7eb',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1
          }}>
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: 8 
            }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600', 
                color: '#111827' 
              }}>
                맛있는 치킨집
              </Text>
              <View style={{ 
                backgroundColor: '#fef3c7', 
                paddingHorizontal: 8, 
                paddingVertical: 4, 
                borderRadius: 12 
              }}>
                <Text style={{ 
                  fontSize: 12, 
                  fontWeight: '600', 
                  color: '#d97706' 
                }}>
                  조리 중
                </Text>
              </View>
            </View>
            
            <Text style={{ 
              color: '#6b7280', 
              marginBottom: 8 
            }}>
              후라이드 치킨 1마리, 콜라 1개
            </Text>
            
            <Text style={{ 
              fontSize: 14, 
              color: '#374151', 
              fontWeight: '500' 
            }}>
              예상 배달 시간: 25분 후
            </Text>
          </View>
        </View>

        {/* 과거 주문 내역 */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          <Text style={{ 
            fontSize: 18, 
            fontWeight: '600', 
            color: '#111827', 
            marginBottom: 16 
          }}>
            주문 내역
          </Text>
          
          {orderHistory.map((order, index) => (
            <View 
              key={index}
              style={{ 
                backgroundColor: 'white', 
                padding: 16, 
                borderRadius: 8, 
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
                alignItems: 'center', 
                marginBottom: 8 
              }}>
                <Text style={{ 
                  fontSize: 16, 
                  fontWeight: '600', 
                  color: '#111827' 
                }}>
                  {order.restaurant}
                </Text>
                <Text style={{ 
                  fontSize: 14, 
                  color: '#6b7280' 
                }}>
                  {order.date}
                </Text>
              </View>
              
              <Text style={{ 
                color: '#6b7280', 
                marginBottom: 8 
              }}>
                {order.items}
              </Text>
              
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600', 
                color: '#111827' 
              }}>
                {order.total.toLocaleString()}원
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// 샘플 주문 데이터
const orderHistory = [
  {
    restaurant: '이탈리아 피자하우스',
    items: '페퍼로니 피자 L, 콜라 2개',
    total: 28000,
    date: '2024-01-15',
  },
  {
    restaurant: '한옥마을 한정식',
    items: '돼지갈비정식, 된장찌개',
    total: 32000,
    date: '2024-01-12',
  },
  {
    restaurant: '버거킹',
    items: '와퍼세트, 치즈스틱',
    total: 15000,
    date: '2024-01-10',
  },
]; 