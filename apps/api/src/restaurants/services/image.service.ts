/**
 * 이미지 관리 서비스
 * 
 * 레스토랑 이미지 업로드, 관리, 삭제 등을 처리하는 서비스입니다.
 */

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { 
  UploadImageDto, 
  UpdateImageDto, 
  ReorderImagesDto, 
  SetPrimaryImageDto,
  ImageResponse, 
  ImageGalleryResponse, 
  ImageUploadResponse,
  ImageType 
} from '../dto/image.dto';

@Injectable()
export class ImageService {
  private readonly supabase: SupabaseClient;
  private readonly bucketName = 'restaurant-images';
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
   * 이미지 업로드
   */
  async uploadImage(
    restaurantId: string, 
    ownerId: string, 
    file: any, 
    uploadDto: UploadImageDto
  ): Promise<ImageUploadResponse> {
    try {
      // 레스토랑 소유권 확인
      await this.verifyRestaurantOwnership(restaurantId, ownerId);

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
      const filename = `${restaurantId}/${uploadDto.type}/${randomBytes(16).toString('hex')}.${fileExtension}`;

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

      // 대표 이미지 설정 시 기존 대표 이미지 해제
      if (uploadDto.isPrimary) {
        await this.clearPrimaryImages(restaurantId, uploadDto.type);
      }

      // 데이터베이스에 이미지 정보 저장
      const { data, error } = await this.supabase
        .from('restaurant_images')
        .insert([
          {
            restaurant_id: restaurantId,
            type: uploadDto.type,
            filename: uploadData.path,
            original_name: file.originalname,
            url: urlData.publicUrl,
            description: uploadDto.description,
            sort_order: uploadDto.sortOrder || 0,
            is_primary: uploadDto.isPrimary || false,
            is_active: true,
            file_size: file.size,
            mime_type: file.mimetype,
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
        image: this.mapToImageResponse(data),
        message: '이미지가 성공적으로 업로드되었습니다.',
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('이미지 업로드 중 오류가 발생했습니다.');
    }
  }

  /**
   * 레스토랑 이미지 갤러리 조회
   */
  async getImageGallery(restaurantId: string, includeInactive = false): Promise<ImageGalleryResponse> {
    try {
      let query = this.supabase
        .from('restaurant_images')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sort_order', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        throw new BadRequestException(`이미지 갤러리 조회에 실패했습니다: ${error.message}`);
      }

      const images = data.map(image => this.mapToImageResponse(image));

      return {
        thumbnail: images.find(img => img.type === ImageType.THUMBNAIL && img.isPrimary),
        logo: images.find(img => img.type === ImageType.LOGO && img.isPrimary),
        gallery: images.filter(img => img.type === ImageType.GALLERY),
        menu: images.filter(img => img.type === ImageType.MENU),
        interior: images.filter(img => img.type === ImageType.INTERIOR),
        exterior: images.filter(img => img.type === ImageType.EXTERIOR),
        totalCount: images.length,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('이미지 갤러리 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 특정 타입의 이미지 목록 조회
   */
  async getImagesByType(restaurantId: string, type: ImageType, includeInactive = false): Promise<ImageResponse[]> {
    try {
      let query = this.supabase
        .from('restaurant_images')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('type', type)
        .order('sort_order', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        throw new BadRequestException(`이미지 목록 조회에 실패했습니다: ${error.message}`);
      }

      return data.map(image => this.mapToImageResponse(image));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('이미지 목록 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 이미지 정보 수정
   */
  async updateImage(imageId: string, restaurantId: string, ownerId: string, updateDto: UpdateImageDto): Promise<ImageResponse> {
    try {
      // 레스토랑 소유권 확인
      await this.verifyRestaurantOwnership(restaurantId, ownerId);

      // 이미지 존재 확인
      const existingImage = await this.getImage(imageId, restaurantId);

      // 대표 이미지 설정 시 기존 대표 이미지 해제
      if (updateDto.isPrimary && !existingImage.isPrimary) {
        await this.clearPrimaryImages(restaurantId, existingImage.type);
      }

      // 업데이트할 데이터 준비
      const updatePayload: any = {
        updated_at: new Date().toISOString(),
      };

      if (updateDto.description !== undefined) updatePayload.description = updateDto.description;
      if (updateDto.sortOrder !== undefined) updatePayload.sort_order = updateDto.sortOrder;
      if (updateDto.isPrimary !== undefined) updatePayload.is_primary = updateDto.isPrimary;
      if (updateDto.isActive !== undefined) updatePayload.is_active = updateDto.isActive;

      const { data, error } = await this.supabase
        .from('restaurant_images')
        .update(updatePayload)
        .eq('id', imageId)
        .eq('restaurant_id', restaurantId)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`이미지 정보 수정에 실패했습니다: ${error.message}`);
      }

      return this.mapToImageResponse(data);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('이미지 정보 수정 중 오류가 발생했습니다.');
    }
  }

  /**
   * 이미지 삭제
   */
  async deleteImage(imageId: string, restaurantId: string, ownerId: string): Promise<{ message: string }> {
    try {
      // 레스토랑 소유권 확인
      await this.verifyRestaurantOwnership(restaurantId, ownerId);

      // 이미지 정보 조회
      const image = await this.getImage(imageId, restaurantId);

      // 스토리지에서 파일 삭제
      const { error: storageError } = await this.supabase.storage
        .from(this.bucketName)
        .remove([image.filename]);

      if (storageError) {
        console.warn(`스토리지 파일 삭제 실패: ${storageError.message}`);
      }

      // 데이터베이스에서 이미지 정보 삭제
      const { error } = await this.supabase
        .from('restaurant_images')
        .delete()
        .eq('id', imageId)
        .eq('restaurant_id', restaurantId);

      if (error) {
        throw new BadRequestException(`이미지 삭제에 실패했습니다: ${error.message}`);
      }

      return { message: '이미지가 성공적으로 삭제되었습니다.' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('이미지 삭제 중 오류가 발생했습니다.');
    }
  }

  /**
   * 이미지 순서 변경
   */
  async reorderImages(restaurantId: string, ownerId: string, reorderDto: ReorderImagesDto): Promise<{ message: string }> {
    try {
      // 레스토랑 소유권 확인
      await this.verifyRestaurantOwnership(restaurantId, ownerId);

      // 순서 업데이트
      const updates = Object.entries(reorderDto.imageOrders).map(([imageId, sortOrder]) => ({
        id: imageId,
        sort_order: sortOrder,
        updated_at: new Date().toISOString(),
      }));

      for (const update of updates) {
        const { error } = await this.supabase
          .from('restaurant_images')
          .update({
            sort_order: update.sort_order,
            updated_at: update.updated_at,
          })
          .eq('id', update.id)
          .eq('restaurant_id', restaurantId);

        if (error) {
          throw new BadRequestException(`이미지 순서 변경에 실패했습니다: ${error.message}`);
        }
      }

      return { message: '이미지 순서가 성공적으로 변경되었습니다.' };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('이미지 순서 변경 중 오류가 발생했습니다.');
    }
  }

  /**
   * 대표 이미지 설정
   */
  async setPrimaryImage(restaurantId: string, ownerId: string, setPrimaryDto: SetPrimaryImageDto): Promise<{ message: string }> {
    try {
      // 레스토랑 소유권 확인
      await this.verifyRestaurantOwnership(restaurantId, ownerId);

      // 이미지 정보 조회
      const image = await this.getImage(setPrimaryDto.imageId, restaurantId);

      // 기존 대표 이미지 해제
      await this.clearPrimaryImages(restaurantId, image.type);

      // 새 대표 이미지 설정
      const { error } = await this.supabase
        .from('restaurant_images')
        .update({
          is_primary: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', setPrimaryDto.imageId)
        .eq('restaurant_id', restaurantId);

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
   * 특정 이미지 조회
   */
  private async getImage(imageId: string, restaurantId: string): Promise<ImageResponse> {
    const { data, error } = await this.supabase
      .from('restaurant_images')
      .select('*')
      .eq('id', imageId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (error || !data) {
      throw new NotFoundException('이미지를 찾을 수 없습니다.');
    }

    return this.mapToImageResponse(data);
  }

  /**
   * 파일 검증
   */
  private validateFile(file: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 파일 크기 검증
    if (file.size > this.maxFileSize) {
      errors.push(`파일 크기가 너무 큽니다. 최대 ${this.maxFileSize / 1024 / 1024}MB까지 업로드 가능합니다.`);
    }

    // MIME 타입 검증
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      errors.push('지원하지 않는 파일 형식입니다. JPEG, PNG, WebP 파일만 업로드 가능합니다.');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 기존 대표 이미지 해제
   */
  private async clearPrimaryImages(restaurantId: string, type: ImageType): Promise<void> {
    await this.supabase
      .from('restaurant_images')
      .update({
        is_primary: false,
        updated_at: new Date().toISOString(),
      })
      .eq('restaurant_id', restaurantId)
      .eq('type', type)
      .eq('is_primary', true);
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
   * 데이터베이스 레코드를 ImageResponse로 변환
   */
  private mapToImageResponse(data: any): ImageResponse {
    return {
      id: data.id,
      restaurantId: data.restaurant_id,
      type: data.type,
      filename: data.filename,
      originalName: data.original_name,
      url: data.url,
      thumbnailUrl: data.thumbnail_url,
      description: data.description,
      sortOrder: data.sort_order,
      isPrimary: data.is_primary,
      isActive: data.is_active,
      fileSize: data.file_size,
      mimeType: data.mime_type,
      width: data.width,
      height: data.height,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
} 