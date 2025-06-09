/**
 * 파일 업로드 DTO
 * 
 * 파일 업로드 관련 데이터 전송 객체들을 정의합니다.
 */

import { IsOptional, IsString, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 지원되는 파일 타입
 */
export enum FileType {
  PROFILE_IMAGE = 'profile_image',
  DOCUMENT = 'document',
  RESTAURANT_IMAGE = 'restaurant_image',
  MENU_IMAGE = 'menu_image',
}

/**
 * 파일 업로드 옵션 DTO
 */
export class FileUploadOptionsDto {
  @ApiProperty({
    description: '파일 타입',
    enum: FileType,
    example: FileType.PROFILE_IMAGE
  })
  @IsEnum(FileType, { message: '지원하지 않는 파일 타입입니다.' })
  fileType: FileType;

  @ApiProperty({
    description: '파일 설명 (선택사항)',
    example: '프로필 이미지',
    required: false,
    maxLength: 100
  })
  @IsOptional()
  @IsString({ message: '파일 설명은 문자열이어야 합니다.' })
  @MaxLength(100, { message: '파일 설명은 최대 100자까지 가능합니다.' })
  description?: string;
}

/**
 * 파일 업로드 응답 인터페이스
 */
export interface FileUploadResponse {
  id: string;
  userId: string;
  originalName: string;
  fileName: string;
  fileType: FileType;
  mimeType: string;
  size: number;
  url: string;
  description?: string;
  createdAt: Date;
}

/**
 * 파일 메타데이터 인터페이스
 */
export interface FileMetadata {
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}

/**
 * 이미지 리사이즈 옵션
 */
export interface ImageResizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

/**
 * 파일 검증 결과
 */
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  metadata?: {
    mimeType: string;
    size: number;
    dimensions?: {
      width: number;
      height: number;
    };
  };
} 