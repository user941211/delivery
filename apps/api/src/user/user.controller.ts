/**
 * 사용자 프로필 컨트롤러
 * 
 * 사용자 프로필, 주소, 파일 업로드 관련 HTTP 엔드포인트를 제공합니다.
 */

import { 
  Controller, 
  Get, 
  Put, 
  Post, 
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards, 
  ValidationPipe,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { BaseUser } from '@delivery-platform/shared/src/types/user';
import { UserService } from './user.service';
import { UpdateProfileDto, ChangePasswordDto } from './dto/profile.dto';
import { AddressService } from './address.service';
import { FileUploadService } from './file-upload.service';
import { CreateAddressDto, UpdateAddressDto, AddressResponse } from './dto/address.dto';
import { FileType, FileUploadResponse, FileMetadata } from './dto/file-upload.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('사용자 프로필')
@Controller('users')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly addressService: AddressService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  // ===== 프로필 관리 =====

  /**
   * 현재 사용자 프로필 조회
   */
  @Get('profile')
  @ApiOperation({ summary: '프로필 조회', description: '현재 로그인한 사용자의 프로필 정보를 조회합니다.' })
  @ApiResponse({ status: 200, description: '프로필 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getProfile(@CurrentUser() user: BaseUser): Promise<BaseUser> {
    return this.userService.getProfile(user.id);
  }

  /**
   * 프로필 업데이트
   */
  @Put('profile')
  @ApiOperation({ summary: '프로필 수정', description: '사용자 프로필 정보를 수정합니다.' })
  @ApiResponse({ status: 200, description: '프로필 수정 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async updateProfile(
    @CurrentUser() user: BaseUser,
    @Body(ValidationPipe) updateProfileDto: UpdateProfileDto
  ): Promise<BaseUser> {
    return this.userService.updateProfile(user.id, updateProfileDto);
  }

  /**
   * 비밀번호 변경
   */
  @Put('profile/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '비밀번호 변경', description: '사용자 비밀번호를 변경합니다.' })
  @ApiResponse({ status: 200, description: '비밀번호 변경 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async changePassword(
    @CurrentUser() user: BaseUser,
    @Body(ValidationPipe) changePasswordDto: ChangePasswordDto
  ): Promise<{ message: string }> {
    return this.userService.changePassword(user.id, changePasswordDto);
  }

  /**
   * 계정 비활성화
   */
  @Delete('profile/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '계정 비활성화', description: '사용자 계정을 비활성화합니다.' })
  @ApiResponse({ status: 200, description: '계정 비활성화 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async deactivateAccount(@CurrentUser() user: BaseUser): Promise<{ message: string }> {
    return this.userService.deactivateAccount(user.id);
  }

  // ===== 주소 관리 =====

  /**
   * 사용자 주소 목록 조회
   */
  @Get('addresses')
  @ApiOperation({ summary: '주소 목록 조회', description: '사용자의 등록된 주소 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '주소 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getUserAddresses(@CurrentUser() user: BaseUser): Promise<AddressResponse[]> {
    return this.addressService.getUserAddresses(user.id);
  }

  /**
   * 특정 주소 조회
   */
  @Get('addresses/:addressId')
  @ApiOperation({ summary: '주소 상세 조회', description: '특정 주소의 상세 정보를 조회합니다.' })
  @ApiResponse({ status: 200, description: '주소 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 404, description: '주소를 찾을 수 없음' })
  async getAddress(
    @CurrentUser() user: BaseUser,
    @Param('addressId', ParseUUIDPipe) addressId: string
  ): Promise<AddressResponse> {
    return this.addressService.getAddress(user.id, addressId);
  }

  /**
   * 기본 주소 조회
   */
  @Get('addresses/default/info')
  @ApiOperation({ summary: '기본 주소 조회', description: '사용자의 기본 배달 주소를 조회합니다.' })
  @ApiResponse({ status: 200, description: '기본 주소 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getDefaultAddress(@CurrentUser() user: BaseUser): Promise<AddressResponse | null> {
    return this.addressService.getDefaultAddress(user.id);
  }

  /**
   * 새 주소 생성
   */
  @Post('addresses')
  @ApiOperation({ summary: '주소 등록', description: '새로운 배달 주소를 등록합니다.' })
  @ApiResponse({ status: 201, description: '주소 등록 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async createAddress(
    @CurrentUser() user: BaseUser,
    @Body(ValidationPipe) createAddressDto: CreateAddressDto
  ): Promise<AddressResponse> {
    return this.addressService.createAddress(user.id, createAddressDto);
  }

  /**
   * 주소 수정
   */
  @Put('addresses/:addressId')
  @ApiOperation({ summary: '주소 수정', description: '등록된 주소 정보를 수정합니다.' })
  @ApiResponse({ status: 200, description: '주소 수정 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 404, description: '주소를 찾을 수 없음' })
  async updateAddress(
    @CurrentUser() user: BaseUser,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @Body(ValidationPipe) updateAddressDto: UpdateAddressDto
  ): Promise<AddressResponse> {
    return this.addressService.updateAddress(user.id, addressId, updateAddressDto);
  }

  /**
   * 주소 삭제
   */
  @Delete('addresses/:addressId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '주소 삭제', description: '등록된 주소를 삭제합니다.' })
  @ApiResponse({ status: 200, description: '주소 삭제 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 404, description: '주소를 찾을 수 없음' })
  async deleteAddress(
    @CurrentUser() user: BaseUser,
    @Param('addressId', ParseUUIDPipe) addressId: string
  ): Promise<{ message: string }> {
    return this.addressService.deleteAddress(user.id, addressId);
  }

  /**
   * 기본 주소 설정
   */
  @Put('addresses/:addressId/default')
  @ApiOperation({ summary: '기본 주소 설정', description: '특정 주소를 기본 배달 주소로 설정합니다.' })
  @ApiResponse({ status: 200, description: '기본 주소 설정 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 404, description: '주소를 찾을 수 없음' })
  async setDefaultAddress(
    @CurrentUser() user: BaseUser,
    @Param('addressId', ParseUUIDPipe) addressId: string
  ): Promise<AddressResponse> {
    return this.addressService.setDefaultAddress(user.id, addressId);
  }

  // ===== 파일 업로드 =====

  /**
   * 프로필 이미지 업로드
   */
  @Post('profile/avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '프로필 이미지 업로드', description: '사용자 프로필 이미지를 업로드합니다.' })
  @ApiBody({
    description: '프로필 이미지 파일',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: '파일 업로드 성공' })
  @ApiResponse({ status: 400, description: '잘못된 파일 형식 또는 크기' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async uploadProfileImage(
    @CurrentUser() user: BaseUser,
    @UploadedFile() file: any
  ): Promise<FileUploadResponse> {
    if (!file) {
      throw new Error('파일이 업로드되지 않았습니다.');
    }

    const fileMetadata: FileMetadata = {
      originalName: file.originalname,
      fileName: file.filename || file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    };

    return this.fileUploadService.uploadFile(
      user.id,
      fileMetadata,
      FileType.PROFILE_IMAGE,
      '프로필 이미지'
    );
  }

  /**
   * 사용자 파일 목록 조회
   */
  @Get('files')
  @ApiOperation({ summary: '파일 목록 조회', description: '사용자가 업로드한 파일 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '파일 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getUserFiles(
    @CurrentUser() user: BaseUser,
    @Query('type') fileType?: FileType
  ): Promise<FileUploadResponse[]> {
    return this.fileUploadService.getUserFiles(user.id, fileType);
  }

  /**
   * 파일 삭제
   */
  @Delete('files/:fileId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '파일 삭제', description: '업로드된 파일을 삭제합니다.' })
  @ApiResponse({ status: 200, description: '파일 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 404, description: '파일을 찾을 수 없음' })
  async deleteFile(
    @CurrentUser() user: BaseUser,
    @Param('fileId', ParseUUIDPipe) fileId: string
  ): Promise<{ message: string }> {
    return this.fileUploadService.deleteFile(user.id, fileId);
  }
} 