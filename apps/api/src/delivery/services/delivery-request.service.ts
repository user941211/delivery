/**
 * 배달 요청 관리 서비스
 * 
 * 배달 요청의 생성부터 완료까지 전체 라이프사이클을 관리합니다.
 */

import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DriverLocationService } from './driver-location.service';
import { DeliveryMatchingService, MatchingRequest, MatchingResult } from './delivery-matching.service';
import { RealtimeNotificationService } from '../../realtime/services/realtime-notification.service';
import { NotificationPriority, UserType } from '../../realtime/dto/realtime-events.dto';

import { 
  CreateDeliveryRequestDto,
  UpdateDeliveryRequestDto,
  GetDeliveryRequestsQueryDto,
  DeliveryRequestResponseDto,
  DeliveryRequestStatus,
  DeliveryPriority
} from '../dto/delivery-request.dto';

import {
  ManualAssignDeliveryDto,
  AutoAssignDeliveryDto,
  BroadcastAssignDeliveryDto,
  DriverResponseDto,
  CancelAssignmentDto,
  DeliveryAssignmentResponseDto,
  DeliveryAssignmentStatus,
  DeliveryAssignmentStatsDto,
  AssignmentMethod,
  DriverResponseType
} from '../dto/delivery-assignment.dto';

import { 
  DeliveryRequestEntity,
  DeliveryAssignmentEntity,
  DriverResponseHistoryEntity,
  Database
} from '../entities/delivery.entity';

/**
 * 페이지네이션 결과 인터페이스
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 배달 요청 관리 서비스 클래스
 */
@Injectable()
export class DeliveryRequestService {
  private readonly logger = new Logger(DeliveryRequestService.name);
  private readonly supabase: SupabaseClient<Database>;

  constructor(
    private readonly configService: ConfigService,
    private readonly driverLocationService: DriverLocationService,
    private readonly deliveryMatchingService: DeliveryMatchingService,
    @Inject(forwardRef(() => RealtimeNotificationService))
    private readonly realtimeNotificationService: RealtimeNotificationService
  ) {
    // Supabase 클라이언트 초기화
    this.supabase = createClient<Database>(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')
    );
  }

