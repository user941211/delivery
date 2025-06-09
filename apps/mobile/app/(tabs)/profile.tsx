import { View, Text, ScrollView, Pressable } from 'react-native';

/**
 * 사용자 프로필 및 설정 화면
 * 
 * 주요 기능:
 * - 사용자 정보 표시
 * - 계정 설정
 * - 주문 설정
 * - 고객 지원
 */

export default function ProfileScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView style={{ flex: 1 }}>
        {/* 사용자 정보 헤더 */}
        <View style={{ 
          backgroundColor: 'white', 
          paddingHorizontal: 16, 
          paddingVertical: 24, 
          borderBottomWidth: 1, 
          borderBottomColor: '#e5e7eb' 
        }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: 16 
          }}>
            <View style={{ 
              width: 64, 
              height: 64, 
              backgroundColor: '#f97316', 
              borderRadius: 32, 
              justifyContent: 'center', 
              alignItems: 'center', 
              marginRight: 16 
            }}>
              <Text style={{ 
                fontSize: 24, 
                fontWeight: 'bold', 
                color: 'white' 
              }}>
                김
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: 20, 
                fontWeight: 'bold', 
                color: '#111827', 
                marginBottom: 4 
              }}>
                김민수
              </Text>
              <Text style={{ 
                fontSize: 14, 
                color: '#6b7280' 
              }}>
                kimminsu@example.com
              </Text>
            </View>
          </View>
          
          {/* 사용자 통계 */}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-around', 
            paddingTop: 16, 
            borderTopWidth: 1, 
            borderTopColor: '#f3f4f6' 
          }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ 
                fontSize: 20, 
                fontWeight: 'bold', 
                color: '#111827', 
                marginBottom: 4 
              }}>
                23
              </Text>
              <Text style={{ 
                fontSize: 12, 
                color: '#6b7280' 
              }}>
                총 주문수
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ 
                fontSize: 20, 
                fontWeight: 'bold', 
                color: '#111827', 
                marginBottom: 4 
              }}>
                5
              </Text>
              <Text style={{ 
                fontSize: 12, 
                color: '#6b7280' 
              }}>
                즐겨찾기
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ 
                fontSize: 20, 
                fontWeight: 'bold', 
                color: '#111827', 
                marginBottom: 4 
              }}>
                4.8
              </Text>
              <Text style={{ 
                fontSize: 12, 
                color: '#6b7280' 
              }}>
                평균 별점
              </Text>
            </View>
          </View>
        </View>

        {/* 설정 메뉴 */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: '600', 
            color: '#111827', 
            marginBottom: 12 
          }}>
            계정 설정
          </Text>
          
          {accountSettings.map((setting, index) => (
            <Pressable 
              key={index}
              style={{ 
                backgroundColor: 'white', 
                paddingHorizontal: 16, 
                paddingVertical: 16, 
                borderRadius: 8, 
                borderWidth: 1, 
                borderColor: '#e5e7eb',
                marginBottom: 8,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center' 
              }}>
                <Text style={{ 
                  fontSize: 24, 
                  marginRight: 12 
                }}>
                  {setting.icon}
                </Text>
                <Text style={{ 
                  fontSize: 16, 
                  color: '#111827' 
                }}>
                  {setting.title}
                </Text>
              </View>
              <Text style={{ 
                fontSize: 18, 
                color: '#6b7280' 
              }}>
                ›
              </Text>
            </Pressable>
          ))}
        </View>

        {/* 지원 메뉴 */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: '600', 
            color: '#111827', 
            marginBottom: 12 
          }}>
            지원
          </Text>
          
          {supportSettings.map((setting, index) => (
            <Pressable 
              key={index}
              style={{ 
                backgroundColor: 'white', 
                paddingHorizontal: 16, 
                paddingVertical: 16, 
                borderRadius: 8, 
                borderWidth: 1, 
                borderColor: '#e5e7eb',
                marginBottom: 8,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center' 
              }}>
                <Text style={{ 
                  fontSize: 24, 
                  marginRight: 12 
                }}>
                  {setting.icon}
                </Text>
                <Text style={{ 
                  fontSize: 16, 
                  color: '#111827' 
                }}>
                  {setting.title}
                </Text>
              </View>
              <Text style={{ 
                fontSize: 18, 
                color: '#6b7280' 
              }}>
                ›
              </Text>
            </Pressable>
          ))}
        </View>

        {/* 로그아웃 버튼 */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
          <Pressable style={{ 
            backgroundColor: '#dc2626', 
            paddingVertical: 16, 
            borderRadius: 8, 
            alignItems: 'center' 
          }}>
            <Text style={{ 
              color: 'white', 
              fontSize: 16, 
              fontWeight: '600' 
            }}>
              로그아웃
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// 계정 설정 메뉴
const accountSettings = [
  { title: '개인정보 수정', icon: '👤' },
  { title: '주소 관리', icon: '📍' },
  { title: '결제 정보', icon: '💳' },
  { title: '알림 설정', icon: '🔔' },
  { title: '언어 설정', icon: '🌐' },
];

// 지원 메뉴
const supportSettings = [
  { title: '고객센터', icon: '📞' },
  { title: '자주 묻는 질문', icon: '❓' },
  { title: '이용약관', icon: '📄' },
  { title: '개인정보처리방침', icon: '🔒' },
  { title: '앱 정보', icon: 'ℹ️' },
]; 