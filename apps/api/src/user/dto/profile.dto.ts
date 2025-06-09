/**
 * 사용자 프로필 관리 DTO
 * 
 * 사용자 프로필 관련 데이터 전송 객체들을 정의합니다.
 */

import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 프로필 업데이트 요청 DTO
 */
export class UpdateProfileDto {
  @ApiProperty({
    description: '사용자명',
    example: 'newuser123',
    required: false,
    minLength: 3,
    maxLength: 20
  })
  @IsOptional()
  @IsString({ message: '사용자명은 문자열이어야 합니다.' })
  @MinLength(3, { message: '사용자명은 최소 3자 이상이어야 합니다.' })
  @MaxLength(20, { message: '사용자명은 최대 20자까지 가능합니다.' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: '사용자명은 영문, 숫자, 언더스코어만 사용 가능합니다.'
  })
  username?: string;

  @ApiProperty({
    description: '실명',
    example: '홍길동',
    required: false,
    minLength: 2,
    maxLength: 50
  })
  @IsOptional()
  @IsString({ message: '실명은 문자열이어야 합니다.' })
  @MinLength(2, { message: '실명은 최소 2자 이상이어야 합니다.' })
  @MaxLength(50, { message: '실명은 최대 50자까지 가능합니다.' })
  fullName?: string;

  @ApiProperty({
    description: '전화번호 (한국 형식)',
    example: '010-9876-5432',
    required: false
  })
  @IsOptional()
  @IsString({ message: '전화번호는 문자열이어야 합니다.' })
  @Matches(/^01[0-9]-\d{4}-\d{4}$/, {
    message: '올바른 한국 전화번호 형식이 아닙니다. (예: 010-1234-5678)'
  })
  phone?: string;

  @ApiProperty({
    description: '프로필 이미지 URL',
    example: 'https://example.com/profile.jpg',
    required: false
  })
  @IsOptional()
  @IsString({ message: '프로필 이미지 URL은 문자열이어야 합니다.' })
  profileImageUrl?: string;
}

/**
 * 비밀번호 변경 요청 DTO
 */
export class ChangePasswordDto {
  @ApiProperty({
    description: '현재 비밀번호',
    example: 'currentPassword123!',
    minLength: 1
  })
  @IsString({ message: '현재 비밀번호는 문자열이어야 합니다.' })
  @MinLength(1, { message: '현재 비밀번호를 입력해주세요.' })
  currentPassword: string;

  @ApiProperty({
    description: '새 비밀번호 (최소 8자, 영문+숫자+특수문자 조합)',
    example: 'newPassword123!',
    minLength: 8
  })
  @IsString({ message: '새 비밀번호는 문자열이어야 합니다.' })
  @MinLength(8, { message: '새 비밀번호는 최소 8자 이상이어야 합니다.' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: '새 비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.'
  })
  newPassword: string;
} 