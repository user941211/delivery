/**
 * 메뉴 이미지 관리 서비스
 * 
 * 메뉴 아이템별 이미지 업로드, 관리, 삭제 등을 처리하는 서비스입니다.
 */

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { 
  UploadMenuImageDto, 
  UpdateMenuImageDto, 
  ReorderMenuImagesDto, 
  SetPrimaryMenuImageDto,
  MenuImageResponse, 
  MenuImageGalleryResponse, 
  MenuImageUploadResponse,
  MenuImageType 
} from '../dto/menu-image.dto';

@Injectable()
export class MenuImageService {
  private readonly supabase: SupabaseClient;
  private readonly bucketName = 'menu-images';
  private readonly allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

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
   * 메뉴 이미지 업로드
   */
  async uploadMenuImage(
    menuItemId: string,
    restaurantId: string, 
    ownerId: string, 
    file: any, 
    uploadDto: UploadMenuImageDto
  ): Promise<MenuImageUploadResponse> {
    try {
      // 레스토랑 소유권 및 메뉴 아이템 확인
      await this.verifyMenuItemOwnership(menuItemId, restaurantId, ownerId);

      // 파일 검증
      const validationResult = this.validateFile(file);
      if (!validationResult.isValid) {
        return {
          success: false,
          message: '파일 업로드에 실패했습니다.',
          errors: validationResult.errors,
        };
      }

      // 파일명 생성
      const fileExtension = file.originalname.split('.').pop();
      const filename = `${restaurantId}/${menuItemId}/${uploadDto.type}/${randomBytes(16).toString('hex')}.${fileExtension}`;

      // Supabase Storage에 업로드
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filename, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        throw new BadRequestException(`파일 업로드에 실패했습니다: ${uploadError.message}`);
      }

      // 파일 URL 생성
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filename);

      // 썸네일 URL 생성 (필요시)
      let thumbnailUrl: string | undefined;
      if (uploadDto.type === MenuImageType.MAIN || uploadDto.type === MenuImageType.GALLERY) {
        thumbnailUrl = `${urlData.publicUrl}?width=300&height=300&resize=cover`;
      }

      // 대표 이미지 설정 시 기존 대표 이미지 해제
      if (uploadDto.isPrimary) {
        await this.clearPrimaryMenuImages(menuItemId, uploadDto.type);
      }

