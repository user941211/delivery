import { View, Text, ScrollView, Pressable } from 'react-native';

/**
 * 설정 모달 화면
 * 
 * 주요 기능:
 * - 앱 설정
 * - 테마 변경
 * - 언어 설정
 */

export default function ModalScreen() {
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
            설정
          </Text>
          <Text style={{ color: '#6b7280' }}>
            앱 환경설정을 관리하세요
          </Text>
        </View>

        {/* 설정 옵션들 */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          {settingsOptions.map((option, index) => (
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
                  {option.icon}
                </Text>
                <View>
                  <Text style={{ 
                    fontSize: 16, 
                    color: '#111827',
                    fontWeight: '500'
                  }}>
                    {option.title}
                  </Text>
                  <Text style={{ 
                    fontSize: 14, 
                    color: '#6b7280',
                    marginTop: 2
                  }}>
                    {option.description}
                  </Text>
                </View>
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

        {/* 앱 정보 */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          <View style={{ 
            backgroundColor: 'white', 
            padding: 16, 
            borderRadius: 8, 
            borderWidth: 1, 
            borderColor: '#e5e7eb' 
          }}>
            <Text style={{ 
              fontSize: 16, 
              fontWeight: '600', 
              color: '#111827', 
              marginBottom: 8 
            }}>
              앱 정보
            </Text>
            <Text style={{ 
              fontSize: 14, 
              color: '#6b7280', 
              marginBottom: 4 
            }}>
              버전: 1.0.0
            </Text>
            <Text style={{ 
              fontSize: 14, 
              color: '#6b7280' 
            }}>
              마지막 업데이트: 2024년 1월 20일
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// 설정 옵션 데이터
const settingsOptions = [
  {
    title: '알림 설정',
    description: '주문 알림, 프로모션 알림 관리',
    icon: '🔔',
  },
  {
    title: '테마 설정',
    description: '라이트/다크 모드 선택',
    icon: '🎨',
  },
  {
    title: '언어 설정',
    description: '앱 표시 언어 변경',
    icon: '🌐',
  },
  {
    title: '위치 설정',
    description: '배달 주소 및 위치 권한 관리',
    icon: '📍',
  },
  {
    title: '개인정보 보호',
    description: '데이터 사용 및 개인정보 설정',
    icon: '🔒',
  },
]; 