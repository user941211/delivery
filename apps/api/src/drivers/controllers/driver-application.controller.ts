/**
 * 배달기사 신청 컨트롤러
 * 
 * 사용자가 배달기사 신청서를 작성, 조회, 수정, 삭제할 수 있는 API를 제공합니다.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Logger
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiSecurity
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { DriverApplicationService } from '../driver-application.service';
import {
  CreateDriverApplicationDto,
  UpdateDriverApplicationDto,
  DriverApplicationResponseDto
} from '../dto/driver-application.dto';

/**
 * 사용자용 배달기사 신청 컨트롤러
 */
@ApiTags('Driver Applications')
@Controller('driver-applications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiSecurity('bearer')
export class DriverApplicationController {
  private readonly logger = new Logger(DriverApplicationController.name);

  constructor(
    private readonly driverApplicationService: DriverApplicationService
  ) {}

  /**
   * 배달기사 신청서 작성
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '배달기사 신청서 작성',
    description: '새로운 배달기사 신청서를 작성합니다.'
  })
  @ApiResponse({
    status: 201,
    description: '신청서 작성 성공',
    type: DriverApplicationResponseDto
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 데이터'
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패'
  })
  @ApiResponse({
    status: 409,
    description: '이미 진행 중인 신청서가 있음'
  })
  async createApplication(
    @Body() createDto: CreateDriverApplicationDto,
    @CurrentUser() currentUser: any
  ): Promise<DriverApplicationResponseDto> {
    this.logger.log(`User ${currentUser.id} creating driver application`);
    
    return await this.driverApplicationService.createApplication(currentUser.id, createDto);
  }

  /**
   * 내 배달기사 신청서 조회
   */
  @Get('my-application')
  @ApiOperation({
    summary: '내 배달기사 신청서 조회',
    description: '현재 로그인한 사용자의 배달기사 신청서를 조회합니다.'
  })
  @ApiResponse({
    status: 200,
    description: '신청서 조회 성공',
    type: DriverApplicationResponseDto
  })
  @ApiResponse({
    status: 404,
    description: '신청서를 찾을 수 없음'
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패'
  })
  async getMyApplication(
    @CurrentUser() currentUser: any
  ): Promise<DriverApplicationResponseDto | null> {
    this.logger.log(`User ${currentUser.id} fetching their driver application`);
    
    return await this.driverApplicationService.getApplicationByUserId(currentUser.id);
  }

  /**
   * 배달기사 신청서 수정
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '배달기사 신청서 수정',
    description: '기존 배달기사 신청서를 수정합니다. 대기 중이거나 추가 정보 요청 상태일 때만 수정 가능합니다.'
  })
  @ApiParam({
    name: 'id',
    description: '신청서 ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: 200,
    description: '신청서 수정 성공',
    type: DriverApplicationResponseDto
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 또는 수정 불가능한 상태'
  })
  @ApiResponse({
    status: 403,
    description: '수정 권한 없음'
  })
  @ApiResponse({
    status: 404,
    description: '신청서를 찾을 수 없음'
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패'
  })
  async updateApplication(
    @Param('id', ParseUUIDPipe) applicationId: string,
    @Body() updateDto: UpdateDriverApplicationDto,
    @CurrentUser() currentUser: any
  ): Promise<DriverApplicationResponseDto> {
    this.logger.log(`User ${currentUser.id} updating driver application ${applicationId}`);
    
    return await this.driverApplicationService.updateApplication(
      applicationId,
      currentUser.id,
      updateDto
    );
  }

  /**
   * 배달기사 신청서 삭제
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '배달기사 신청서 삭제',
    description: '배달기사 신청서를 삭제합니다. 대기 중, 거부됨, 추가 정보 요청 상태일 때만 삭제 가능합니다.'
  })
  @ApiParam({
    name: 'id',
    description: '신청서 ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: 204,
    description: '신청서 삭제 성공'
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 또는 삭제 불가능한 상태'
  })
  @ApiResponse({
    status: 403,
    description: '삭제 권한 없음'
  })
  @ApiResponse({
    status: 404,
    description: '신청서를 찾을 수 없음'
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패'
  })
  async deleteApplication(
    @Param('id', ParseUUIDPipe) applicationId: string,
    @CurrentUser() currentUser: any
  ): Promise<void> {
    this.logger.log(`User ${currentUser.id} deleting driver application ${applicationId}`);
    
    await this.driverApplicationService.deleteApplication(applicationId, currentUser.id);
  }

  /**
   * 특정 배달기사 신청서 조회 (본인 것만)
   */
  @Get(':id')
  @ApiOperation({
    summary: '배달기사 신청서 상세 조회',
    description: '특정 배달기사 신청서의 상세 정보를 조회합니다. 본인의 신청서만 조회 가능합니다.'
  })
  @ApiParam({
    name: 'id',
    description: '신청서 ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: 200,
    description: '신청서 상세 조회 성공',
    type: DriverApplicationResponseDto
  })
  @ApiResponse({
    status: 403,
    description: '조회 권한 없음'
  })
  @ApiResponse({
    status: 404,
    description: '신청서를 찾을 수 없음'
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패'
  })
  async getApplicationById(
    @Param('id', ParseUUIDPipe) applicationId: string,
    @CurrentUser() currentUser: any
  ): Promise<DriverApplicationResponseDto> {
    this.logger.log(`User ${currentUser.id} fetching driver application ${applicationId}`);
    
    // 신청서 조회
    const application = await this.driverApplicationService.getApplicationById(applicationId);
    
    // 본인 신청서인지 확인
    if (application.userId !== currentUser.id) {
      this.logger.warn(`User ${currentUser.id} attempted to access application ${applicationId} owned by ${application.userId}`);
      throw new Error('본인의 신청서만 조회할 수 있습니다.');
    }
    
    return application;
  }

  /**
   * 신청 가능 여부 확인
   */
  @Get('check/eligibility')
  @ApiOperation({
    summary: '배달기사 신청 가능 여부 확인',
    description: '현재 사용자가 배달기사 신청을 할 수 있는지 확인합니다.'
  })
  @ApiResponse({
    status: 200,
    description: '신청 가능 여부 조회 성공',
    schema: {
      type: 'object',
      properties: {
        eligible: { type: 'boolean', description: '신청 가능 여부' },
        reason: { type: 'string', description: '신청 불가능한 경우 사유' },
        existingApplication: { 
          type: 'object', 
          description: '기존 신청서 정보 (있는 경우)',
          nullable: true
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패'
  })
  async checkEligibility(
    @CurrentUser() currentUser: any
  ): Promise<{
    eligible: boolean;
    reason?: string;
    existingApplication?: DriverApplicationResponseDto;
  }> {
    this.logger.log(`User ${currentUser.id} checking driver application eligibility`);
    
    // 기존 신청서 확인
    const existingApplication = await this.driverApplicationService.getApplicationByUserId(currentUser.id);
    
    if (existingApplication) {
      // 기존 신청서가 있는 경우
      const inProgressStatuses = ['pending', 'under_review', 'additional_info_required'];
      
      if (inProgressStatuses.includes(existingApplication.status)) {
        return {
          eligible: false,
          reason: '이미 진행 중인 신청서가 있습니다.',
          existingApplication
        };
      } else if (existingApplication.status === 'approved') {
        return {
          eligible: false,
          reason: '이미 승인된 배달기사입니다.',
          existingApplication
        };
      } else {
        // 거부된 경우 재신청 가능
        return {
          eligible: true,
          existingApplication
        };
      }
    }
    
    // 신청서가 없는 경우 신청 가능
    return {
      eligible: true
    };
  }
} 