      // 데이터베이스에 이미지 정보 저장
      const { data, error } = await this.supabase
        .from('menu_item_images')
        .insert([
          {
            menu_item_id: menuItemId,
            type: uploadDto.type,
            filename: uploadData.path,
            original_name: file.originalname,
            url: urlData.publicUrl,
            thumbnail_url: thumbnailUrl,
            description: uploadDto.description,
            alt_text: uploadDto.altText,
            sort_order: uploadDto.sortOrder || 0,
            is_primary: uploadDto.isPrimary || false,
            is_active: true,
            file_size: file.size,
            mime_type: file.mimetype,
            view_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        // 업로드된 파일 삭제
        await this.supabase.storage.from(this.bucketName).remove([filename]);
        throw new BadRequestException(`이미지 정보 저장에 실패했습니다: ${error.message}`);
      }

      return {
        success: true,
        image: this.mapToMenuImageResponse(data),
        message: '메뉴 이미지가 성공적으로 업로드되었습니다.',
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('메뉴 이미지 업로드 중 오류가 발생했습니다.');
    }
  }

  /**
   * 메뉴 이미지 갤러리 조회
   */
  async getMenuImageGallery(menuItemId: string, restaurantId: string, includeInactive = false): Promise<MenuImageGalleryResponse> {
    try {
      // 메뉴 아이템 존재 확인
      await this.verifyMenuItemExistence(menuItemId, restaurantId);

      let query = this.supabase
        .from('menu_item_images')
        .select('*')
        .eq('menu_item_id', menuItemId)
        .order('sort_order', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        throw new BadRequestException(`메뉴 이미지 갤러리 조회에 실패했습니다: ${error.message}`);
      }

      const images = data.map(image => this.mapToMenuImageResponse(image));

      return {
        main: images.find(img => img.type === MenuImageType.MAIN && img.isPrimary),
        gallery: images.filter(img => img.type === MenuImageType.GALLERY),
        detail: images.filter(img => img.type === MenuImageType.DETAIL),
        ingredient: images.filter(img => img.type === MenuImageType.INGREDIENT),
        totalCount: images.length,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('메뉴 이미지 갤러리 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 특정 타입의 메뉴 이미지 목록 조회
   */
  async getMenuImagesByType(menuItemId: string, restaurantId: string, type: MenuImageType, includeInactive = false): Promise<MenuImageResponse[]> {
    try {
      // 메뉴 아이템 존재 확인
      await this.verifyMenuItemExistence(menuItemId, restaurantId);

      let query = this.supabase
        .from('menu_item_images')
        .select('*')
        .eq('menu_item_id', menuItemId)
        .eq('type', type)
        .order('sort_order', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        throw new BadRequestException(`메뉴 이미지 목록 조회에 실패했습니다: ${error.message}`);
      }

      return data.map(image => this.mapToMenuImageResponse(image));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('메뉴 이미지 목록 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 메뉴 이미지 수정
   */
  async updateMenuImage(imageId: string, menuItemId: string, restaurantId: string, ownerId: string, updateDto: UpdateMenuImageDto): Promise<MenuImageResponse> {
    try {
      // 레스토랑 소유권 및 메뉴 아이템 확인
      await this.verifyMenuItemOwnership(menuItemId, restaurantId, ownerId);

      // 이미지 존재 확인
      const existingImage = await this.getMenuImage(imageId, menuItemId);

      // 대표 이미지로 변경할 경우 기존 대표 이미지 해제
      if (updateDto.isPrimary && !existingImage.isPrimary) {
        await this.clearPrimaryMenuImages(menuItemId, existingImage.type);
      }

      // 업데이트할 데이터 준비
      const updatePayload: any = {
        updated_at: new Date().toISOString(),
      };

      if (updateDto.description !== undefined) updatePayload.description = updateDto.description;
      if (updateDto.altText !== undefined) updatePayload.alt_text = updateDto.altText;
      if (updateDto.isPrimary !== undefined) updatePayload.is_primary = updateDto.isPrimary;
      if (updateDto.sortOrder !== undefined) updatePayload.sort_order = updateDto.sortOrder;
      if (updateDto.isActive !== undefined) updatePayload.is_active = updateDto.isActive;

      const { data, error } = await this.supabase
        .from('menu_item_images')
        .update(updatePayload)
        .eq('id', imageId)
        .eq('menu_item_id', menuItemId)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`메뉴 이미지 수정에 실패했습니다: ${error.message}`);
      }

      return this.mapToMenuImageResponse(data);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('메뉴 이미지 수정 중 오류가 발생했습니다.');
    }
  }

  /**
   * 메뉴 이미지 삭제
   */
  async deleteMenuImage(imageId: string, menuItemId: string, restaurantId: string, ownerId: string): Promise<{ message: string }> {
    try {
      // 레스토랑 소유권 및 메뉴 아이템 확인
      await this.verifyMenuItemOwnership(menuItemId, restaurantId, ownerId);

      // 이미지 정보 조회
      const image = await this.getMenuImage(imageId, menuItemId);

      // Supabase Storage에서 파일 삭제
      if (image.filename) {
        await this.supabase.storage.from(this.bucketName).remove([image.filename]);
      }

      // 데이터베이스에서 이미지 정보 삭제
      const { error } = await this.supabase
        .from('menu_item_images')
        .delete()
        .eq('id', imageId)
        .eq('menu_item_id', menuItemId);

      if (error) {
        throw new BadRequestException(`메뉴 이미지 삭제에 실패했습니다: ${error.message}`);
      }

      return { message: '메뉴 이미지가 성공적으로 삭제되었습니다.' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('메뉴 이미지 삭제 중 오류가 발생했습니다.');
    }
  }

  /**
   * 메뉴 이미지 순서 변경
   */
  async reorderMenuImages(menuItemId: string, restaurantId: string, ownerId: string, reorderDto: ReorderMenuImagesDto): Promise<{ message: string }> {
    try {
      // 레스토랑 소유권 및 메뉴 아이템 확인
      await this.verifyMenuItemOwnership(menuItemId, restaurantId, ownerId);

      // 순서 변경을 위한 배치 업데이트
      const updates = Object.entries(reorderDto.imageOrders).map(([imageId, sortOrder]) => ({
        id: imageId,
        sort_order: sortOrder,
        updated_at: new Date().toISOString(),
      }));

      for (const update of updates) {
        const { error } = await this.supabase
          .from('menu_item_images')
          .update({
            sort_order: update.sort_order,
            updated_at: update.updated_at,
          })
          .eq('id', update.id)
          .eq('menu_item_id', menuItemId);

        if (error) {
          throw new BadRequestException(`이미지 순서 변경에 실패했습니다: ${error.message}`);
        }
      }

      return { message: '메뉴 이미지 순서가 성공적으로 변경되었습니다.' };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('메뉴 이미지 순서 변경 중 오류가 발생했습니다.');
    }
  }

  /**
   * 메뉴 대표 이미지 설정
   */
  async setPrimaryMenuImage(menuItemId: string, restaurantId: string, ownerId: string, setPrimaryDto: SetPrimaryMenuImageDto): Promise<{ message: string }> {
    try {
      // 레스토랑 소유권 및 메뉴 아이템 확인
      await this.verifyMenuItemOwnership(menuItemId, restaurantId, ownerId);

      // 이미지 존재 확인
      await this.getMenuImage(setPrimaryDto.imageId, menuItemId);

      // 해당 타입의 기존 대표 이미지 해제
      await this.clearPrimaryMenuImages(menuItemId, setPrimaryDto.type);

      // 새로운 대표 이미지 설정
      const { error } = await this.supabase
        .from('menu_item_images')
        .update({
          is_primary: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', setPrimaryDto.imageId)
        .eq('menu_item_id', menuItemId);

      if (error) {
        throw new BadRequestException(`대표 이미지 설정에 실패했습니다: ${error.message}`);
      }

      return { message: '대표 이미지가 성공적으로 설정되었습니다.' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('대표 이미지 설정 중 오류가 발생했습니다.');
    }
  }

  /**
   * 메뉴 이미지 조회수 증가
   */
  async incrementImageViewCount(imageId: string): Promise<void> {
    await this.supabase.rpc('increment_view_count', {
      table_name: 'menu_item_images',
      row_id: imageId,
    });
  }

  /**
   * 특정 메뉴 이미지 조회 (private)
   */
  private async getMenuImage(imageId: string, menuItemId: string): Promise<MenuImageResponse> {
    const { data, error } = await this.supabase
      .from('menu_item_images')
      .select('*')
      .eq('id', imageId)
      .eq('menu_item_id', menuItemId)
      .single();

    if (error || !data) {
      throw new NotFoundException('메뉴 이미지를 찾을 수 없습니다.');
    }

    return this.mapToMenuImageResponse(data);
  }

  /**
   * 파일 검증
   */
  private validateFile(file: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!file) {
      errors.push('파일이 제공되지 않았습니다.');
      return { isValid: false, errors };
    }

    if (file.size > this.maxFileSize) {
      errors.push(`파일 크기는 ${this.maxFileSize / (1024 * 1024)}MB 이하여야 합니다.`);
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`지원되는 파일 형식: ${this.allowedMimeTypes.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 기존 대표 이미지 해제
   */
  private async clearPrimaryMenuImages(menuItemId: string, type: MenuImageType): Promise<void> {
    await this.supabase
      .from('menu_item_images')
      .update({
        is_primary: false,
        updated_at: new Date().toISOString(),
      })
      .eq('menu_item_id', menuItemId)
      .eq('type', type)
      .eq('is_primary', true);
  }

  /**
   * 메뉴 아이템 소유권 확인
   */
  private async verifyMenuItemOwnership(menuItemId: string, restaurantId: string, ownerId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('menu_items')
      .select(`
        id,
        restaurants!inner(id, owner_id)
      `)
      .eq('id', menuItemId)
      .eq('restaurant_id', restaurantId)
      .eq('restaurants.owner_id', ownerId)
      .single();

    if (error || !data) {
      throw new ForbiddenException('해당 메뉴 아이템에 대한 권한이 없습니다.');
    }
  }

  /**
   * 메뉴 아이템 존재 확인
   */
  private async verifyMenuItemExistence(menuItemId: string, restaurantId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('menu_items')
      .select('id')
      .eq('id', menuItemId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (error || !data) {
      throw new NotFoundException('메뉴 아이템을 찾을 수 없습니다.');
    }
  }

  /**
   * 데이터베이스 레코드를 MenuImageResponse로 변환
   */
  private mapToMenuImageResponse(data: any): MenuImageResponse {
    return {
      id: data.id,
      menuItemId: data.menu_item_id,
      type: data.type,
      filename: data.filename,
      originalName: data.original_name,
      url: data.url,
      thumbnailUrl: data.thumbnail_url,
      description: data.description,
      altText: data.alt_text,
      isPrimary: data.is_primary,
      sortOrder: data.sort_order,
      isActive: data.is_active,
      fileSize: data.file_size,
      mimeType: data.mime_type,
      viewCount: data.view_count || 0,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
} 