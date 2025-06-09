/**
 * 메뉴 아이템 관리 서비스
 * 
 * 메뉴 아이템의 생성, 수정, 삭제, 조회 등 메뉴 아이템 관련 비즈니스 로직을 처리하는 서비스입니다.
 */

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MenuItem } from '@delivery-platform/shared/src/types/restaurant';
import { 
  CreateMenuItemDto, 
  UpdateMenuItemDto, 
  MenuItemFilterDto,
  MenuItemResponse, 
  MenuItemStatus 
} from '../dto/menu-item.dto';

@Injectable()
export class MenuItemService {
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
   * 메뉴 아이템 생성
   */
  async createMenuItem(restaurantId: string, ownerId: string, createMenuItemDto: CreateMenuItemDto): Promise<MenuItemResponse> {
    try {
      // 레스토랑 소유권 확인
      await this.verifyRestaurantOwnership(restaurantId, ownerId);

      // 카테고리 존재 및 소속 확인
      await this.verifyCategoryOwnership(createMenuItemDto.categoryId, restaurantId);

      // 할인 가격 검증
      if (createMenuItemDto.discountPrice && createMenuItemDto.discountPrice >= createMenuItemDto.price) {
        throw new BadRequestException('할인 가격은 기본 가격보다 낮아야 합니다.');
      }

      // 메뉴 아이템 생성
      const { data, error } = await this.supabase
        .from('menu_items')
        .insert([
          {
            restaurant_id: restaurantId,
            category_id: createMenuItemDto.categoryId,
            name: createMenuItemDto.name,
            description: createMenuItemDto.description,
            price: createMenuItemDto.price,
            discount_price: createMenuItemDto.discountPrice,
            status: createMenuItemDto.status || MenuItemStatus.AVAILABLE,
            is_recommended: createMenuItemDto.isRecommended || false,
            is_popular: createMenuItemDto.isPopular || false,
            spicy_level: createMenuItemDto.spicyLevel,
            preparation_time: createMenuItemDto.preparationTime,
            calories: createMenuItemDto.calories,
            allergens: createMenuItemDto.allergens || [],
            nutrition_info: createMenuItemDto.nutritionInfo || {},
            sort_order: createMenuItemDto.sortOrder || 0,
            is_active: createMenuItemDto.isActive ?? true,
            view_count: 0,
            order_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select(`
          *,
          menu_categories!inner(name)
        `)
        .single();

      if (error) {
        throw new BadRequestException(`메뉴 아이템 생성에 실패했습니다: ${error.message}`);
      }

      return this.mapToMenuItemResponse(data);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('메뉴 아이템 생성 중 오류가 발생했습니다.');
    }
  }

  /**
   * 레스토랑의 메뉴 아이템 목록 조회
   */
  async getMenuItems(restaurantId: string, filter: MenuItemFilterDto): Promise<{
    items: MenuItemResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const page = filter.page || 1;
      const limit = filter.limit || 20;
      const offset = (page - 1) * limit;

      let query = this.supabase
        .from('menu_items')
        .select(`
          *,
          menu_categories!inner(name),
          restaurant_images(id, url, thumbnail_url, is_primary)
        `, { count: 'exact' })
        .eq('restaurant_id', restaurantId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // 필터 적용
      if (filter.categoryId) {
        query = query.eq('category_id', filter.categoryId);
      }

      if (filter.status) {
        query = query.eq('status', filter.status);
      }

      if (filter.isRecommended !== undefined) {
        query = query.eq('is_recommended', filter.isRecommended);
      }

      if (filter.isPopular !== undefined) {
        query = query.eq('is_popular', filter.isPopular);
      }

      if (filter.search) {
        query = query.or(`name.ilike.%${filter.search}%,description.ilike.%${filter.search}%`);
      }

      // 비활성 메뉴 제외 (관리자가 아닌 경우)
      query = query.eq('is_active', true);

      const { data, error, count } = await query;

      if (error) {
        throw new BadRequestException(`메뉴 아이템 목록 조회에 실패했습니다: ${error.message}`);
      }

      const items = data.map(item => this.mapToMenuItemResponse(item));
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        items,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('메뉴 아이템 목록 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 특정 메뉴 아이템 조회
   */
  async getMenuItem(menuItemId: string, restaurantId: string): Promise<MenuItemResponse> {
    try {
      const { data, error } = await this.supabase
        .from('menu_items')
        .select(`
          *,
          menu_categories!inner(name),
          restaurant_images(id, url, thumbnail_url, is_primary)
        `)
        .eq('id', menuItemId)
        .eq('restaurant_id', restaurantId)
        .single();

      if (error || !data) {
        throw new NotFoundException('메뉴 아이템을 찾을 수 없습니다.');
      }

      // 조회수 증가
      await this.incrementViewCount(menuItemId);

      return this.mapToMenuItemResponse(data);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('메뉴 아이템 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 메뉴 아이템 수정
   */
  async updateMenuItem(menuItemId: string, restaurantId: string, ownerId: string, updateMenuItemDto: UpdateMenuItemDto): Promise<MenuItemResponse> {
    try {
      // 레스토랑 소유권 확인
      await this.verifyRestaurantOwnership(restaurantId, ownerId);

      // 메뉴 아이템 존재 확인
      await this.getMenuItem(menuItemId, restaurantId);

      // 카테고리 변경 시 검증
      if (updateMenuItemDto.categoryId) {
        await this.verifyCategoryOwnership(updateMenuItemDto.categoryId, restaurantId);
      }

      // 할인 가격 검증
      if (updateMenuItemDto.discountPrice !== undefined && updateMenuItemDto.price !== undefined) {
        if (updateMenuItemDto.discountPrice >= updateMenuItemDto.price) {
          throw new BadRequestException('할인 가격은 기본 가격보다 낮아야 합니다.');
        }
      }

      // 업데이트할 데이터 준비
      const updatePayload: any = {
        updated_at: new Date().toISOString(),
      };

      if (updateMenuItemDto.name !== undefined) updatePayload.name = updateMenuItemDto.name;
      if (updateMenuItemDto.description !== undefined) updatePayload.description = updateMenuItemDto.description;
      if (updateMenuItemDto.price !== undefined) updatePayload.price = updateMenuItemDto.price;
      if (updateMenuItemDto.discountPrice !== undefined) updatePayload.discount_price = updateMenuItemDto.discountPrice;
      if (updateMenuItemDto.categoryId !== undefined) updatePayload.category_id = updateMenuItemDto.categoryId;
      if (updateMenuItemDto.status !== undefined) updatePayload.status = updateMenuItemDto.status;
      if (updateMenuItemDto.isRecommended !== undefined) updatePayload.is_recommended = updateMenuItemDto.isRecommended;
      if (updateMenuItemDto.isPopular !== undefined) updatePayload.is_popular = updateMenuItemDto.isPopular;
      if (updateMenuItemDto.spicyLevel !== undefined) updatePayload.spicy_level = updateMenuItemDto.spicyLevel;
      if (updateMenuItemDto.preparationTime !== undefined) updatePayload.preparation_time = updateMenuItemDto.preparationTime;
      if (updateMenuItemDto.calories !== undefined) updatePayload.calories = updateMenuItemDto.calories;
      if (updateMenuItemDto.allergens !== undefined) updatePayload.allergens = updateMenuItemDto.allergens;
      if (updateMenuItemDto.nutritionInfo !== undefined) updatePayload.nutrition_info = updateMenuItemDto.nutritionInfo;
      if (updateMenuItemDto.sortOrder !== undefined) updatePayload.sort_order = updateMenuItemDto.sortOrder;
      if (updateMenuItemDto.isActive !== undefined) updatePayload.is_active = updateMenuItemDto.isActive;

      const { data, error } = await this.supabase
        .from('menu_items')
        .update(updatePayload)
        .eq('id', menuItemId)
        .eq('restaurant_id', restaurantId)
        .select(`
          *,
          menu_categories!inner(name),
          restaurant_images(id, url, thumbnail_url, is_primary)
        `)
        .single();

      if (error) {
        throw new BadRequestException(`메뉴 아이템 수정에 실패했습니다: ${error.message}`);
      }

      return this.mapToMenuItemResponse(data);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('메뉴 아이템 수정 중 오류가 발생했습니다.');
    }
  }

  /**
   * 메뉴 아이템 삭제
   */
  async deleteMenuItem(menuItemId: string, restaurantId: string, ownerId: string): Promise<{ message: string }> {
    try {
      // 레스토랑 소유권 확인
      await this.verifyRestaurantOwnership(restaurantId, ownerId);

      // 메뉴 아이템 존재 확인
      await this.getMenuItem(menuItemId, restaurantId);

      // 실제로는 비활성화로 처리 (주문 이력 보존)
      const { error } = await this.supabase
        .from('menu_items')
        .update({
          is_active: false,
          status: MenuItemStatus.DISCONTINUED,
          updated_at: new Date().toISOString(),
        })
        .eq('id', menuItemId)
        .eq('restaurant_id', restaurantId);

      if (error) {
        throw new BadRequestException(`메뉴 아이템 삭제에 실패했습니다: ${error.message}`);
      }

      return { message: '메뉴 아이템이 성공적으로 삭제되었습니다.' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('메뉴 아이템 삭제 중 오류가 발생했습니다.');
    }
  }

  /**
   * 메뉴 아이템 상태 변경
   */
  async updateMenuItemStatus(menuItemId: string, restaurantId: string, ownerId: string, status: MenuItemStatus): Promise<MenuItemResponse> {
    try {
      // 레스토랑 소유권 확인
      await this.verifyRestaurantOwnership(restaurantId, ownerId);

      const { data, error } = await this.supabase
        .from('menu_items')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', menuItemId)
        .eq('restaurant_id', restaurantId)
        .select(`
          *,
          menu_categories!inner(name),
          restaurant_images(id, url, thumbnail_url, is_primary)
        `)
        .single();

      if (error) {
        throw new BadRequestException(`메뉴 아이템 상태 변경에 실패했습니다: ${error.message}`);
      }

      if (!data) {
        throw new NotFoundException('메뉴 아이템을 찾을 수 없습니다.');
      }

      return this.mapToMenuItemResponse(data);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('메뉴 아이템 상태 변경 중 오류가 발생했습니다.');
    }
  }

  /**
   * 조회수 증가
   */
  private async incrementViewCount(menuItemId: string): Promise<void> {
    await this.supabase
      .from('menu_items')
      .update({
        view_count: this.supabase.rpc('increment', { row_id: menuItemId, column_name: 'view_count' }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', menuItemId);
  }

  /**
   * 레스토랑 소유권 확인
   */
  private async verifyRestaurantOwnership(restaurantId: string, ownerId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('restaurants')
      .select('id')
      .eq('id', restaurantId)
      .eq('owner_id', ownerId)
      .single();

    if (error || !data) {
      throw new ForbiddenException('해당 레스토랑에 대한 권한이 없습니다.');
    }
  }

  /**
   * 카테고리 소유권 확인
   */
  private async verifyCategoryOwnership(categoryId: string, restaurantId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('menu_categories')
      .select('id')
      .eq('id', categoryId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (error || !data) {
      throw new BadRequestException('해당 카테고리를 찾을 수 없거나 이 레스토랑에 속하지 않습니다.');
    }
  }

  /**
   * 데이터베이스 레코드를 MenuItemResponse로 변환
   */
  private mapToMenuItemResponse(data: any): MenuItemResponse {
    return {
      id: data.id,
      restaurantId: data.restaurant_id,
      categoryId: data.category_id,
      categoryName: data.menu_categories?.name || '',
      name: data.name,
      description: data.description,
      price: data.price,
      discountPrice: data.discount_price,
      status: data.status,
      isRecommended: data.is_recommended,
      isPopular: data.is_popular,
      spicyLevel: data.spicy_level,
      preparationTime: data.preparation_time,
      calories: data.calories,
      allergens: data.allergens || [],
      nutritionInfo: data.nutrition_info || {},
      images: (data.restaurant_images || []).map((img: any) => ({
        id: img.id,
        url: img.url,
        thumbnailUrl: img.thumbnail_url,
        isPrimary: img.is_primary,
      })),
      sortOrder: data.sort_order,
      isActive: data.is_active,
      viewCount: data.view_count || 0,
      orderCount: data.order_count || 0,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
} 