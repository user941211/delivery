/**
 * 파일 업로드 서비스
 * 
 * 파일 업로드, 검증, 압축 및 Supabase Storage 연동을 처리하는 서비스입니다.
 */

import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import * as path from 'path';
import { 
  FileType, 
  FileUploadResponse, 
  FileMetadata, 
  FileValidationResult, 
  ImageResizeOptions 
} from './dto/file-upload.dto';

@Injectable()
export class FileUploadService {
  private readonly supabase: SupabaseClient;
  private readonly maxFileSize: number = 10 * 1024 * 1024; // 10MB
  private readonly allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly allowedDocumentTypes = ['application/pdf', 'image/jpeg', 'image/png'];

  constructor(private readonly configService: ConfigService) {
    // Supabase 클라이언트 초기화
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || this.configService.get<string>('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is missing');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * 파일 업로드
   */
  async uploadFile(
    userId: string,
    file: FileMetadata,
    fileType: FileType,
    description?: string
  ): Promise<FileUploadResponse> {
    try {
      // 파일 검증
      const validation = await this.validateFile(file, fileType);
      if (!validation.isValid) {
        throw new BadRequestException(validation.error);
      }

      // 고유한 파일명 생성
      const uniqueFileName = this.generateUniqueFileName(file.originalName);
      const filePath = this.getFilePath(fileType, userId, uniqueFileName);

      // 파일을 Supabase Storage에 업로드
      const { data, error } = await this.supabase.storage
        .from('uploads')
        .upload(filePath, file.buffer, {
          contentType: file.mimeType,
          duplex: 'half'
        });

      if (error) {
        throw new InternalServerErrorException(`파일 업로드에 실패했습니다: ${error.message}`);
      }

      // 파일 URL 생성
      const { data: urlData } = await this.supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      // 파일 메타데이터를 데이터베이스에 저장
      const fileRecord = await this.saveFileMetadata({
        userId,
        originalName: file.originalName,
        fileName: uniqueFileName,
        filePath,
        fileType,
        mimeType: file.mimeType,
        size: file.size,
        url: urlData.publicUrl,
        description,
      });

      return fileRecord;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('파일 업로드 중 오류가 발생했습니다.');
    }
  }

  /**
   * 사용자의 파일 목록 조회
   */
  async getUserFiles(userId: string, fileType?: FileType): Promise<FileUploadResponse[]> {
    try {
      let query = this.supabase
        .from('user_files')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fileType) {
        query = query.eq('file_type', fileType);
      }

      const { data, error } = await query;

      if (error) {
        throw new BadRequestException(`파일 목록 조회에 실패했습니다: ${error.message}`);
      }

      return data.map(file => this.mapToFileUploadResponse(file));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('파일 목록 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 파일 삭제
   */
  async deleteFile(userId: string, fileId: string): Promise<{ message: string }> {
    try {
      // 파일 정보 조회
      const { data: fileData, error: selectError } = await this.supabase
        .from('user_files')
        .select('*')
        .eq('id', fileId)
        .eq('user_id', userId)
        .single();

      if (selectError || !fileData) {
        throw new BadRequestException('파일을 찾을 수 없습니다.');
      }

      // Supabase Storage에서 파일 삭제
      const { error: storageError } = await this.supabase.storage
        .from('uploads')
        .remove([fileData.file_path]);

      if (storageError) {
        console.warn(`Storage 파일 삭제 실패: ${storageError.message}`);
        // Storage 삭제 실패는 경고만 하고 계속 진행
      }

      // 데이터베이스에서 파일 메타데이터 삭제
      const { error: deleteError } = await this.supabase
        .from('user_files')
        .delete()
        .eq('id', fileId)
        .eq('user_id', userId);

      if (deleteError) {
        throw new BadRequestException(`파일 삭제에 실패했습니다: ${deleteError.message}`);
      }

      return { message: '파일이 성공적으로 삭제되었습니다.' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('파일 삭제 중 오류가 발생했습니다.');
    }
  }

  /**
   * 파일 검증
   */
  private async validateFile(file: FileMetadata, fileType: FileType): Promise<FileValidationResult> {
    // 파일 크기 검증
    if (file.size > this.maxFileSize) {
      return {
        isValid: false,
        error: '파일 크기가 10MB를 초과할 수 없습니다.',
      };
    }

    // 파일 타입별 MIME 타입 검증
    const allowedTypes = this.getAllowedMimeTypes(fileType);
    if (!allowedTypes.includes(file.mimeType)) {
      return {
        isValid: false,
        error: `지원하지 않는 파일 형식입니다. 허용된 형식: ${allowedTypes.join(', ')}`,
      };
    }

    // 이미지 파일인 경우 추가 검증 (실제 구현에서는 이미지 처리 라이브러리 사용)
    if (this.allowedImageTypes.includes(file.mimeType)) {
      // TODO: 실제 이미지 차원 검증 및 메타데이터 추출
      // 현재는 기본적인 검증만 수행
    }

    return {
      isValid: true,
      metadata: {
        mimeType: file.mimeType,
        size: file.size,
      },
    };
  }

  /**
   * 파일 타입별 허용된 MIME 타입 반환
   */
  private getAllowedMimeTypes(fileType: FileType): string[] {
    switch (fileType) {
      case FileType.PROFILE_IMAGE:
      case FileType.RESTAURANT_IMAGE:
      case FileType.MENU_IMAGE:
        return this.allowedImageTypes;
      case FileType.DOCUMENT:
        return this.allowedDocumentTypes;
      default:
        return [];
    }
  }

  /**
   * 고유한 파일명 생성
   */
  private generateUniqueFileName(originalName: string): string {
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);
    const timestamp = Date.now();
    const randomStr = randomBytes(4).toString('hex');
    
    return `${nameWithoutExt}_${timestamp}_${randomStr}${ext}`;
  }

  /**
   * 파일 저장 경로 생성
   */
  private getFilePath(fileType: FileType, userId: string, fileName: string): string {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    
    return `${fileType}/${year}/${month}/${userId}/${fileName}`;
  }

  /**
   * 파일 메타데이터를 데이터베이스에 저장
   */
  private async saveFileMetadata(metadata: {
    userId: string;
    originalName: string;
    fileName: string;
    filePath: string;
    fileType: FileType;
    mimeType: string;
    size: number;
    url: string;
    description?: string;
  }): Promise<FileUploadResponse> {
    const { data, error } = await this.supabase
      .from('user_files')
      .insert([
        {
          user_id: metadata.userId,
          original_name: metadata.originalName,
          file_name: metadata.fileName,
          file_path: metadata.filePath,
          file_type: metadata.fileType,
          mime_type: metadata.mimeType,
          size: metadata.size,
          url: metadata.url,
          description: metadata.description,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(`파일 메타데이터 저장에 실패했습니다: ${error.message}`);
    }

    return this.mapToFileUploadResponse(data);
  }

  /**
   * 데이터베이스 레코드를 FileUploadResponse로 변환
   */
  private mapToFileUploadResponse(data: any): FileUploadResponse {
    return {
      id: data.id,
      userId: data.user_id,
      originalName: data.original_name,
      fileName: data.file_name,
      fileType: data.file_type,
      mimeType: data.mime_type,
      size: data.size,
      url: data.url,
      description: data.description,
      createdAt: new Date(data.created_at),
    };
  }
} 