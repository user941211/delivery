/**
 * 레스토랑 관리 서비스
 * 
 * 레스토랑 등록, 수정, 조회, 삭제 등 레스토랑 관련 비즈니스 로직을 처리하는 서비스입니다.
 */

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Restaurant, RestaurantStatus } from '@delivery-platform/shared/src/types/restaurant';
import { CreateRestaurantDto, UpdateRestaurantDto } from './dto/restaurant.dto';

@Injectable()
export class RestaurantsService {
  private readonly supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    // Supabase 클라이언트 초기화
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is missing');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * 새 레스토랑 등록
   */
  async createRestaurant(ownerId: string, createRestaurantDto: CreateRestaurantDto): Promise<Restaurant> {
    try {
      // 사업자 등록번호 중복 확인
      await this.checkBusinessRegistrationNumber(createRestaurantDto.businessRegistrationNumber);

      // 레스토랑 데이터 생성
      const { data, error } = await this.supabase
        .from('restaurants')
        .insert([
          {
            name: createRestaurantDto.name,
            description: createRestaurantDto.description,
            business_registration_number: createRestaurantDto.businessRegistrationNumber,
            owner_id: ownerId,
            address: {
              zip_code: createRestaurantDto.address.zipCode,
              province: '', // TODO: 주소에서 추출
              city: '', // TODO: 주소에서 추출
              district: '', // TODO: 주소에서 추출
              detail: createRestaurantDto.address.detailAddress || '',
              full_address: createRestaurantDto.address.address,
              latitude: createRestaurantDto.address.latitude,
              longitude: createRestaurantDto.address.longitude,
            },
            contact: {
              phone: createRestaurantDto.contact.phone,
              email: createRestaurantDto.contact.email,
              alternative_phone: createRestaurantDto.contact.website, // 임시로 website를 alternative_phone에 저장
            },
            status: 'pending_approval' as RestaurantStatus,
            business_hours: createRestaurantDto.businessHours.map(hours => ({
              day_of_week: hours.dayOfWeek,
              open_time: hours.openTime,
              close_time: hours.closeTime,
              is_closed: hours.isClosed || false,
            })),
            delivery_types: createRestaurantDto.deliveryTypes,
            minimum_order_amount: createRestaurantDto.minimumOrderAmount,
            delivery_fee: createRestaurantDto.deliveryFee,
            delivery_radius: createRestaurantDto.deliveryRadius,
            preparation_time: createRestaurantDto.preparationTime,
            category_ids: createRestaurantDto.categoryIds,
            images: [],
            thumbnail_url: '',
            rating: {
              average: 0,
              count: 0,
            },
            total_orders: 0,
            monthly_orders: 0,
            promotions: [],
            menu_categories: [],
            special_info: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            joined_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`레스토랑 등록에 실패했습니다: ${error.message}`);
      }

      return this.mapToRestaurant(data);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('레스토랑 등록 중 오류가 발생했습니다.');
    }
  }

  /**
   * 레스토랑 목록 조회 (점주용)
   */
  async getOwnerRestaurants(ownerId: string): Promise<Restaurant[]> {
    try {
      const { data, error } = await this.supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new BadRequestException(`레스토랑 목록 조회에 실패했습니다: ${error.message}`);
      }

      return data.map(restaurant => this.mapToRestaurant(restaurant));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('레스토랑 목록 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 특정 레스토랑 조회
   */
  async getRestaurant(restaurantId: string, ownerId?: string): Promise<Restaurant> {
    try {
      let query = this.supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId);

      // 점주용 조회인 경우 소유권 확인
      if (ownerId) {
        query = query.eq('owner_id', ownerId);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        throw new NotFoundException('레스토랑을 찾을 수 없습니다.');
      }

      return this.mapToRestaurant(data);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('레스토랑 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 레스토랑 정보 수정
   */
  async updateRestaurant(restaurantId: string, ownerId: string, updateRestaurantDto: UpdateRestaurantDto): Promise<Restaurant> {
    try {
      // 소유권 확인
      await this.getRestaurant(restaurantId, ownerId);

      // 업데이트할 데이터 준비
      const updatePayload: any = {
        updated_at: new Date().toISOString(),
      };

      if (updateRestaurantDto.name !== undefined) updatePayload.name = updateRestaurantDto.name;
      if (updateRestaurantDto.description !== undefined) updatePayload.description = updateRestaurantDto.description;
      
      if (updateRestaurantDto.contact !== undefined) {
        updatePayload.contact = {
          phone: updateRestaurantDto.contact.phone,
          email: updateRestaurantDto.contact.email,
          alternative_phone: updateRestaurantDto.contact.website, // 임시로 website를 alternative_phone에 저장
        };
      }

      if (updateRestaurantDto.businessHours !== undefined) {
        updatePayload.business_hours = updateRestaurantDto.businessHours.map(hours => ({
          day_of_week: hours.dayOfWeek,
          open_time: hours.openTime,
          close_time: hours.closeTime,
          is_closed: hours.isClosed || false,
        }));
      }

      if (updateRestaurantDto.deliveryTypes !== undefined) updatePayload.delivery_types = updateRestaurantDto.deliveryTypes;
      if (updateRestaurantDto.minimumOrderAmount !== undefined) updatePayload.minimum_order_amount = updateRestaurantDto.minimumOrderAmount;
      if (updateRestaurantDto.deliveryFee !== undefined) updatePayload.delivery_fee = updateRestaurantDto.deliveryFee;
      if (updateRestaurantDto.deliveryRadius !== undefined) updatePayload.delivery_radius = updateRestaurantDto.deliveryRadius;
      if (updateRestaurantDto.preparationTime !== undefined) updatePayload.preparation_time = updateRestaurantDto.preparationTime;

      const { data, error } = await this.supabase
        .from('restaurants')
        .update(updatePayload)
        .eq('id', restaurantId)
        .eq('owner_id', ownerId)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`레스토랑 정보 수정에 실패했습니다: ${error.message}`);
      }

      return this.mapToRestaurant(data);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('레스토랑 정보 수정 중 오류가 발생했습니다.');
    }
  }

  /**
   * 레스토랑 상태 변경
   */
  async updateRestaurantStatus(restaurantId: string, ownerId: string, status: RestaurantStatus): Promise<Restaurant> {
    try {
      // 소유권 확인
      await this.getRestaurant(restaurantId, ownerId);

      // 점주는 운영 상태만 변경 가능 (active, inactive)
      if (!['active', 'inactive'].includes(status)) {
        throw new ForbiddenException('해당 상태로 변경할 권한이 없습니다.');
      }

      const { data, error } = await this.supabase
        .from('restaurants')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', restaurantId)
        .eq('owner_id', ownerId)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`레스토랑 상태 변경에 실패했습니다: ${error.message}`);
      }

      return this.mapToRestaurant(data);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('레스토랑 상태 변경 중 오류가 발생했습니다.');
    }
  }

  /**
   * 레스토랑 삭제 (실제로는 비활성화)
   */
  async deleteRestaurant(restaurantId: string, ownerId: string): Promise<{ message: string }> {
    try {
      // 소유권 확인
      await this.getRestaurant(restaurantId, ownerId);

      const { error } = await this.supabase
        .from('restaurants')
        .update({
          status: 'inactive',
          updated_at: new Date().toISOString(),
        })
        .eq('id', restaurantId)
        .eq('owner_id', ownerId);

      if (error) {
        throw new BadRequestException(`레스토랑 삭제에 실패했습니다: ${error.message}`);
      }

      return { message: '레스토랑이 성공적으로 삭제되었습니다.' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('레스토랑 삭제 중 오류가 발생했습니다.');
    }
  }

  /**
   * 현재 영업 상태 확인
   */
  async isRestaurantOpen(restaurantId: string): Promise<boolean> {
    try {
      const restaurant = await this.getRestaurant(restaurantId);
      
      if (restaurant.status !== 'active') {
        return false;
      }

      const now = new Date();
      const dayOfWeek = now.getDay();
      const currentTime = now.toTimeString().slice(0, 5); // HH:mm 형식

      const todayHours = restaurant.businessHours.find(hours => hours.dayOfWeek === dayOfWeek);
      
      if (!todayHours || todayHours.isClosed) {
        return false;
      }

      return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
    } catch (error) {
      return false;
    }
  }

  /**
   * 사업자 등록번호 중복 확인
   */
  private async checkBusinessRegistrationNumber(businessRegistrationNumber: string): Promise<void> {
    const { data } = await this.supabase
      .from('restaurants')
      .select('id')
      .eq('business_registration_number', businessRegistrationNumber)
      .single();

    if (data) {
      throw new BadRequestException('이미 등록된 사업자 등록번호입니다.');
    }
  }

  /**
   * 데이터베이스 레코드를 Restaurant 객체로 변환
   */
  private mapToRestaurant(data: any): Restaurant {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      businessRegistrationNumber: data.business_registration_number,
      ownerId: data.owner_id,
      address: {
        zipCode: data.address?.zip_code || '',
        province: data.address?.province || '',
        city: data.address?.city || '',
        district: data.address?.district || '',
        detail: data.address?.detail || '',
        fullAddress: data.address?.full_address || '',
      },
      contact: {
        phone: data.contact?.phone,
        email: data.contact?.email,
        alternativePhone: data.contact?.alternative_phone,
      },
      status: data.status,
      images: data.images || [],
      thumbnailUrl: data.thumbnail_url || '',
      rating: data.rating || { average: 0, count: 0 },
      businessHours: (data.business_hours || []).map((hours: any) => ({
        dayOfWeek: hours.day_of_week,
        openTime: hours.open_time,
        closeTime: hours.close_time,
        isClosed: hours.is_closed || false,
      })),
      deliveryTypes: data.delivery_types || [],
      minimumOrderAmount: data.minimum_order_amount || 0,
      deliveryFee: data.delivery_fee || 0,
      deliveryRadius: data.delivery_radius || 0,
      preparationTime: data.preparation_time || 20,
      categories: data.category_ids ? data.category_ids.map((id: string) => ({ id, name: '', description: '', sortOrder: 0 })) : [],
      menuCategories: data.menu_categories || [],
      specialInfo: data.special_info || {},
      promotions: data.promotions || [],
      totalOrders: data.total_orders || 0,
      monthlyOrders: data.monthly_orders || 0,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      joinedAt: new Date(data.joined_at),
    };
  }
} 