  /**
   * 배달 요청 생성
   */
  async createDeliveryRequest(requestData: CreateDeliveryRequestDto): Promise<DeliveryRequestResponseDto> {
    try {
      this.logger.log(`Creating delivery request for order: ${requestData.orderId}`);

      // 중복 배달 요청 확인
      const { data: existingRequest } = await this.supabase
        .from('delivery_requests')
        .select('id')
        .eq('order_id', requestData.orderId)
        .single();

      if (existingRequest) {
        throw new ConflictException('이미 해당 주문에 대한 배달 요청이 존재합니다.');
      }

      const now = new Date().toISOString();

      // 배달 요청 생성
      const { data, error } = await this.supabase
        .from('delivery_requests')
        .insert({
          order_id: requestData.orderId,
          pickup_location: requestData.pickupLocation,
          delivery_location: requestData.deliveryLocation,
          status: DeliveryRequestStatus.PENDING,
          priority: requestData.priority,
          estimated_distance: requestData.estimatedDistance,
          estimated_duration: requestData.estimatedDuration,
          special_instructions: requestData.specialInstructions,
          customer_phone: requestData.customerPhone,
          customer_name: requestData.customerName,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();

      if (error) throw error;

      this.logger.log(`Delivery request created with ID: ${data.id}`);
      return this.mapToResponseDto(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to create delivery request: ${errorMessage}`);
      if (error instanceof ConflictException) throw error;
      throw new BadRequestException('배달 요청 생성에 실패했습니다.');
    }
  }

  /**
   * 배달 요청 조회 (단일)
   */
  async getDeliveryRequest(requestId: string): Promise<DeliveryRequestResponseDto> {
    try {
      const { data, error } = await this.supabase
        .from('delivery_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundException('배달 요청을 찾을 수 없습니다.');
        }
        throw error;
      }

      return this.mapToResponseDto(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get delivery request: ${errorMessage}`);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('배달 요청 조회에 실패했습니다.');
    }
  }

  /**
   * 배달 요청 목록 조회 (페이지네이션)
   */
  async getDeliveryRequests(query: GetDeliveryRequestsQueryDto): Promise<PaginatedResult<DeliveryRequestResponseDto>> {
    try {
      this.logger.log('Fetching delivery requests with filters');

      let queryBuilder = this.supabase
        .from('delivery_requests')
        .select('*', { count: 'exact' });

      // 필터 적용
      if (query.status?.length) {
        queryBuilder = queryBuilder.in('status', query.status);
      }

      if (query.priority?.length) {
        queryBuilder = queryBuilder.in('priority', query.priority);
      }

      if (query.startDate) {
        queryBuilder = queryBuilder.gte('created_at', query.startDate);
      }

      if (query.endDate) {
        queryBuilder = queryBuilder.lte('created_at', query.endDate);
      }

      // 페이지네이션
      const offset = (query.page - 1) * query.limit;
      queryBuilder = queryBuilder
        .order('created_at', { ascending: false })
        .range(offset, offset + query.limit - 1);

      const { data, error, count } = await queryBuilder;

      if (error) throw error;

      const totalPages = Math.ceil((count || 0) / query.limit);

      return {
        data: (data || []).map(item => this.mapToResponseDto(item)),
        total: count || 0,
        page: query.page,
        limit: query.limit,
        totalPages
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get delivery requests: ${errorMessage}`);
      throw new BadRequestException('배달 요청 목록 조회에 실패했습니다.');
    }
  }

  /**
   * 배달 요청 업데이트
   */
  async updateDeliveryRequest(
    requestId: string, 
    updateData: UpdateDeliveryRequestDto
  ): Promise<DeliveryRequestResponseDto> {
    try {
      this.logger.log(`Updating delivery request: ${requestId}`);

      const now = new Date().toISOString();

      const { data, error } = await this.supabase
        .from('delivery_requests')
        .update({
          ...updateData,
          updated_at: now,
          ...(updateData.status === DeliveryRequestStatus.DELIVERED && {
            completed_at: now
          })
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundException('배달 요청을 찾을 수 없습니다.');
        }
        throw error;
      }

      // 상태 변경 알림 발송
      if (updateData.status) {
        await this.sendStatusChangeNotification(data);
      }

      this.logger.log(`Delivery request updated: ${requestId}`);
      return this.mapToResponseDto(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to update delivery request: ${errorMessage}`);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('배달 요청 업데이트에 실패했습니다.');
    }
  }

  /**
   * 수동 배달 배정
   */
  async manualAssignDelivery(assignmentData: ManualAssignDeliveryDto): Promise<DeliveryAssignmentResponseDto> {
    try {
      this.logger.log(`Manual assignment: Request ${assignmentData.deliveryRequestId} to Driver ${assignmentData.driverId}`);

      // 배달 요청 상태 확인
      const deliveryRequest = await this.getDeliveryRequest(assignmentData.deliveryRequestId);
      if (deliveryRequest.status !== DeliveryRequestStatus.PENDING) {
        throw new BadRequestException('대기 중인 배달 요청만 배정할 수 있습니다.');
      }

      // 매칭 가능성 검증
      const matchingRequest: MatchingRequest = {
        pickupLatitude: deliveryRequest.pickupLocation.latitude,
        pickupLongitude: deliveryRequest.pickupLocation.longitude,
        deliveryLatitude: deliveryRequest.deliveryLocation.latitude,
        deliveryLongitude: deliveryRequest.deliveryLocation.longitude,
        priority: deliveryRequest.priority,
        method: AssignmentMethod.MANUAL
      };

      const eligibility = await this.deliveryMatchingService.validateMatchingEligibility(
        assignmentData.driverId,
        matchingRequest
      );

      if (!eligibility.eligible) {
        throw new BadRequestException(`배정할 수 없습니다: ${eligibility.reason}`);
      }

      // 배정 생성
      const assignment = await this.createAssignment(
        assignmentData.deliveryRequestId,
        assignmentData.driverId,
        AssignmentMethod.MANUAL,
        assignmentData.responseTimeoutMinutes,
        assignmentData.assignmentNote
      );

      // 배달 요청 상태 업데이트
      await this.updateDeliveryRequest(assignmentData.deliveryRequestId, {
        status: DeliveryRequestStatus.ASSIGNED
      });

      // 배달기사에게 알림 발송
      await this.sendAssignmentNotification(assignment);

      return assignment;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to manually assign delivery: ${errorMessage}`);
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new BadRequestException('수동 배정에 실패했습니다.');
    }
  }

  /**
   * 자동 배달 배정
   */
  async autoAssignDelivery(assignmentData: AutoAssignDeliveryDto): Promise<DeliveryAssignmentResponseDto | null> {
    try {
      this.logger.log(`Auto assignment: Request ${assignmentData.deliveryRequestId} using ${assignmentData.method}`);

      // 배달 요청 정보 조회
      const deliveryRequest = await this.getDeliveryRequest(assignmentData.deliveryRequestId);
      if (deliveryRequest.status !== DeliveryRequestStatus.PENDING) {
        throw new BadRequestException('대기 중인 배달 요청만 배정할 수 있습니다.');
      }

      // 매칭 요청 생성
      const matchingRequest: MatchingRequest = {
        pickupLatitude: deliveryRequest.pickupLocation.latitude,
        pickupLongitude: deliveryRequest.pickupLocation.longitude,
        deliveryLatitude: deliveryRequest.deliveryLocation.latitude,
        deliveryLongitude: deliveryRequest.deliveryLocation.longitude,
        priority: deliveryRequest.priority,
        excludeDriverIds: assignmentData.excludeDriverIds,
        maxSearchRadius: assignmentData.searchRadius,
        method: assignmentData.method
      };

      // 최적의 배달기사 찾기
      const bestMatch = await this.deliveryMatchingService.findBestMatch(matchingRequest);
      
      if (!bestMatch) {
        this.logger.warn(`No suitable driver found for delivery request: ${assignmentData.deliveryRequestId}`);
        return null;
      }

      this.logger.log(`Found best match: ${bestMatch.driverName} (Score: ${bestMatch.matchingScore})`);

      // 배정 생성
      const assignment = await this.createAssignment(
        assignmentData.deliveryRequestId,
        bestMatch.driverId,
        assignmentData.method,
        assignmentData.responseTimeoutMinutes,
        `자동 배정 - ${bestMatch.reasoning}`
      );

      // 배달 요청 상태 업데이트
      await this.updateDeliveryRequest(assignmentData.deliveryRequestId, {
        status: DeliveryRequestStatus.ASSIGNED
      });

      // 배달기사에게 알림 발송
      await this.sendAssignmentNotification(assignment);

      return assignment;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to auto assign delivery: ${errorMessage}`);
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new BadRequestException('자동 배정에 실패했습니다.');
    }
  }

  /**
   * 브로드캐스트 배달 배정
   */
  async broadcastAssignDelivery(assignmentData: BroadcastAssignDeliveryDto): Promise<DeliveryAssignmentResponseDto[]> {
    try {
      this.logger.log(`Broadcast assignment: Request ${assignmentData.deliveryRequestId}`);

      // 배달 요청 정보 조회
      const deliveryRequest = await this.getDeliveryRequest(assignmentData.deliveryRequestId);
      if (deliveryRequest.status !== DeliveryRequestStatus.PENDING) {
        throw new BadRequestException('대기 중인 배달 요청만 배정할 수 있습니다.');
      }

      // 매칭 요청 생성
      const matchingRequest: MatchingRequest = {
        pickupLatitude: deliveryRequest.pickupLocation.latitude,
        pickupLongitude: deliveryRequest.pickupLocation.longitude,
        deliveryLatitude: deliveryRequest.deliveryLocation.latitude,
        deliveryLongitude: deliveryRequest.deliveryLocation.longitude,
        priority: deliveryRequest.priority,
        maxSearchRadius: assignmentData.searchRadius,
        method: AssignmentMethod.BROADCAST
      };

      // 후보 배달기사들 찾기
      const candidates = await this.deliveryMatchingService.findMultipleCandidates(
        matchingRequest,
        assignmentData.maxConcurrentAssignments
      );

      if (candidates.length === 0) {
        this.logger.warn(`No suitable candidates found for broadcast assignment: ${assignmentData.deliveryRequestId}`);
        return [];
      }

      this.logger.log(`Found ${candidates.length} candidates for broadcast assignment`);

      // 각 후보에게 배정 생성
      const assignments: DeliveryAssignmentResponseDto[] = [];
      
      for (const candidate of candidates) {
        try {
          const assignment = await this.createAssignment(
            assignmentData.deliveryRequestId,
            candidate.driverId,
            AssignmentMethod.BROADCAST,
            assignmentData.responseTimeoutMinutes,
            `브로드캐스트 배정 - ${candidate.reasoning}`
          );
          
          assignments.push(assignment);

          // 배달기사에게 알림 발송
          await this.sendAssignmentNotification(assignment);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          this.logger.warn(`Failed to create assignment for driver ${candidate.driverId}: ${errorMessage}`);
        }
      }

      // 배달 요청 상태 업데이트 (하나라도 배정이 성공했으면)
      if (assignments.length > 0) {
        await this.updateDeliveryRequest(assignmentData.deliveryRequestId, {
          status: DeliveryRequestStatus.ASSIGNED
        });
      }

      return assignments;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to broadcast assign delivery: ${errorMessage}`);
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new BadRequestException('브로드캐스트 배정에 실패했습니다.');
    }
  }

  /**
   * 배달기사 응답 처리
   */
  async handleDriverResponse(responseData: DriverResponseDto): Promise<DeliveryAssignmentResponseDto> {
    try {
      this.logger.log(`Processing driver response for assignment: ${responseData.assignmentId}`);

      // 배정 정보 조회
      const { data: assignment, error } = await this.supabase
        .from('delivery_assignments')
        .select('*')
        .eq('id', responseData.assignmentId)
        .single();

      if (error || !assignment) {
        throw new NotFoundException('배달 배정을 찾을 수 없습니다.');
      }

      if (assignment.status !== DeliveryAssignmentStatus.ASSIGNED) {
        throw new BadRequestException('응답 가능한 상태가 아닙니다.');
      }

      const now = new Date().toISOString();
      const responseTimeSeconds = Math.floor((new Date().getTime() - new Date(assignment.assigned_at).getTime()) / 1000);

      // 응답 히스토리 저장
      await this.saveDriverResponseHistory(
        responseData.assignmentId,
        assignment.driver_id,
        responseData.response,
        responseData.message,
        responseTimeSeconds
      );

      let newStatus: DeliveryAssignmentStatus;
      let deliveryRequestStatus: DeliveryRequestStatus | undefined;

      if (responseData.response === DriverResponseType.ACCEPT) {
        newStatus = DeliveryAssignmentStatus.ACCEPTED;
        deliveryRequestStatus = DeliveryRequestStatus.ACCEPTED;

        // 다른 대기 중인 배정들 취소 (브로드캐스트의 경우)
        await this.cancelOtherAssignments(assignment.delivery_request_id, responseData.assignmentId);
      } else {
        newStatus = DeliveryAssignmentStatus.REJECTED;
        // 배달 요청 상태는 다른 배정이 있는지 확인 후 결정
      }

      // 배정 상태 업데이트
      const { data: updatedAssignment, error: updateError } = await this.supabase
        .from('delivery_assignments')
        .update({
          status: newStatus,
          response_message: responseData.message,
          estimated_pickup_time_minutes: responseData.estimatedPickupTimeMinutes,
          responded_at: now,
          updated_at: now
        })
        .eq('id', responseData.assignmentId)
        .select()
        .single();

      if (updateError) throw updateError;

      // 배달 요청 상태 업데이트
      if (deliveryRequestStatus) {
        await this.updateDeliveryRequestStatus(assignment.delivery_request_id, deliveryRequestStatus, assignment.driver_id);
      }

      // 응답 결과 알림 발송
      await this.sendResponseNotification(updatedAssignment, responseData.response);

      this.logger.log(`Driver response processed successfully: ${responseData.response}`);
      return this.mapAssignmentToResponseDto(updatedAssignment);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to handle driver response: ${errorMessage}`);
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new BadRequestException('배달기사 응답 처리에 실패했습니다.');
    }
  }

