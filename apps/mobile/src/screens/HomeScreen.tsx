import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// 레스토랑 타입 정의
interface Restaurant {
  id: string;
  name: string;
  description: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: number;
  imageUrl: string;
  category: string;
}

// 카테고리 타입 정의
interface Category {
  id: string;
  name: string;
  icon: string;
}

/**
 * 모바일 앱 홈 화면
 * 레스토랑 검색, 카테고리, 추천 레스토랑을 표시합니다.
 */
export default function HomeScreen({ navigation }: any) {
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // 샘플 카테고리 데이터
  const categories: Category[] = [
    { id: 'all', name: '전체', icon: 'apps' },
    { id: 'korean', name: '한식', icon: 'restaurant' },
    { id: 'chicken', name: '치킨', icon: 'egg' },
    { id: 'pizza', name: '피자', icon: 'pizza' },
    { id: 'chinese', name: '중식', icon: 'restaurant-outline' },
    { id: 'burger', name: '버거', icon: 'fast-food' },
  ];

  // 샘플 레스토랑 데이터
  const restaurants: Restaurant[] = [
    {
      id: '1',
      name: '맛있는 한식당',
      description: '정통 한식 요리',
      rating: 4.5,
      deliveryTime: '25-35분',
      deliveryFee: 2500,
      imageUrl: 'https://via.placeholder.com/300x200',
      category: 'korean',
    },
    {
      id: '2',
      name: '치킨마스터',
      description: '바삭한 치킨 전문점',
      rating: 4.8,
      deliveryTime: '20-30분',
      deliveryFee: 3000,
      imageUrl: 'https://via.placeholder.com/300x200',
      category: 'chicken',
    },
    {
      id: '3',
      name: '피자팰리스',
      description: '수제 피자 전문',
      rating: 4.3,
      deliveryTime: '30-40분',
      deliveryFee: 2000,
      imageUrl: 'https://via.placeholder.com/300x200',
      category: 'pizza',
    },
  ];

  // 필터된 레스토랑
  const filteredRestaurants = restaurants.filter(restaurant => {
    const matchesCategory = selectedCategory === 'all' || restaurant.category === selectedCategory;
    const matchesSearch = restaurant.name.toLowerCase().includes(searchText.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // 카테고리 렌더링
  const renderCategory = (category: Category) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryItem,
        selectedCategory === category.id && styles.categoryItemSelected,
      ]}
      onPress={() => setSelectedCategory(category.id)}
    >
      <Ionicons
        name={category.icon as any}
        size={24}
        color={selectedCategory === category.id ? '#ffffff' : '#666666'}
      />
      <Text
        style={[
          styles.categoryText,
          selectedCategory === category.id && styles.categoryTextSelected,
        ]}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  // 레스토랑 카드 렌더링
  const renderRestaurant = (restaurant: Restaurant) => (
    <TouchableOpacity
      key={restaurant.id}
      style={styles.restaurantCard}
      onPress={() => navigation.navigate('Restaurant', { restaurantId: restaurant.id })}
    >
      <Image source={{ uri: restaurant.imageUrl }} style={styles.restaurantImage} />
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{restaurant.name}</Text>
        <Text style={styles.restaurantDescription}>{restaurant.description}</Text>
        
        <View style={styles.restaurantMeta}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFB800" />
            <Text style={styles.ratingText}>{restaurant.rating}</Text>
          </View>
          
          <View style={styles.metaDivider} />
          
          <View style={styles.deliveryContainer}>
            <Ionicons name="time" size={16} color="#666666" />
            <Text style={styles.deliveryText}>{restaurant.deliveryTime}</Text>
          </View>
          
          <View style={styles.metaDivider} />
          
          <Text style={styles.deliveryFee}>
            배달비 {restaurant.deliveryFee.toLocaleString()}원
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.locationContainer}>
          <Ionicons name="location" size={20} color="#FF6B35" />
          <Text style={styles.locationText}>서울시 강남구</Text>
          <Ionicons name="chevron-down" size={16} color="#666666" />
        </View>
        
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications" size={24} color="#333333" />
        </TouchableOpacity>
      </View>

      {/* 검색바 */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666666" />
        <TextInput
          style={styles.searchInput}
          placeholder="음식점이나 메뉴를 검색하세요"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 배너 */}
        <View style={styles.bannerContainer}>
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>🎉 첫 주문 할인</Text>
            <Text style={styles.bannerSubtitle}>첫 주문 시 배달비 무료!</Text>
          </View>
        </View>

        {/* 카테고리 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>카테고리</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryContainer}
          >
            {categories.map(renderCategory)}
          </ScrollView>
        </View>

        {/* 추천 레스토랑 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedCategory === 'all' ? '추천 레스토랑' : `${categories.find(c => c.id === selectedCategory)?.name} 레스토랑`}
          </Text>
          {filteredRestaurants.length > 0 ? (
            filteredRestaurants.map(renderRestaurant)
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="sad" size={48} color="#cccccc" />
              <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
            </View>
          )}
        </View>

        {/* 인기 메뉴 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>인기 메뉴</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['김치찌개', '치킨', '피자', '짜장면', '떡볶이'].map((menu, index) => (
              <TouchableOpacity key={index} style={styles.popularMenuItem}>
                <View style={styles.popularMenuImage}>
                  <Ionicons name="restaurant" size={24} color="#FF6B35" />
                </View>
                <Text style={styles.popularMenuText}>{menu}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
    marginRight: 4,
    color: '#333333',
  },
  notificationButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#333333',
  },
  content: {
    flex: 1,
  },
  bannerContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  banner: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 20,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  categoryContainer: {
    paddingLeft: 16,
  },
  categoryItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    minWidth: 80,
  },
  categoryItemSelected: {
    backgroundColor: '#FF6B35',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
    marginTop: 4,
  },
  categoryTextSelected: {
    color: '#ffffff',
  },
  restaurantCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  restaurantImage: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  restaurantInfo: {
    padding: 16,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  restaurantDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginLeft: 4,
  },
  deliveryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 4,
  },
  deliveryFee: {
    fontSize: 14,
    color: '#666666',
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#cccccc',
    marginTop: 8,
  },
  popularMenuItem: {
    alignItems: 'center',
    marginLeft: 16,
    width: 80,
  },
  popularMenuImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff5f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  popularMenuText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333333',
    textAlign: 'center',
  },
}); 