/**
 * 옵션 그룹 관리 서비스
 * 
 * 메뉴 아이템의 옵션 그룹 생성, 수정, 삭제, 조회 등 옵션 그룹 관련 비즈니스 로직을 처리하는 서비스입니다.
 */

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  CreateOptionGroupDto, 
  UpdateOptionGroupDto, 
  OptionGroupResponse,
  OptionGroupType
} from '../dto/menu-option.dto';

@Injectable()
export class OptionGroupService {
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
   * 옵션 그룹 생성
   */
  async createOptionGroup(menuItemId: string, restaurantId: string, ownerId: string, createOptionGroupDto: CreateOptionGroupDto): Promise<OptionGroupResponse> {
    try {
      // 레스토랑 소유권 확인
      await this.verifyRestaurantOwnership(restaurantId, ownerId);

      // 메뉴 아이템 존재 및 소속 확인
      await this.verifyMenuItemOwnership(menuItemId, restaurantId);

      // 다중 선택에 대한 유효성 검증
      if (createOptionGroupDto.type === OptionGroupType.MULTIPLE) {
        if (createOptionGroupDto.minSelections && createOptionGroupDto.maxSelections) {
          if (createOptionGroupDto.minSelections > createOptionGroupDto.maxSelections) {
            throw new BadRequestException('최소 선택 개수는 최대 선택 개수보다 작거나 같아야 합니다.');
          }
        }
      } else {
        // 단일 선택인 경우 선택 개수 설정은 무시
        createOptionGroupDto.minSelections = undefined;
        createOptionGroupDto.maxSelections = undefined;
      }

      // 옵션 그룹 생성
      const { data, error } = await this.supabase
        .from('menu_option_groups')
        .insert([
          {
            menu_item_id: menuItemId,
            name: createOptionGroupDto.name,
            description: createOptionGroupDto.description,
            type: createOptionGroupDto.type,
            is_required: createOptionGroupDto.isRequired || false,
            min_selections: createOptionGroupDto.minSelections,
            max_selections: createOptionGroupDto.maxSelections,
            sort_order: createOptionGroupDto.sortOrder || 0,
            is_active: createOptionGroupDto.isActive ?? true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`옵션 그룹 생성에 실패했습니다: ${error.message}`);
      }

      return this.mapToOptionGroupResponse(data);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('옵션 그룹 생성 중 오류가 발생했습니다.');
    }
  }

  /**
   * 메뉴 아이템의 옵션 그룹 목록 조회
   */
  async getOptionGroups(menuItemId: string, restaurantId: string, includeInactive = false): Promise<OptionGroupResponse[]> {
    try {
      // 메뉴 아이템 존재 및 소속 확인
      await this.verifyMenuItemOwnership(menuItemId, restaurantId);

      let query = this.supabase
        .from('menu_option_groups')
        .select(`
          *,
          menu_options(
            id,
            name,
            description,
            additional_price,
            stock_quantity,
            is_out_of_stock,
            sort_order,
            is_active,
            order_count,
            created_at,
            updated_at
          )
        `)
        .eq('menu_item_id', menuItemId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      // 비활성 옵션 그룹 제외
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        throw new BadRequestException(`옵션 그룹 목록 조회에 실패했습니다: ${error.message}`);
      }

      return data.map(group => this.mapToOptionGroupResponse(group));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('옵션 그룹 목록 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 특정 옵션 그룹 조회
   */
  async getOptionGroup(optionGroupId: string, menuItemId: string, restaurantId: string): Promise<OptionGroupResponse> {
    try {
      // 메뉴 아이템 존재 및 소속 확인
      await this.verifyMenuItemOwnership(menuItemId, restaurantId);

      const { data, error } = await this.supabase
        .from('menu_option_groups')
        .select(`
          *,
          menu_options(
            id,
            name,
            description,
            additional_price,
            stock_quantity,
            is_out_of_stock,
            sort_order,
            is_active,
            order_count,
            created_at,
            updated_at
          )
        `)
        .eq('id', optionGroupId)
        .eq('menu_item_id', menuItemId)
        .single();

      if (error || !data) {
        throw new NotFoundException('옵션 그룹을 찾을 수 없습니다.');
      }

      return this.mapToOptionGroupResponse(data);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('옵션 그룹 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 옵션 그룹 수정
   */
  async updateOptionGroup(optionGroupId: string, menuItemId: string, restaurantId: string, ownerId: string, updateOptionGroupDto: UpdateOptionGroupDto): Promise<OptionGroupResponse> {
    try {
      // 레스토랑 소유권 확인
      await this.verifyRestaurantOwnership(restaurantId, ownerId);

      // 옵션 그룹 존재 확인
      await this.getOptionGroup(optionGroupId, menuItemId, restaurantId);

      // 다중 선택에 대한 유효성 검증
      if (updateOptionGroupDto.type === OptionGroupType.MULTIPLE) {
        if (updateOptionGroupDto.minSelections && updateOptionGroupDto.maxSelections) {
          if (updateOptionGroupDto.minSelections > updateOptionGroupDto.maxSelections) {
            throw new BadRequestException('최소 선택 개수는 최대 선택 개수보다 작거나 같아야 합니다.');
          }
        }
      } else if (updateOptionGroupDto.type === OptionGroupType.SINGLE) {
        // 단일 선택으로 변경하는 경우 선택 개수 설정 초기화
        updateOptionGroupDto.minSelections = undefined;
        updateOptionGroupDto.maxSelections = undefined;
      }

      // 업데이트할 데이터 준비
      const updatePayload: any = {
        updated_at: new Date().toISOString(),
      };

      if (updateOptionGroupDto.name !== undefined) updatePayload.name = updateOptionGroupDto.name;
      if (updateOptionGroupDto.description !== undefined) updatePayload.description = updateOptionGroupDto.description;
      if (updateOptionGroupDto.type !== undefined) updatePayload.type = updateOptionGroupDto.type;
      if (updateOptionGroupDto.isRequired !== undefined) updatePayload.is_required = updateOptionGroupDto.isRequired;
      if (updateOptionGroupDto.minSelections !== undefined) updatePayload.min_selections = updateOptionGroupDto.minSelections;
      if (updateOptionGroupDto.maxSelections !== undefined) updatePayload.max_selections = updateOptionGroupDto.maxSelections;
      if (updateOptionGroupDto.sortOrder !== undefined) updatePayload.sort_order = updateOptionGroupDto.sortOrder;
      if (updateOptionGroupDto.isActive !== undefined) updatePayload.is_active = updateOptionGroupDto.isActive;

      const { data, error } = await this.supabase
        .from('menu_option_groups')
        .update(updatePayload)
        .eq('id', optionGroupId)
        .eq('menu_item_id', menuItemId)
        .select(`
          *,
          menu_options(
            id,
            name,
            description,
            additional_price,
            stock_quantity,
            is_out_of_stock,
            sort_order,
            is_active,
            order_count,
            created_at,
            updated_at
          )
        `)
        .single();

      if (error) {
        throw new BadRequestException(`옵션 그룹 수정에 실패했습니다: ${error.message}`);
      }

      return this.mapToOptionGroupResponse(data);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('옵션 그룹 수정 중 오류가 발생했습니다.');
    }
  }

  /**
   * 옵션 그룹 삭제
   */
  async deleteOptionGroup(optionGroupId: string, menuItemId: string, restaurantId: string, ownerId: string): Promise<{ message: string }> {
    try {
      // 레스토랑 소유권 확인
      await this.verifyRestaurantOwnership(restaurantId, ownerId);

      // 옵션 그룹 존재 확인
      const optionGroup = await this.getOptionGroup(optionGroupId, menuItemId, restaurantId);

      // 옵션이 있는지 확인
      if (optionGroup.options && optionGroup.options.length > 0) {
        throw new BadRequestException('옵션이 있는 옵션 그룹은 삭제할 수 없습니다. 먼저 모든 옵션을 삭제해주세요.');
      }

      const { error } = await this.supabase
        .from('menu_option_groups')
        .delete()
        .eq('id', optionGroupId)
        .eq('menu_item_id', menuItemId);

      if (error) {
        throw new BadRequestException(`옵션 그룹 삭제에 실패했습니다: ${error.message}`);
      }

      return { message: '옵션 그룹이 성공적으로 삭제되었습니다.' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('옵션 그룹 삭제 중 오류가 발생했습니다.');
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
   * 메뉴 아이템 소유권 확인
   */
  private async verifyMenuItemOwnership(menuItemId: string, restaurantId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('menu_items')
      .select('id')
      .eq('id', menuItemId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (error || !data) {
      throw new BadRequestException('해당 메뉴 아이템을 찾을 수 없거나 이 레스토랑에 속하지 않습니다.');
    }
  }

  /**
   * 데이터베이스 레코드를 OptionGroupResponse로 변환
   */
  private mapToOptionGroupResponse(data: any): OptionGroupResponse {
    return {
      id: data.id,
      menuItemId: data.menu_item_id,
      name: data.name,
      description: data.description,
      type: data.type,
      isRequired: data.is_required,
      minSelections: data.min_selections,
      maxSelections: data.max_selections,
      sortOrder: data.sort_order,
      isActive: data.is_active,
      options: (data.menu_options || []).map((option: any) => ({
        id: option.id,
        optionGroupId: data.id,
        name: option.name,
        description: option.description,
        additionalPrice: option.additional_price,
        stockQuantity: option.stock_quantity,
        isOutOfStock: option.is_out_of_stock,
        sortOrder: option.sort_order,
        isActive: option.is_active,
        orderCount: option.order_count || 0,
        createdAt: new Date(option.created_at),
        updatedAt: new Date(option.updated_at),
      })),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
} 