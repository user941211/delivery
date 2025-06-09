/**
 * 회원가입 요청 DTO
 * 
 * 회원가입 시 필요한 데이터 검증을 담당합니다.
 */

import { IsEmail, IsString, IsPhoneNumber, IsEnum, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@delivery-platform/shared/src/types/user';

export class SignUpDto {
  @ApiProperty({
    description: '이메일 주소',
    example: 'user@example.com',
    format: 'email'
  })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  email: string;

  @ApiProperty({
    description: '비밀번호 (최소 8자, 영문+숫자+특수문자 조합)',
    example: 'Password123!',
    minLength: 8
  })
  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.'
  })
  password: string;

  @ApiProperty({
    description: '사용자명 (3-20자)',
    example: 'user123',
    minLength: 3,
    maxLength: 20
  })
  @IsString({ message: '사용자명은 문자열이어야 합니다.' })
  @MinLength(3, { message: '사용자명은 최소 3자 이상이어야 합니다.' })
  @MaxLength(20, { message: '사용자명은 최대 20자까지 가능합니다.' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: '사용자명은 영문, 숫자, 언더스코어만 사용 가능합니다.'
  })
  username: string;

  @ApiProperty({
    description: '실명',
    example: '홍길동',
    minLength: 2,
    maxLength: 50
  })
  @IsString({ message: '실명은 문자열이어야 합니다.' })
  @MinLength(2, { message: '실명은 최소 2자 이상이어야 합니다.' })
  @MaxLength(50, { message: '실명은 최대 50자까지 가능합니다.' })
  fullName: string;

  @ApiProperty({
    description: '전화번호 (한국 형식)',
    example: '010-1234-5678'
  })
  @IsString({ message: '전화번호는 문자열이어야 합니다.' })
  @Matches(/^01[0-9]-\d{4}-\d{4}$/, {
    message: '올바른 한국 전화번호 형식이 아닙니다. (예: 010-1234-5678)'
  })
  phone: string;

  @ApiProperty({
    description: '사용자 역할',
    enum: ['customer', 'restaurant_owner', 'delivery_driver'],
    example: 'customer'
  })
  @IsEnum(['customer', 'restaurant_owner', 'delivery_driver'], {
    message: '올바른 사용자 역할을 선택해주세요.'
  })
  role: UserRole;
} 