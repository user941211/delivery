/**
 * 관리자용 배달기사 신청 관리 컨트롤러
 * 
 * 관리자가 배달기사 신청서를 검토, 승인, 거부하고 통계를 조회할 수 있는 API를 제공합니다.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
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
  ApiQuery,
  ApiBearerAuth,
  ApiSecurity
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { DriverApplicationService } from '../driver-application.service';
import { NotificationService } from '../../notifications/services/notification.service';
import {
  ReviewApplicationDto,
  DriverApplicationResponseDto,
  GetDriverApplicationsQueryDto,
  ApplicationStatus
} from '../dto/driver-application.dto';
import {
  DriverApplicationListResult,
  DriverApplicationStats
} from '../entities/driver-application.entity';

/**
 * 관리자용 배달기사 신청 관리 컨트롤러
 */
@ApiTags('Admin - Driver Applications')
@Controller('admin/driver-applications')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('admin')
@ApiBearerAuth()
@ApiSecurity('bearer')
export class AdminDriverApplicationController {
  private readonly logger = new Logger(AdminDriverApplicationController.name);

  constructor(
    private readonly driverApplicationService: DriverApplicationService,
    private readonly notificationService: NotificationService
  ) {}

  /**
   * 배달기사 신청서 목록 조회 (관리자용)
   */
  @Get()
  @ApiOperation({
    summary: '배달기사 신청서 목록 조회',
    description: '관리자가 모든 배달기사 신청서를 필터링하여 조회할 수 있습니다.'
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ApplicationStatus,
    description: '신청 상태로 필터링'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: 'string',
    description: '페이지 번호 (기본값: 1)'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'string',
    description: '페이지당 항목 수 (기본값: 20, 최대: 100)'
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: 'string',
    description: '검색 키워드 (이름, 이메일, 전화번호)'
  })
  @ApiResponse({
    status: 200,
    description: '신청서 목록 조회 성공',
    type: Object // DriverApplicationListResult 타입으로 실제 응답
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청'
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패'
  })
  @ApiResponse({
    status: 403,
    description: '관리자 권한 필요'
  })
  async getApplications(
    @Query() queryDto: GetDriverApplicationsQueryDto,
    @CurrentUser() currentUser: any
  ): Promise<DriverApplicationListResult> {
    this.logger.log(`Admin ${currentUser.id} fetching driver applications with filters: ${JSON.stringify(queryDto)}`);
    
    return await this.driverApplicationService.getApplications(queryDto);
  }

  /**
   * 특정 배달기사 신청서 상세 조회
   */
  @Get(':id')
  @ApiOperation({
    summary: '배달기사 신청서 상세 조회',
    description: '관리자가 특정 배달기사 신청서의 상세 정보를 조회할 수 있습니다.'
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
    status: 404,
    description: '신청서를 찾을 수 없음'
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패'
  })
  @ApiResponse({
    status: 403,
    description: '관리자 권한 필요'
  })
  async getApplicationById(
    @Param('id', ParseUUIDPipe) applicationId: string,
    @CurrentUser() currentUser: any
  ): Promise<DriverApplicationResponseDto> {
    this.logger.log(`Admin ${currentUser.id} fetching driver application ${applicationId}`);
    
    return await this.driverApplicationService.getApplicationById(applicationId);
  }

