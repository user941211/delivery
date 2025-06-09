import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// 주문 상태 타입
type OrderStatus = 'confirmed' | 'preparing' | 'cooking' | 'ready' | 'pickup' | 'delivering' | 'delivered';

// 주문 정보 타입
interface OrderInfo {
  id: string;
  restaurantName: string;
  status: OrderStatus;
  estimatedTime: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  deliveryAddress: string;
  total: number;
  driver?: {
    name: string;
    phone: string;
  };
}

// 주문 단계 정의
const orderSteps = [
  { key: 'confirmed' as OrderStatus, label: '주문 확인', icon: 'checkmark-circle' },
  { key: 'preparing' as OrderStatus, label: '조리 준비', icon: 'restaurant' },
  { key: 'cooking' as OrderStatus, label: '조리 중', icon: 'flame' },
  { key: 'ready' as OrderStatus, label: '조리 완료', icon: 'checkmark-done' },
  { key: 'pickup' as OrderStatus, label: '픽업 완료', icon: 'car' },
  { key: 'delivering' as OrderStatus, label: '배달 중', icon: 'bicycle' },
  { key: 'delivered' as OrderStatus, label: '배달 완료', icon: 'home' },
];

/**
 * 모바일 앱 주문 추적 화면
 * 실시간 주문 상태와 배달 정보를 표시합니다.
 */