  /**
   * 배정 취소
   */
  async cancelAssignment(cancelData: CancelAssignmentDto): Promise<DeliveryAssignmentResponseDto> {
    try {
      this.logger.log(`Cancelling assignment: ${cancelData.assignmentId}`);

      const { data: assignment, error } = await this.supabase
        .from('delivery_assignments')
        .update({
          status: DeliveryAssignmentStatus.CANCELLED,
          response_message: cancelData.reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', cancelData.assignmentId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundException('배달 배정을 찾을 수 없습니다.');
        }
        throw error;
      }

      // 재배정이 필요한 경우 배달 요청 상태를 PENDING으로 되돌림
      if (cancelData.shouldReassign) {
        await this.updateDeliveryRequestStatus(assignment.delivery_request_id, DeliveryRequestStatus.PENDING);
      }

      // 취소 알림 발송
      await this.sendCancellationNotification(assignment);

      return this.mapAssignmentToResponseDto(assignment);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to cancel assignment: ${errorMessage}`);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('배정 취소에 실패했습니다.');
    }
  }

  /**
   * 배정 생성 (내부 메서드)
   */
  private async createAssignment(
    deliveryRequestId: string,
    driverId: string,
    method: AssignmentMethod,
    timeoutMinutes: number = 5,
    note?: string
  ): Promise<DeliveryAssignmentResponseDto> {
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000).toISOString();

    const { data, error } = await this.supabase
      .from('delivery_assignments')
      .insert({
        delivery_request_id: deliveryRequestId,
        driver_id: driverId,
        status: DeliveryAssignmentStatus.ASSIGNED,
        method,
        assignment_note: note,
        attempt_number: 1,
        assigned_at: now,
        expires_at: expiresAt,
        created_at: now,
        updated_at: now
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapAssignmentToResponseDto(data);
  }

  /**
   * 다른 배정들 취소 (브로드캐스트 수락 시)
   */
  private async cancelOtherAssignments(deliveryRequestId: string, acceptedAssignmentId: string): Promise<void> {
    await this.supabase
      .from('delivery_assignments')
      .update({
        status: DeliveryAssignmentStatus.CANCELLED,
        response_message: '다른 배달기사가 수락함',
        updated_at: new Date().toISOString()
      })
      .eq('delivery_request_id', deliveryRequestId)
      .neq('id', acceptedAssignmentId)
      .in('status', [DeliveryAssignmentStatus.ASSIGNED]);
  }

  /**
   * 배달 요청 상태 업데이트 (내부 메서드)
   */
  private async updateDeliveryRequestStatus(
    deliveryRequestId: string, 
    status: DeliveryRequestStatus,
    assignedDriverId?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (assignedDriverId) {
      updateData.assigned_driver_id = assignedDriverId;
      updateData.assigned_at = new Date().toISOString();
    }

    await this.supabase
      .from('delivery_requests')
      .update(updateData)
      .eq('id', deliveryRequestId);
  }

  /**
   * 배달기사 응답 히스토리 저장
   */
  private async saveDriverResponseHistory(
    assignmentId: string,
    driverId: string,
    responseType: DriverResponseType,
    message: string | undefined,
    responseTimeSeconds: number
  ): Promise<void> {
    try {
      await this.supabase
        .from('driver_response_history')
        .insert({
          assignment_id: assignmentId,
          driver_id: driverId,
          response_type: responseType,
          message,
          response_time_seconds: responseTimeSeconds,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      // 히스토리 저장 실패는 주요 기능에 영향을 주지 않도록 로그만 남김
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.warn(`Failed to save driver response history: ${errorMessage}`);
    }
  }

  /**
   * 알림 발송 메서드들
   */
  private async sendAssignmentNotification(assignment: DeliveryAssignmentResponseDto): Promise<void> {
    try {
      // 실시간 배달 배정 알림 발송
      await this.realtimeNotificationService.sendDeliveryAssignment({
        orderId: assignment.deliveryRequestId,
        driverId: assignment.driverId,
        assignmentId: assignment.id,
        assignmentMethod: assignment.method,
        responseTimeoutMinutes: 5, // 기본값
        specialInstructions: assignment.assignmentNote,
        metadata: {
          assignedAt: assignment.assignedAt,
          expiresAt: assignment.expiresAt
        }
      });
      
      this.logger.log(`Real-time assignment notification sent to driver ${assignment.driverId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.warn(`Failed to send assignment notification: ${errorMessage}`);
    }
  }

  private async sendStatusChangeNotification(deliveryRequest: DeliveryRequestEntity): Promise<void> {
    try {
      // 상태 변경 전 기록을 위해 이전 상태를 가져와야 하지만, 
      // 현재는 간단히 기본값 사용
      const previousStatus = 'pending'; // 실제로는 이전 상태를 추적해야 함
      
      // 실시간 주문 상태 업데이트 알림 발송
      await this.realtimeNotificationService.sendOrderStatusUpdate({
        orderId: deliveryRequest.order_id,
        status: deliveryRequest.status,
        previousStatus,
        message: `배달 상태가 ${deliveryRequest.status}로 변경되었습니다.`,
        userId: deliveryRequest.assigned_driver_id,
        metadata: {
          deliveryRequestId: deliveryRequest.id,
          updatedAt: deliveryRequest.updated_at
        }
      });
      
      this.logger.log(`Real-time status change notification sent for order ${deliveryRequest.order_id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.warn(`Failed to send status change notification: ${errorMessage}`);
    }
  }

  private async sendResponseNotification(assignment: DeliveryAssignmentEntity, response: DriverResponseType): Promise<void> {
    try {
      const isAccepted = response === DriverResponseType.ACCEPT;
      const title = isAccepted ? '배달 요청 수락' : '배달 요청 거부';
      const message = isAccepted 
        ? '배달기사가 요청을 수락했습니다.' 
        : '배달기사가 요청을 거부했습니다.';

      // 관리자들에게 알림 발송
      await this.realtimeNotificationService.sendSystemAlert({
        alertType: 'DRIVER_RESPONSE',
        message,
        severity: isAccepted ? NotificationPriority.MEDIUM : NotificationPriority.HIGH,
        targetUserTypes: [UserType.ADMIN],
        metadata: {
          assignmentId: assignment.id,
          driverId: assignment.driver_id,
          response,
          respondedAt: assignment.responded_at
        }
      });
      
      this.logger.log(`Real-time response notification sent for driver response: ${response}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.warn(`Failed to send response notification: ${errorMessage}`);
    }
  }

  private async sendCancellationNotification(assignment: DeliveryAssignmentEntity): Promise<void> {
    try {
      // 배달기사에게 취소 알림 발송
      await this.realtimeNotificationService.sendNotification({
        title: '배달 배정 취소',
        message: '배달 배정이 취소되었습니다.',
        priority: NotificationPriority.MEDIUM,
        targets: [{
          userId: assignment.driver_id,
          userType: UserType.DRIVER
        }],
        category: 'assignment_cancelled',
        metadata: {
          assignmentId: assignment.id,
          reason: assignment.response_message,
          cancelledAt: assignment.updated_at
        }
      });
      
      this.logger.log(`Real-time cancellation notification sent to driver ${assignment.driver_id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.warn(`Failed to send cancellation notification: ${errorMessage}`);
    }
  }

  /**
   * 매핑 메서드들
   */
  private mapToResponseDto(entity: DeliveryRequestEntity): DeliveryRequestResponseDto {
    return {
      id: entity.id,
      orderId: entity.order_id,
      pickupLocation: entity.pickup_location,
      deliveryLocation: entity.delivery_location,
      status: entity.status,
      priority: entity.priority,
      assignedDriverId: entity.assigned_driver_id,
      estimatedDistance: entity.estimated_distance,
      estimatedDuration: entity.estimated_duration,
      specialInstructions: entity.special_instructions,
      customerPhone: entity.customer_phone,
      customerName: entity.customer_name,
      cancellationReason: entity.cancellation_reason,
      createdAt: new Date(entity.created_at),
      updatedAt: new Date(entity.updated_at),
      assignedAt: entity.assigned_at ? new Date(entity.assigned_at) : undefined,
      completedAt: entity.completed_at ? new Date(entity.completed_at) : undefined
    };
  }

  private mapAssignmentToResponseDto(entity: DeliveryAssignmentEntity): DeliveryAssignmentResponseDto {
    return {
      id: entity.id,
      deliveryRequestId: entity.delivery_request_id,
      driverId: entity.driver_id,
      status: entity.status,
      method: entity.method,
      assignmentNote: entity.assignment_note,
      responseMessage: entity.response_message,
      assignedAt: new Date(entity.assigned_at),
      respondedAt: entity.responded_at ? new Date(entity.responded_at) : undefined,
      expiresAt: entity.expires_at ? new Date(entity.expires_at) : undefined,
      createdAt: new Date(entity.created_at),
      updatedAt: new Date(entity.updated_at),
      estimatedPickupTimeMinutes: entity.estimated_pickup_time_minutes,
      attemptNumber: entity.attempt_number
    };
  }
} 