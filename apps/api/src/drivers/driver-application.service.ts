/**
 * 배달기사 신청 서비스
 * 
 * 배달기사 신청서 생성, 조회, 수정, 삭제 등 배달기사 신청 관련 비즈니스 로직을 처리하는 서비스입니다.
 */

import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ForbiddenException,
  ConflictException,
  Logger 
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  CreateDriverApplicationDto,
  UpdateDriverApplicationDto,
  ReviewApplicationDto,
  DriverApplicationResponseDto,
  GetDriverApplicationsQueryDto,
  ApplicationStatus,
  VehicleType
} from './dto/driver-application.dto';
import {
  DriverApplicationEntity,
  DriverApplicationWithUserEntity,
  CreateDriverApplicationData,
  UpdateDriverApplicationData,
  DriverApplicationFilter,
  DriverApplicationListResult,
  DriverApplicationStats
} from './entities/driver-application.entity';

@Injectable()
export class DriverApplicationService {
  private readonly logger = new Logger(DriverApplicationService.name);
  private readonly supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    // Supabase 클라이언트 초기화
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || 
                        this.configService.get<string>('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is missing');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * 배달기사 신청서 생성
   */
  async createApplication(
    userId: string, 
    createDto: CreateDriverApplicationDto
  ): Promise<DriverApplicationResponseDto> {
    try {
      // 기존 신청서 확인 (사용자당 하나의 활성 신청서만 허용)
      const existingApplication = await this.findActiveApplicationByUserId(userId);
      if (existingApplication) {
        throw new ConflictException('이미 진행 중인 신청서가 있습니다. 기존 신청서를 완료하거나 취소한 후 다시 신청해주세요.');
      }

      // 사용자 정보 확인
      const user = await this.getUserById(userId);
      if (!user) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }

      // 차량 정보 유효성 검증
      this.validateVehicleInfo(createDto.vehicleInfo);

      // 배달 구역 유효성 검증
      this.validateDeliveryAreas(createDto.deliveryAreas);

      // 신청서 데이터 준비
      const applicationData: CreateDriverApplicationData = {
        user_id: userId,
        vehicle_info: {
          type: createDto.vehicleInfo.type,
          plateNumber: createDto.vehicleInfo.plateNumber,
          model: createDto.vehicleInfo.model,
          year: createDto.vehicleInfo.year,
          color: createDto.vehicleInfo.color
        },
        documents: {
          identificationUrl: createDto.documents.identificationUrl,
          drivingLicenseUrl: createDto.documents.drivingLicenseUrl,
          vehicleRegistrationUrl: createDto.documents.vehicleRegistrationUrl,
          insuranceUrl: createDto.documents.insuranceUrl,
          bankAccountUrl: createDto.documents.bankAccountUrl
        },
        delivery_areas: createDto.deliveryAreas.map(area => ({
          name: area.name,
          latitude: area.latitude,
          longitude: area.longitude,
          radius: area.radius
        })),
        introduction: createDto.introduction,
        privacy_consent: createDto.privacyConsent,
        terms_consent: createDto.termsConsent,
        status: ApplicationStatus.PENDING
      };

      // 데이터베이스에 신청서 저장
      const { data, error } = await this.supabase
        .from('driver_applications')
        .insert(applicationData)
        .select(`
          *,
          user:users(
            id,
            email,
            username,
            full_name,
            phone,
            role,
            status,
            is_email_verified,
            is_phone_verified,
            profile_image_url,
            created_at,
            updated_at
          )
        `)
        .single();

      if (error) {
        this.logger.error('Failed to create driver application', error);
        throw new BadRequestException(`신청서 생성에 실패했습니다: ${error.message}`);
      }

      this.logger.log(`Driver application created successfully for user ${userId}`);
      return this.mapToResponseDto(data);

    } catch (error) {
      if (error instanceof ConflictException || 
          error instanceof NotFoundException || 
          error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Unexpected error creating driver application', error);
      throw new BadRequestException('신청서 생성 중 오류가 발생했습니다.');
    }
  }