export default function OrderTrackingScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  
  const [orderInfo, setOrderInfo] = useState<OrderInfo>({
    id: orderId,
    restaurantName: '맛있는 한식당',
    status: 'delivering',
    estimatedTime: '15분 후 도착 예정',
    items: [
      { name: '김치찌개', quantity: 1, price: 8000 },
      { name: '공기밥', quantity: 1, price: 1000 },
    ],
    deliveryAddress: '서울시 강남구 역삼동 456-78',
    total: 9000,
    driver: {
      name: '김배달',
      phone: '010-1234-5678',
    },
  });

  // 주문 상태 업데이트 시뮬레이션
  useEffect(() => {
    const timer = setTimeout(() => {
      if (orderInfo.status !== 'delivered') {
        const currentIndex = orderSteps.findIndex(step => step.key === orderInfo.status);
        if (currentIndex < orderSteps.length - 1) {
          setOrderInfo(prev => ({
            ...prev,
            status: orderSteps[currentIndex + 1].key,
          }));
        }
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [orderInfo.status]);

  // 현재 단계 찾기
  const getCurrentStepIndex = () => {
    return orderSteps.findIndex(step => step.key === orderInfo.status);
  };

  // 배달기사 연락하기
  const callDriver = () => {
    if (orderInfo.driver) {
      Alert.alert(
        '배달기사 연락',
        `${orderInfo.driver.name}님에게 전화하시겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          { text: '전화걸기', onPress: () => console.log('Call driver') },
        ]
      );
    }
  };

  // 음식점 연락하기
  const callRestaurant = () => {
    Alert.alert(
      '음식점 연락',
      `${orderInfo.restaurantName}에 전화하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        { text: '전화걸기', onPress: () => console.log('Call restaurant') },
      ]
    );
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>주문 추적</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 상태 요약 */}
        <View style={styles.statusSummary}>
          <Text style={styles.statusTitle}>
            {orderSteps[currentStepIndex]?.label}
          </Text>
          <Text style={styles.estimatedTime}>{orderInfo.estimatedTime}</Text>
          
          {orderInfo.status === 'delivering' && (
            <View style={styles.deliveryInfo}>
              <Ionicons name="bicycle" size={24} color="#FF6B35" />
              <Text style={styles.deliveryText}>배달기사가 배달 중입니다</Text>
            </View>
          )}
        </View>

        {/* 진행 상태 */}
        <View style={styles.progressContainer}>
          <Text style={styles.sectionTitle}>주문 진행 상태</Text>
          
          <View style={styles.progressSteps}>
            {orderSteps.map((step, index) => {
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              
              return (
                <View key={step.key} style={styles.progressStep}>
                  <View style={styles.stepIndicator}>
                    <View style={[
                      styles.stepCircle,
                      isCompleted && styles.stepCircleCompleted,
                      isCurrent && styles.stepCircleCurrent,
                    ]}>
                      <Ionicons
                        name={step.icon as any}
                        size={20}
                        color={isCompleted ? '#ffffff' : '#cccccc'}
                      />
                    </View>
                    {index < orderSteps.length - 1 && (
                      <View style={[
                        styles.stepLine,
                        index < currentStepIndex && styles.stepLineCompleted,
                      ]} />
                    )}
                  </View>
                  
                  <View style={styles.stepContent}>
                    <Text style={[
                      styles.stepLabel,
                      isCompleted && styles.stepLabelCompleted,
                    ]}>
                      {step.label}
                    </Text>
                    {isCurrent && (
                      <Text style={styles.stepCurrentText}>진행 중</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* 배달기사 정보 */}
        {orderInfo.driver && orderInfo.status === 'delivering' && (
          <View style={styles.driverContainer}>
            <Text style={styles.sectionTitle}>배달기사 정보</Text>
            
            <View style={styles.driverInfo}>
              <View style={styles.driverAvatar}>
                <Ionicons name="person" size={32} color="#FF6B35" />
              </View>
              
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{orderInfo.driver.name}</Text>
                <Text style={styles.driverVehicle}>오토바이</Text>
              </View>
              
              <TouchableOpacity style={styles.callButton} onPress={callDriver}>
                <Ionicons name="call" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 주문 정보 */}
        <View style={styles.orderInfoContainer}>
          <Text style={styles.sectionTitle}>주문 정보</Text>
          
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName}>{orderInfo.restaurantName}</Text>
            <TouchableOpacity style={styles.callRestaurantButton} onPress={callRestaurant}>
              <Ionicons name="call" size={16} color="#FF6B35" />
              <Text style={styles.callRestaurantText}>음식점 연락</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.orderItems}>
            {orderInfo.items.map((item, index) => (
              <View key={index} style={styles.orderItem}>
                <Text style={styles.itemName}>
                  {item.name} x{item.quantity}
                </Text>
                <Text style={styles.itemPrice}>
                  {(item.price * item.quantity).toLocaleString()}원
                </Text>
              </View>
            ))}
            
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>총 결제금액</Text>
              <Text style={styles.totalAmount}>
                {orderInfo.total.toLocaleString()}원
              </Text>
            </View>
          </View>

          <View style={styles.deliveryAddressContainer}>
            <View style={styles.addressHeader}>
              <Ionicons name="location" size={20} color="#FF6B35" />
              <Text style={styles.addressLabel}>배달 주소</Text>
            </View>
            <Text style={styles.addressText}>{orderInfo.deliveryAddress}</Text>
          </View>
        </View>

        {/* 주문 완료 시 리뷰 버튼 */}
        {orderInfo.status === 'delivered' && (
          <View style={styles.reviewContainer}>
            <Text style={styles.reviewTitle}>주문이 완료되었습니다! 🎉</Text>
            <Text style={styles.reviewSubtitle}>
              음식과 배달 서비스는 어떠셨나요?
            </Text>
            <TouchableOpacity style={styles.reviewButton}>
              <Ionicons name="star" size={20} color="#ffffff" />
              <Text style={styles.reviewButtonText}>리뷰 작성하기</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  statusSummary: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  estimatedTime: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '600',
    marginBottom: 16,
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  deliveryText: {
    fontSize: 14,
    color: '#FF6B35',
    marginLeft: 8,
    fontWeight: '500',
  },
  progressContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  progressSteps: {
    paddingLeft: 20,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIndicator: {
    alignItems: 'center',
    marginRight: 16,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepCircleCurrent: {
    backgroundColor: '#FF6B35',
  },
  stepLine: {
    width: 2,
    height: 40,
    backgroundColor: '#f0f0f0',
    marginTop: 8,
  },
  stepLineCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepContent: {
    flex: 1,
    paddingBottom: 32,
  },
  stepLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
  },
  stepLabelCompleted: {
    color: '#333333',
  },
  stepCurrentText: {
    fontSize: 12,
    color: '#FF6B35',
    marginTop: 4,
    fontWeight: '500',
  },
  driverContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff5f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  driverVehicle: {
    fontSize: 14,
    color: '#666666',
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderInfoContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  restaurantInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  callRestaurantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FF6B35',
    borderRadius: 8,
  },
  callRestaurantText: {
    fontSize: 14,
    color: '#FF6B35',
    marginLeft: 4,
    fontWeight: '500',
  },
  orderItems: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  itemName: {
    fontSize: 14,
    color: '#333333',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  deliveryAddressContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginLeft: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  reviewContainer: {
    margin: 20,
    padding: 24,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    alignItems: 'center',
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  reviewSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
    textAlign: 'center',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  reviewButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 8,
  },
}); 