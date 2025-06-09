/**
 * 카테고리 관리 서비스
 * 
 * 레스토랑의 메뉴 카테고리 생성, 수정, 삭제, 순서 변경 등을 처리하는 서비스입니다.
 */

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MenuCategory } from '@delivery-platform/shared/src/types/restaurant';
import { CreateMenuCategoryDto, UpdateMenuCategoryDto, ReorderCategoriesDto, MenuCategoryResponse } from '../dto/category.dto';

@Injectable()
export class CategoryService {
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
   * 메뉴 카테고리 생성
   */
  async createMenuCategory(restaurantId: string, ownerId: string, createCategoryDto: CreateMenuCategoryDto): Promise<MenuCategoryResponse> {
    try {
      // 레스토랑 소유권 확인
      await this.verifyRestaurantOwnership(restaurantId, ownerId);

      // 카테고리 생성
      const { data, error } = await this.supabase
        .from('menu_categories')
        .insert([
          {
            restaurant_id: restaurantId,
            name: createCategoryDto.name,
            description: createCategoryDto.description,
            sort_order: createCategoryDto.sortOrder,
            is_active: createCategoryDto.isActive ?? true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`카테고리 생성에 실패했습니다: ${error.message}`);
      }

      return this.mapToMenuCategoryResponse(data);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('카테고리 생성 중 오류가 발생했습니다.');
    }
  }

  /**
   * 레스토랑의 메뉴 카테고리 목록 조회
   */
  async getMenuCategories(restaurantId: string, includeInactive = false): Promise<MenuCategoryResponse[]> {
    try {
      let query = this.supabase
        .from('menu_categories')
        .select(`
          *,
          menu_items(count)
        `)
        .eq('restaurant_id', restaurantId)
        .order('sort_order', { ascending: true });

      // 비활성 카테고리 제외
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        throw new BadRequestException(`카테고리 목록 조회에 실패했습니다: ${error.message}`);
      }

      return data.map(category => this.mapToMenuCategoryResponse(category));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('카테고리 목록 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 특정 메뉴 카테고리 조회
   */
  async getMenuCategory(categoryId: string, restaurantId: string): Promise<MenuCategoryResponse> {
    try {
      const { data, error } = await this.supabase
        .from('menu_categories')
        .select(`
          *,
          menu_items(count)
        `)
        .eq('id', categoryId)
        .eq('restaurant_id', restaurantId)
        .single();

      if (error || !data) {
        throw new NotFoundException('카테고리를 찾을 수 없습니다.');
      }

      return this.mapToMenuCategoryResponse(data);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('카테고리 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 메뉴 카테고리 수정
   */
  async updateMenuCategory(categoryId: string, restaurantId: string, ownerId: string, updateCategoryDto: UpdateMenuCategoryDto): Promise<MenuCategoryResponse> {
    try {
      // 레스토랑 소유권 확인
      await this.verifyRestaurantOwnership(restaurantId, ownerId);

      // 카테고리 존재 확인
      await this.getMenuCategory(categoryId, restaurantId);

      // 업데이트할 데이터 준비
      const updatePayload: any = {
        updated_at: new Date().toISOString(),
      };

      if (updateCategoryDto.name !== undefined) updatePayload.name = updateCategoryDto.name;
      if (updateCategoryDto.description !== undefined) updatePayload.description = updateCategoryDto.description;
      if (updateCategoryDto.sortOrder !== undefined) updatePayload.sort_order = updateCategoryDto.sortOrder;
      if (updateCategoryDto.isActive !== undefined) updatePayload.is_active = updateCategoryDto.isActive;

      const { data, error } = await this.supabase
        .from('menu_categories')
        .update(updatePayload)
        .eq('id', categoryId)
        .eq('restaurant_id', restaurantId)
        .select(`
          *,
          menu_items(count)
        `)
        .single();

      if (error) {
        throw new BadRequestException(`카테고리 수정에 실패했습니다: ${error.message}`);
      }

      return this.mapToMenuCategoryResponse(data);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('카테고리 수정 중 오류가 발생했습니다.');
    }
  }

  /**
   * 메뉴 카테고리 삭제
   */
  async deleteMenuCategory(categoryId: string, restaurantId: string, ownerId: string): Promise<{ message: string }> {
    try {
      // 레스토랑 소유권 확인
      await this.verifyRestaurantOwnership(restaurantId, ownerId);

      // 카테고리 존재 확인
      const category = await this.getMenuCategory(categoryId, restaurantId);

      // 카테고리에 메뉴가 있는지 확인
      if (category.menuItemCount > 0) {
        throw new BadRequestException('메뉴가 있는 카테고리는 삭제할 수 없습니다. 먼저 메뉴를 다른 카테고리로 이동하거나 삭제해주세요.');
      }

      const { error } = await this.supabase
        .from('menu_categories')
        .delete()
        .eq('id', categoryId)
        .eq('restaurant_id', restaurantId);

      if (error) {
        throw new BadRequestException(`카테고리 삭제에 실패했습니다: ${error.message}`);
      }

      return { message: '카테고리가 성공적으로 삭제되었습니다.' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('카테고리 삭제 중 오류가 발생했습니다.');
    }
  }

  /**
   * 카테고리 순서 변경
   */
  async reorderCategories(restaurantId: string, ownerId: string, reorderDto: ReorderCategoriesDto): Promise<{ message: string }> {
    try {
      // 레스토랑 소유권 확인
      await this.verifyRestaurantOwnership(restaurantId, ownerId);

      // 트랜잭션으로 순서 업데이트
      const updates = Object.entries(reorderDto.categoryOrders).map(([categoryId, sortOrder]) => ({
        id: categoryId,
        sort_order: sortOrder,
        updated_at: new Date().toISOString(),
      }));

      for (const update of updates) {
        const { error } = await this.supabase
          .from('menu_categories')
          .update({
            sort_order: update.sort_order,
            updated_at: update.updated_at,
          })
          .eq('id', update.id)
          .eq('restaurant_id', restaurantId);

        if (error) {
          throw new BadRequestException(`카테고리 순서 변경에 실패했습니다: ${error.message}`);
        }
      }

      return { message: '카테고리 순서가 성공적으로 변경되었습니다.' };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('카테고리 순서 변경 중 오류가 발생했습니다.');
    }
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
   * 데이터베이스 레코드를 MenuCategoryResponse로 변환
   */
  private mapToMenuCategoryResponse(data: any): MenuCategoryResponse {
    return {
      id: data.id,
      restaurantId: data.restaurant_id,
      name: data.name,
      description: data.description,
      sortOrder: data.sort_order,
      isActive: data.is_active,
      menuItemCount: data.menu_items?.[0]?.count || 0,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
} 