  /**
   * 배달기사 신청서 조회 (ID로)
   */
  async getApplicationById(applicationId: string): Promise<DriverApplicationResponseDto> {
    try {
      const { data, error } = await this.supabase
        .from('driver_applications')
        .select(`
          *,
          user:users(
            id,
            email,
            username,
            full_name,
            phone,
            role,
            status,
            is_email_verified,
            is_phone_verified,
            profile_image_url,
            created_at,
            updated_at
          )
        `)
        .eq('id', applicationId)
        .single();

      if (error || !data) {
        throw new NotFoundException('신청서를 찾을 수 없습니다.');
      }

      return this.mapToResponseDto(data);

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error fetching driver application', error);
      throw new BadRequestException('신청서 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 사용자의 배달기사 신청서 조회
   */
  async getApplicationByUserId(userId: string): Promise<DriverApplicationResponseDto | null> {
    try {
      const { data, error } = await this.supabase
        .from('driver_applications')
        .select(`
          *,
          user:users(
            id,
            email,
            username,
            full_name,
            phone,
            role,
            status,
            is_email_verified,
            is_phone_verified,
            profile_image_url,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapToResponseDto(data);

    } catch (error) {
      this.logger.error('Error fetching user driver application', error);
      throw new BadRequestException('신청서 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 배달기사 신청서 목록 조회 (관리자용)
   */
  async getApplications(queryDto: GetDriverApplicationsQueryDto): Promise<DriverApplicationListResult> {
    try {
      const page = parseInt(queryDto.page || '1');
      const limit = parseInt(queryDto.limit || '20');
      const offset = (page - 1) * limit;

      // 기본 쿼리 구성
      let query = this.supabase
        .from('driver_applications')
        .select(`
          *,
          user:users(
            id,
            email,
            username,
            full_name,
            phone,
            role,
            status,
            is_email_verified,
            is_phone_verified,
            profile_image_url,
            created_at,
            updated_at
          )
        `, { count: 'exact' });

      // 상태 필터 적용
      if (queryDto.status) {
        query = query.eq('status', queryDto.status);
      }

      // 검색 키워드 적용
      if (queryDto.search) {
        query = query.or(`
          user.full_name.ilike.%${queryDto.search}%,
          user.email.ilike.%${queryDto.search}%,
          user.phone.ilike.%${queryDto.search}%
        `);
      }

      // 정렬 및 페이지네이션 적용
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        this.logger.error('Error fetching driver applications', error);
        throw new BadRequestException(`신청서 목록 조회에 실패했습니다: ${error.message}`);
      }

      const applications = data?.map(item => this.mapToResponseDto(item)) || [];
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        applications,
        total,
        page,
        limit,
        totalPages
      };

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Unexpected error fetching driver applications', error);
      throw new BadRequestException('신청서 목록 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 배달기사 신청서 수정
   */
  async updateApplication(
    applicationId: string, 
    userId: string, 
    updateDto: UpdateDriverApplicationDto
  ): Promise<DriverApplicationResponseDto> {
    try {
      // 신청서 존재 및 권한 확인
      const existingApplication = await this.getApplicationById(applicationId);
      if (existingApplication.userId !== userId) {
        throw new ForbiddenException('신청서를 수정할 권한이 없습니다.');
      }

      // 수정 가능한 상태인지 확인
      if (!this.canModifyApplication(existingApplication.status)) {
        throw new BadRequestException('현재 상태에서는 신청서를 수정할 수 없습니다.');
      }

      // 업데이트 데이터 준비
      const updateData: Partial<UpdateDriverApplicationData> = {
        updated_at: new Date().toISOString()
      };

      if (updateDto.vehicleInfo) {
        this.validateVehicleInfo(updateDto.vehicleInfo);
        updateData.vehicle_info = {
          type: updateDto.vehicleInfo.type,
          plateNumber: updateDto.vehicleInfo.plateNumber,
          model: updateDto.vehicleInfo.model,
          year: updateDto.vehicleInfo.year,
          color: updateDto.vehicleInfo.color
        };
      }

      if (updateDto.documents) {
        updateData.documents = {
          identificationUrl: updateDto.documents.identificationUrl,
          drivingLicenseUrl: updateDto.documents.drivingLicenseUrl,
          vehicleRegistrationUrl: updateDto.documents.vehicleRegistrationUrl,
          insuranceUrl: updateDto.documents.insuranceUrl,
          bankAccountUrl: updateDto.documents.bankAccountUrl
        };
      }

      if (updateDto.deliveryAreas) {
        this.validateDeliveryAreas(updateDto.deliveryAreas);
        updateData.delivery_areas = updateDto.deliveryAreas.map(area => ({
          name: area.name,
          latitude: area.latitude,
          longitude: area.longitude,
          radius: area.radius
        }));
      }

      if (updateDto.introduction !== undefined) {
        updateData.introduction = updateDto.introduction;
      }

      // 데이터베이스 업데이트
      const { data, error } = await this.supabase
        .from('driver_applications')
        .update(updateData)
        .eq('id', applicationId)
        .select(`
          *,
          user:users(
            id,
            email,
            username,
            full_name,
            phone,
            role,
            status,
            is_email_verified,
            is_phone_verified,
            profile_image_url,
            created_at,
            updated_at
          )
        `)
        .single();

      if (error) {
        this.logger.error('Failed to update driver application', error);
        throw new BadRequestException(`신청서 수정에 실패했습니다: ${error.message}`);
      }

      this.logger.log(`Driver application ${applicationId} updated successfully`);
      return this.mapToResponseDto(data);

    } catch (error) {
      if (error instanceof NotFoundException || 
          error instanceof ForbiddenException || 
          error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Unexpected error updating driver application', error);
      throw new BadRequestException('신청서 수정 중 오류가 발생했습니다.');
    }
  }

  /**
   * 배달기사 신청서 검토 (관리자용)
   */
  async reviewApplication(
    applicationId: string, 
    reviewDto: ReviewApplicationDto, 
    reviewerId: string
  ): Promise<DriverApplicationResponseDto> {
    try {
      // 신청서 존재 확인
      const existingApplication = await this.getApplicationById(applicationId);

      // 검토 가능한 상태인지 확인
      if (!this.canReviewApplication(existingApplication.status)) {
        throw new BadRequestException('현재 상태에서는 신청서를 검토할 수 없습니다.');
      }

      // 새로운 상태 결정
      let newStatus: ApplicationStatus;
      if (reviewDto.approved) {
        newStatus = ApplicationStatus.APPROVED;
      } else if (reviewDto.requiresAdditionalInfo) {
        newStatus = ApplicationStatus.ADDITIONAL_INFO_REQUIRED;
      } else {
        newStatus = ApplicationStatus.REJECTED;
      }

      // 업데이트 데이터 준비
      const updateData: Partial<UpdateDriverApplicationData> = {
        status: newStatus,
        review_comment: reviewDto.reviewComment,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 데이터베이스 업데이트
      const { data, error } = await this.supabase
        .from('driver_applications')
        .update(updateData)
        .eq('id', applicationId)
        .select(`
          *,
          user:users(
            id,
            email,
            username,
            full_name,
            phone,
            role,
            status,
            is_email_verified,
            is_phone_verified,
            profile_image_url,
            created_at,
            updated_at
          )
        `)
        .single();

      if (error) {
        this.logger.error('Failed to review driver application', error);
        throw new BadRequestException(`신청서 검토에 실패했습니다: ${error.message}`);
      }

      // 승인된 경우 사용자 역할 업데이트
      if (newStatus === ApplicationStatus.APPROVED) {
        await this.updateUserRoleToDriver(existingApplication.userId);
      }

      this.logger.log(`Driver application ${applicationId} reviewed: ${newStatus}`);
      return this.mapToResponseDto(data);

    } catch (error) {
      if (error instanceof NotFoundException || 
          error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Unexpected error reviewing driver application', error);
      throw new BadRequestException('신청서 검토 중 오류가 발생했습니다.');
    }
  }

  /**
   * 배달기사 신청서 삭제
   */
  async deleteApplication(applicationId: string, userId: string): Promise<void> {
    try {
      // 신청서 존재 및 권한 확인
      const existingApplication = await this.getApplicationById(applicationId);
      if (existingApplication.userId !== userId) {
        throw new ForbiddenException('신청서를 삭제할 권한이 없습니다.');
      }

      // 삭제 가능한 상태인지 확인
      if (!this.canDeleteApplication(existingApplication.status)) {
        throw new BadRequestException('현재 상태에서는 신청서를 삭제할 수 없습니다.');
      }

      // 데이터베이스에서 삭제
      const { error } = await this.supabase
        .from('driver_applications')
        .delete()
        .eq('id', applicationId);

      if (error) {
        this.logger.error('Failed to delete driver application', error);
        throw new BadRequestException(`신청서 삭제에 실패했습니다: ${error.message}`);
      }

      this.logger.log(`Driver application ${applicationId} deleted successfully`);

    } catch (error) {
      if (error instanceof NotFoundException || 
          error instanceof ForbiddenException || 
          error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Unexpected error deleting driver application', error);
      throw new BadRequestException('신청서 삭제 중 오류가 발생했습니다.');
    }
  }

  /**
   * 배달기사 신청 통계 조회 (관리자용)
   */
  async getApplicationStats(): Promise<DriverApplicationStats> {
    try {
      const { data, error } = await this.supabase
        .from('driver_applications')
        .select('status');

      if (error) {
        this.logger.error('Error fetching application stats', error);
        throw new BadRequestException(`통계 조회에 실패했습니다: ${error.message}`);
      }

      const stats: DriverApplicationStats = {
        total: data.length,
        pending: 0,
        underReview: 0,
        approved: 0,
        rejected: 0,
        additionalInfoRequired: 0
      };

      data.forEach(item => {
        switch (item.status) {
          case ApplicationStatus.PENDING:
            stats.pending++;
            break;
          case ApplicationStatus.UNDER_REVIEW:
            stats.underReview++;
            break;
          case ApplicationStatus.APPROVED:
            stats.approved++;
            break;
          case ApplicationStatus.REJECTED:
            stats.rejected++;
            break;
          case ApplicationStatus.ADDITIONAL_INFO_REQUIRED:
            stats.additionalInfoRequired++;
            break;
        }
      });

      return stats;

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Unexpected error fetching application stats', error);
      throw new BadRequestException('통계 조회 중 오류가 발생했습니다.');
    }
  }

  // Private helper methods

  /**
   * 사용자 ID로 활성 신청서 찾기
   */
  private async findActiveApplicationByUserId(userId: string): Promise<DriverApplicationEntity | null> {
    const { data } = await this.supabase
      .from('driver_applications')
      .select('*')
      .eq('user_id', userId)
      .in('status', [
        ApplicationStatus.PENDING,
        ApplicationStatus.UNDER_REVIEW,
        ApplicationStatus.ADDITIONAL_INFO_REQUIRED
      ])
      .single();

    return data;
  }

  /**
   * 사용자 정보 조회
   */
  private async getUserById(userId: string): Promise<any> {
    const { data } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    return data;
  }

  /**
   * 차량 정보 유효성 검증
   */
  private validateVehicleInfo(vehicleInfo: any): void {
    // 오토바이나 자동차의 경우 차량 번호 필수
    if ((vehicleInfo.type === VehicleType.MOTORCYCLE || vehicleInfo.type === VehicleType.CAR) && 
        !vehicleInfo.plateNumber) {
      throw new BadRequestException('오토바이 또는 자동차의 경우 차량 번호가 필요합니다.');
    }
  }

  /**
   * 배달 구역 유효성 검증
   */
  private validateDeliveryAreas(deliveryAreas: any[]): void {
    if (!deliveryAreas || deliveryAreas.length === 0) {
      throw new BadRequestException('최소 하나의 배달 구역을 선택해야 합니다.');
    }

    if (deliveryAreas.length > 5) {
      throw new BadRequestException('배달 구역은 최대 5개까지 선택할 수 있습니다.');
    }
  }

  /**
   * 신청서 수정 가능 여부 확인
   */
  private canModifyApplication(status: ApplicationStatus): boolean {
    return [
      ApplicationStatus.PENDING,
      ApplicationStatus.ADDITIONAL_INFO_REQUIRED
    ].includes(status);
  }

  /**
   * 신청서 검토 가능 여부 확인
   */
  private canReviewApplication(status: ApplicationStatus): boolean {
    return [
      ApplicationStatus.PENDING,
      ApplicationStatus.UNDER_REVIEW,
      ApplicationStatus.ADDITIONAL_INFO_REQUIRED
    ].includes(status);
  }

  /**
   * 신청서 삭제 가능 여부 확인
   */
  private canDeleteApplication(status: ApplicationStatus): boolean {
    return [
      ApplicationStatus.PENDING,
      ApplicationStatus.REJECTED,
      ApplicationStatus.ADDITIONAL_INFO_REQUIRED
    ].includes(status);
  }

  /**
   * 사용자 역할을 배달기사로 업데이트
   */
  private async updateUserRoleToDriver(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update({ 
        role: 'delivery_driver',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      this.logger.error('Failed to update user role to driver', error);
      // 역할 업데이트 실패는 치명적이지 않으므로 예외를 던지지 않음
    }
  }

  /**
   * 엔티티를 응답 DTO로 변환
   */
  private mapToResponseDto(entity: DriverApplicationWithUserEntity): DriverApplicationResponseDto {
    return {
      id: entity.id,
      userId: entity.user_id,
      applicantName: entity.user.full_name,
      applicantEmail: entity.user.email,
      applicantPhone: entity.user.phone,
      vehicleInfo: {
        type: entity.vehicle_info.type,
        plateNumber: entity.vehicle_info.plateNumber,
        model: entity.vehicle_info.model,
        year: entity.vehicle_info.year,
        color: entity.vehicle_info.color
      },
      documents: {
        identificationUrl: entity.documents.identificationUrl,
        drivingLicenseUrl: entity.documents.drivingLicenseUrl,
        vehicleRegistrationUrl: entity.documents.vehicleRegistrationUrl,
        insuranceUrl: entity.documents.insuranceUrl,
        bankAccountUrl: entity.documents.bankAccountUrl
      },
      deliveryAreas: entity.delivery_areas.map(area => ({
        name: area.name,
        latitude: area.latitude,
        longitude: area.longitude,
        radius: area.radius
      })),
      introduction: entity.introduction,
      status: entity.status,
      reviewComment: entity.review_comment,
      reviewedBy: entity.reviewed_by,
      reviewedAt: entity.reviewed_at ? new Date(entity.reviewed_at) : undefined,
      createdAt: new Date(entity.created_at),
      updatedAt: new Date(entity.updated_at)
    };
  }
} 