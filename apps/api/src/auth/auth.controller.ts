/**
 * 인증 컨트롤러
 * 
 * 사용자 인증 관련 HTTP 엔드포인트를 제공합니다.
 */

import { Controller, Post, Get, Body, UseGuards, Request, HttpCode, HttpStatus, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { TokenResponse } from './token.service';
import { BaseUser } from '@delivery-platform/shared/src/types/user';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('인증')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 회원가입
   */
  @Post('signup')
  @ApiOperation({ summary: '회원가입', description: '새로운 사용자 계정을 생성합니다.' })
  @ApiResponse({ status: 201, description: '회원가입 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 409, description: '이미 존재하는 이메일 또는 전화번호' })
  @ApiBody({
    description: '회원가입 정보',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'password123' },
        username: { type: 'string', example: 'user123' },
        fullName: { type: 'string', example: '홍길동' },
        phone: { type: 'string', example: '010-1234-5678' },
        role: { type: 'string', enum: ['customer', 'restaurant_owner', 'delivery_driver'], example: 'customer' }
      },
      required: ['email', 'password', 'username', 'fullName', 'phone', 'role']
    }
  })
  async signUp(@Body(ValidationPipe) signUpDto: SignUpDto): Promise<{ user: BaseUser; tokens: TokenResponse }> {
    return this.authService.signUp(signUpDto);
  }

  /**
   * 로그인
   */
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인', description: '이메일과 비밀번호로 로그인합니다.' })
  @ApiResponse({ status: 200, description: '로그인 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiBody({
    description: '로그인 정보',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'password123' }
      },
      required: ['email', 'password']
    }
  })
  async signIn(@Body(ValidationPipe) signInDto: SignInDto): Promise<{ user: BaseUser; tokens: TokenResponse }> {
    return this.authService.signIn(signInDto);
  }

  /**
   * 토큰 갱신
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '토큰 갱신', description: '리프레시 토큰으로 새로운 액세스 토큰을 발급받습니다.' })
  @ApiResponse({ status: 200, description: '토큰 갱신 성공' })
  @ApiResponse({ status: 401, description: '유효하지 않은 리프레시 토큰' })
  @ApiBody({
    description: '리프레시 토큰',
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
      },
      required: ['refreshToken']
    }
  })
  async refreshTokens(@Body('refreshToken') refreshToken: string): Promise<TokenResponse> {
    return this.authService.refreshTokens(refreshToken);
  }

  /**
   * 로그아웃 (토큰 무효화)
   */
  @Post('signout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '로그아웃', description: '현재 토큰을 무효화합니다.' })
  @ApiResponse({ status: 200, description: '로그아웃 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async signOut(): Promise<{ message: string }> {
    // TODO: 토큰 블랙리스트 구현
    return { message: '로그아웃되었습니다.' };
  }

  /**
   * 현재 사용자 프로필 조회
   */
  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '프로필 조회', description: '현재 로그인한 사용자의 프로필 정보를 조회합니다.' })
  @ApiResponse({ status: 200, description: '프로필 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getProfile(@CurrentUser() user: BaseUser): Promise<BaseUser> {
    return user;
  }

  /**
   * 관리자 전용 엔드포인트 (예제)
   */
  @Get('admin-only')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '관리자 전용', description: '관리자만 접근할 수 있는 엔드포인트입니다.' })
  @ApiResponse({ status: 200, description: '접근 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async adminOnly(@CurrentUser() user: BaseUser): Promise<{ message: string; user: BaseUser }> {
    return {
      message: '관리자 전용 기능에 접근했습니다.',
      user
    };
  }

  /**
   * 음식점 사장 전용 엔드포인트 (예제)
   */
  @Get('restaurant-owner-only')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('restaurant_owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: '음식점 사장 전용', description: '음식점 사장만 접근할 수 있는 엔드포인트입니다.' })
  @ApiResponse({ status: 200, description: '접근 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async restaurantOwnerOnly(@CurrentUser() user: BaseUser): Promise<{ message: string; user: BaseUser }> {
    return {
      message: '음식점 사장 전용 기능에 접근했습니다.',
      user
    };
  }
} 