/**
 * 메뉴 옵션 관리 서비스
 * 
 * 옵션 그룹 내의 개별 메뉴 옵션 생성, 수정, 삭제, 조회 등 옵션 관련 비즈니스 로직을 처리하는 서비스입니다.
 */

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  CreateMenuOptionDto, 
  UpdateMenuOptionDto, 
  MenuOptionResponse,
  ReorderOptionsDto
} from '../dto/menu-option.dto';

@Injectable()
export class MenuOptionService {
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
   * 메뉴 옵션 생성
   */
  async createMenuOption(optionGroupId: string, menuItemId: string, restaurantId: string, ownerId: string, createMenuOptionDto: CreateMenuOptionDto): Promise<MenuOptionResponse> {
    try {
      // 레스토랑 소유권 확인
      await this.verifyRestaurantOwnership(restaurantId, ownerId);

      // 옵션 그룹 존재 및 소속 확인
      await this.verifyOptionGroupOwnership(optionGroupId, menuItemId, restaurantId);

      // 메뉴 옵션 생성
      const { data, error } = await this.supabase
        .from('menu_options')
        .insert([
          {
            option_group_id: optionGroupId,
            name: createMenuOptionDto.name,
            description: createMenuOptionDto.description,
            additional_price: createMenuOptionDto.additionalPrice,
            stock_quantity: createMenuOptionDto.stockQuantity,
            is_out_of_stock: createMenuOptionDto.isOutOfStock || false,
            sort_order: createMenuOptionDto.sortOrder || 0,
            is_active: createMenuOptionDto.isActive ?? true,
            order_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`메뉴 옵션 생성에 실패했습니다: ${error.message}`);
      }

      return this.mapToMenuOptionResponse(data);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('메뉴 옵션 생성 중 오류가 발생했습니다.');
    }
  }

  /**
   * 옵션 그룹의 메뉴 옵션 목록 조회
   */
  async getMenuOptions(optionGroupId: string, menuItemId: string, restaurantId: string, includeInactive = false): Promise<MenuOptionResponse[]> {
    try {
      // 옵션 그룹 존재 및 소속 확인
      await this.verifyOptionGroupOwnership(optionGroupId, menuItemId, restaurantId);

      let query = this.supabase
        .from('menu_options')
        .select('*')
        .eq('option_group_id', optionGroupId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      // 비활성 옵션 제외
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        throw new BadRequestException(`메뉴 옵션 목록 조회에 실패했습니다: ${error.message}`);
      }

      return data.map(option => this.mapToMenuOptionResponse(option));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('메뉴 옵션 목록 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 특정 메뉴 옵션 조회
   */
  async getMenuOption(optionId: string, optionGroupId: string, menuItemId: string, restaurantId: string): Promise<MenuOptionResponse> {
    try {
      // 옵션 그룹 존재 및 소속 확인
      await this.verifyOptionGroupOwnership(optionGroupId, menuItemId, restaurantId);

      const { data, error } = await this.supabase
        .from('menu_options')
        .select('*')
        .eq('id', optionId)
        .eq('option_group_id', optionGroupId)
        .single();

      if (error || !data) {
        throw new NotFoundException('메뉴 옵션을 찾을 수 없습니다.');
      }

      return this.mapToMenuOptionResponse(data);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('메뉴 옵션 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 메뉴 옵션 수정
   */
  async updateMenuOption(optionId: string, optionGroupId: string, menuItemId: string, restaurantId: string, ownerId: string, updateMenuOptionDto: UpdateMenuOptionDto): Promise<MenuOptionResponse> {
    try {
      // 레스토랑 소유권 확인
      await this.verifyRestaurantOwnership(restaurantId, ownerId);

      // 메뉴 옵션 존재 확인
      await this.getMenuOption(optionId, optionGroupId, menuItemId, restaurantId);

      // 업데이트할 데이터 준비
      const updatePayload: any = {
        updated_at: new Date().toISOString(),
      };

      if (updateMenuOptionDto.name !== undefined) updatePayload.name = updateMenuOptionDto.name;
      if (updateMenuOptionDto.description !== undefined) updatePayload.description = updateMenuOptionDto.description;
      if (updateMenuOptionDto.additionalPrice !== undefined) updatePayload.additional_price = updateMenuOptionDto.additionalPrice;
      if (updateMenuOptionDto.stockQuantity !== undefined) updatePayload.stock_quantity = updateMenuOptionDto.stockQuantity;
      if (updateMenuOptionDto.isOutOfStock !== undefined) updatePayload.is_out_of_stock = updateMenuOptionDto.isOutOfStock;
      if (updateMenuOptionDto.sortOrder !== undefined) updatePayload.sort_order = updateMenuOptionDto.sortOrder;
      if (updateMenuOptionDto.isActive !== undefined) updatePayload.is_active = updateMenuOptionDto.isActive;

      const { data, error } = await this.supabase
        .from('menu_options')
        .update(updatePayload)
        .eq('id', optionId)
        .eq('option_group_id', optionGroupId)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`메뉴 옵션 수정에 실패했습니다: ${error.message}`);
      }

      return this.mapToMenuOptionResponse(data);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('메뉴 옵션 수정 중 오류가 발생했습니다.');
    }
  }

  /**
   * 메뉴 옵션 삭제
   */
  async deleteMenuOption(optionId: string, optionGroupId: string, menuItemId: string, restaurantId: string, ownerId: string): Promise<{ message: string }> {
    try {
      // 레스토랑 소유권 확인
      await this.verifyRestaurantOwnership(restaurantId, ownerId);

      // 메뉴 옵션 존재 확인
      await this.getMenuOption(optionId, optionGroupId, menuItemId, restaurantId);

      const { error } = await this.supabase
        .from('menu_options')
        .delete()
        .eq('id', optionId)
        .eq('option_group_id', optionGroupId);

      if (error) {
        throw new BadRequestException(`메뉴 옵션 삭제에 실패했습니다: ${error.message}`);
      }

      return { message: '메뉴 옵션이 성공적으로 삭제되었습니다.' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('메뉴 옵션 삭제 중 오류가 발생했습니다.');
    }
  }

  /**
   * 메뉴 옵션 순서 변경
   */
  async reorderMenuOptions(optionGroupId: string, menuItemId: string, restaurantId: string, ownerId: string, reorderOptionsDto: ReorderOptionsDto): Promise<{ message: string }> {
    try {
      // 레스토랑 소유권 확인
      await this.verifyRestaurantOwnership(restaurantId, ownerId);

      // 옵션 그룹 존재 및 소속 확인
      await this.verifyOptionGroupOwnership(optionGroupId, menuItemId, restaurantId);

      // 순서 변경을 위한 배치 업데이트
      const updates = Object.entries(reorderOptionsDto.optionOrders).map(([optionId, sortOrder]) => ({
        id: optionId,
        sort_order: sortOrder,
        updated_at: new Date().toISOString(),
      }));

      for (const update of updates) {
        const { error } = await this.supabase
          .from('menu_options')
          .update({
            sort_order: update.sort_order,
            updated_at: update.updated_at,
          })
          .eq('id', update.id)
          .eq('option_group_id', optionGroupId);

        if (error) {
          throw new BadRequestException(`옵션 순서 변경에 실패했습니다: ${error.message}`);
        }
      }

      return { message: '메뉴 옵션 순서가 성공적으로 변경되었습니다.' };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('메뉴 옵션 순서 변경 중 오류가 발생했습니다.');
    }
  }

  /**
   * 메뉴 옵션 품절 상태 변경
   */
  async updateStockStatus(optionId: string, optionGroupId: string, menuItemId: string, restaurantId: string, ownerId: string, isOutOfStock: boolean): Promise<MenuOptionResponse> {
    try {
      // 레스토랑 소유권 확인
      await this.verifyRestaurantOwnership(restaurantId, ownerId);

      const { data, error } = await this.supabase
        .from('menu_options')
        .update({
          is_out_of_stock: isOutOfStock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', optionId)
        .eq('option_group_id', optionGroupId)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`메뉴 옵션 품절 상태 변경에 실패했습니다: ${error.message}`);
      }

      if (!data) {
        throw new NotFoundException('메뉴 옵션을 찾을 수 없습니다.');
      }

      return this.mapToMenuOptionResponse(data);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('메뉴 옵션 품절 상태 변경 중 오류가 발생했습니다.');
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
   * 옵션 그룹 소유권 확인
   */
  private async verifyOptionGroupOwnership(optionGroupId: string, menuItemId: string, restaurantId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('menu_option_groups')
      .select(`
        id,
        menu_items!inner(id, restaurant_id)
      `)
      .eq('id', optionGroupId)
      .eq('menu_item_id', menuItemId)
      .eq('menu_items.restaurant_id', restaurantId)
      .single();

    if (error || !data) {
      throw new BadRequestException('해당 옵션 그룹을 찾을 수 없거나 이 레스토랑에 속하지 않습니다.');
    }
  }

  /**
   * 데이터베이스 레코드를 MenuOptionResponse로 변환
   */
  private mapToMenuOptionResponse(data: any): MenuOptionResponse {
    return {
      id: data.id,
      optionGroupId: data.option_group_id,
      name: data.name,
      description: data.description,
      additionalPrice: data.additional_price,
      stockQuantity: data.stock_quantity,
      isOutOfStock: data.is_out_of_stock,
      sortOrder: data.sort_order,
      isActive: data.is_active,
      orderCount: data.order_count || 0,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
} 