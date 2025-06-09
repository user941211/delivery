/**
 * 로그인 요청 DTO
 * 
 * 로그인 시 필요한 데이터 검증을 담당합니다.
 */

import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignInDto {
  @ApiProperty({
    description: '이메일 주소',
    example: 'user@example.com',
    format: 'email'
  })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  email: string;

  @ApiProperty({
    description: '비밀번호',
    example: 'Password123!',
    minLength: 1
  })
  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  @MinLength(1, { message: '비밀번호를 입력해주세요.' })
  password: string;
} 