  /**
   * 배달기사 신청서 검토 및 승인/거부
   */
  @Put(':id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '배달기사 신청서 검토',
    description: '관리자가 배달기사 신청서를 검토하여 승인, 거부, 또는 추가 정보 요청을 할 수 있습니다.'
  })
  @ApiParam({
    name: 'id',
    description: '신청서 ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: 200,
    description: '신청서 검토 완료',
    type: DriverApplicationResponseDto
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 또는 검토 불가능한 상태'
  })
  @ApiResponse({
    status: 404,
    description: '신청서를 찾을 수 없음'
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패'
  })
  @ApiResponse({
    status: 403,
    description: '관리자 권한 필요'
  })
  async reviewApplication(
    @Param('id', ParseUUIDPipe) applicationId: string,
    @Body() reviewDto: ReviewApplicationDto,
    @CurrentUser() currentUser: any
  ): Promise<DriverApplicationResponseDto> {
    this.logger.log(`Admin ${currentUser.id} reviewing driver application ${applicationId}: ${reviewDto.approved ? 'APPROVED' : 'REJECTED'}`);
    
    // 신청서 검토 처리
    const result = await this.driverApplicationService.reviewApplication(
      applicationId,
      reviewDto,
      currentUser.id
    );

    // 신청자에게 검토 결과 알림 전송
    await this.sendReviewNotification(result, reviewDto);

    this.logger.log(`Driver application ${applicationId} review completed with status: ${result.status}`);
    
    return result;
  }

  /**
   * 배달기사 신청 통계 조회
   */
  @Get('stats/overview')
  @ApiOperation({
    summary: '배달기사 신청 통계 조회',
    description: '관리자가 배달기사 신청서의 전체 통계를 조회할 수 있습니다.'
  })
  @ApiResponse({
    status: 200,
    description: '통계 조회 성공',
    type: Object // DriverApplicationStats 타입으로 실제 응답
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패'
  })
  @ApiResponse({
    status: 403,
    description: '관리자 권한 필요'
  })
  async getApplicationStats(
    @CurrentUser() currentUser: any
  ): Promise<DriverApplicationStats> {
    this.logger.log(`Admin ${currentUser.id} fetching driver application stats`);
    
    return await this.driverApplicationService.getApplicationStats();
  }

  /**
   * 대기 중인 신청서 목록 조회 (우선순위 처리용)
   */
  @Get('pending/priority')
  @ApiOperation({
    summary: '대기 중인 신청서 우선순위 목록',
    description: '검토가 필요한 신청서를 우선순위 순으로 조회합니다.'
  })
  @ApiResponse({
    status: 200,
    description: '우선순위 목록 조회 성공',
    type: [DriverApplicationResponseDto]
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패'
  })
  @ApiResponse({
    status: 403,
    description: '관리자 권한 필요'
  })
  async getPendingApplications(
    @CurrentUser() currentUser: any
  ): Promise<DriverApplicationResponseDto[]> {
    this.logger.log(`Admin ${currentUser.id} fetching pending driver applications`);
    
    // 검토가 필요한 상태의 신청서들을 조회
    const result = await this.driverApplicationService.getApplications({
      status: ApplicationStatus.PENDING,
      limit: '50', // 최대 50개까지
      page: '1'
    });

    return result.applications;
  }

  /**
   * 신청서 상태별 개수 조회
   */
  @Get('stats/by-status')
  @ApiOperation({
    summary: '상태별 신청서 개수 조회',
    description: '각 상태별 신청서 개수를 조회합니다.'
  })
  @ApiResponse({
    status: 200,
    description: '상태별 개수 조회 성공'
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패'
  })
  @ApiResponse({
    status: 403,
    description: '관리자 권한 필요'
  })
  async getApplicationCountsByStatus(
    @CurrentUser() currentUser: any
  ): Promise<Record<ApplicationStatus, number>> {
    this.logger.log(`Admin ${currentUser.id} fetching application counts by status`);
    
    const stats = await this.driverApplicationService.getApplicationStats();
    
    return {
      [ApplicationStatus.PENDING]: stats.pending,
      [ApplicationStatus.UNDER_REVIEW]: stats.underReview,
      [ApplicationStatus.APPROVED]: stats.approved,
      [ApplicationStatus.REJECTED]: stats.rejected,
      [ApplicationStatus.ADDITIONAL_INFO_REQUIRED]: stats.additionalInfoRequired
    };
  }

  /**
   * 프라이빗 헬퍼 메서드들
   */

  /**
   * 신청자에게 검토 결과 알림 전송
   */
  private async sendReviewNotification(
    application: DriverApplicationResponseDto,
    reviewDto: ReviewApplicationDto
  ): Promise<void> {
    try {
      let title: string;
      let message: string;

      if (reviewDto.approved) {
        title = '배달기사 신청 승인';
        message = `축하합니다! 배달기사 신청이 승인되었습니다. 이제 배달 서비스를 시작할 수 있습니다.`;
      } else if (reviewDto.requiresAdditionalInfo) {
        title = '배달기사 신청 - 추가 정보 필요';
        message = `신청서 검토 중 추가 정보가 필요합니다. ${reviewDto.reviewComment || '자세한 내용은 신청서를 확인해주세요.'}`;
      } else {
        title = '배달기사 신청 거부';
        message = `죄송합니다. 배달기사 신청이 거부되었습니다. 사유: ${reviewDto.reviewComment || '검토 결과 승인 기준에 미달'}`;
      }

      // 실제로는 알림 서비스를 통해 푸시 알림, 이메일, SMS 등을 발송
      // 여기서는 로깅만 수행
      this.logger.log(`Sending review notification to user ${application.userId}: ${title}`);

      // 향후 푸시 알림 서비스 연동 예정
      // await this.pushNotificationService.sendToUser(application.userId, { title, message });
      
      // 향후 이메일 서비스 연동 예정
      // await this.emailService.sendReviewResult(application.applicantEmail, { title, message });

    } catch (error) {
      this.logger.error('Failed to send review notification:', error);
      // 알림 전송 실패는 검토 프로세스를 중단하지 않음
    }
  }
} 