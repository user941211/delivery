/**
 * 배달 배정 컨트롤러
 * 
 * 배달 요청 생성부터 배정, 응답 처리까지 모든 배달 관련 API를 제공합니다.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Logger,
  HttpStatus,
  ParseUUIDPipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';

import { DeliveryRequestService, PaginatedResult } from '../services/delivery-request.service';
import { DriverLocationService } from '../services/driver-location.service';

import {
  CreateDeliveryRequestDto,
  UpdateDeliveryRequestDto,
  GetDeliveryRequestsQueryDto,
  DeliveryRequestResponseDto
} from '../dto/delivery-request.dto';

import {
  ManualAssignDeliveryDto,
  AutoAssignDeliveryDto,
  BroadcastAssignDeliveryDto,
  DriverResponseDto,
  CancelAssignmentDto,
  DeliveryAssignmentResponseDto
} from '../dto/delivery-assignment.dto';

import {
  UpdateDriverLocationDto,
  UpdateDriverStatusDto,
  FindNearbyDriversQueryDto,
  DriverLocationResponseDto,
  NearbyDriverDto,
  DriverActivityStatsDto
} from '../dto/driver-location.dto';

/**
 * 배달 배정 컨트롤러 클래스
 */
@ApiTags('배달 배정')
@Controller('delivery')
export class DeliveryAssignmentController {
  private readonly logger = new Logger(DeliveryAssignmentController.name);

  constructor(
    private readonly deliveryRequestService: DeliveryRequestService,
    private readonly driverLocationService: DriverLocationService
  ) {}

  // ===================== 배달 요청 관리 =====================

  /**
   * 배달 요청 생성
   */
  @Post('requests')
  @ApiOperation({ 
    summary: '배달 요청 생성', 
    description: '새로운 배달 요청을 생성합니다.' 
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: '배달 요청이 성공적으로 생성되었습니다.',
    type: DeliveryRequestResponseDto 
  })
  async createDeliveryRequest(
    @Body() createDto: CreateDeliveryRequestDto
  ): Promise<DeliveryRequestResponseDto> {
    this.logger.log(`Creating delivery request for order: ${createDto.orderId}`);
    return this.deliveryRequestService.createDeliveryRequest(createDto);
  }

  /**
   * 배달 요청 조회 (단일)
   */
  @Get('requests/:requestId')
  @ApiOperation({ 
    summary: '배달 요청 조회', 
    description: '특정 배달 요청의 상세 정보를 조회합니다.' 
  })
  @ApiParam({ name: 'requestId', description: '배달 요청 ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: '배달 요청 정보가 성공적으로 조회되었습니다.',
    type: DeliveryRequestResponseDto 
  })
  async getDeliveryRequest(
    @Param('requestId', ParseUUIDPipe) requestId: string
  ): Promise<DeliveryRequestResponseDto> {
    this.logger.log(`Getting delivery request: ${requestId}`);
    return this.deliveryRequestService.getDeliveryRequest(requestId);
  }

  /**
   * 배달 요청 목록 조회
   */
  @Get('requests')
  @ApiOperation({ 
    summary: '배달 요청 목록 조회', 
    description: '배달 요청 목록을 페이지네이션과 필터를 적용하여 조회합니다.' 
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: '배달 요청 목록이 성공적으로 조회되었습니다.' 
  })
  async getDeliveryRequests(
    @Query() query: GetDeliveryRequestsQueryDto
  ): Promise<PaginatedResult<DeliveryRequestResponseDto>> {
    this.logger.log('Getting delivery requests list');
    return this.deliveryRequestService.getDeliveryRequests(query);
  }

  /**
   * 배달 요청 업데이트
   */
  @Put('requests/:requestId')
  @ApiOperation({ 
    summary: '배달 요청 업데이트', 
    description: '배달 요청의 상태나 정보를 업데이트합니다.' 
  })
  @ApiParam({ name: 'requestId', description: '배달 요청 ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: '배달 요청이 성공적으로 업데이트되었습니다.',
    type: DeliveryRequestResponseDto 
  })
  async updateDeliveryRequest(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() updateDto: UpdateDeliveryRequestDto
  ): Promise<DeliveryRequestResponseDto> {
    this.logger.log(`Updating delivery request: ${requestId}`);
    return this.deliveryRequestService.updateDeliveryRequest(requestId, updateDto);
  }

  // ===================== 배달 배정 관리 =====================

  /**
   * 수동 배달 배정
   */
  @Post('assignments/manual')
  @ApiOperation({ 
    summary: '수동 배달 배정', 
    description: '관리자가 특정 배달기사에게 직접 배달을 배정합니다.' 
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: '배달이 성공적으로 배정되었습니다.',
    type: DeliveryAssignmentResponseDto 
  })
  async manualAssignDelivery(
    @Body() assignmentDto: ManualAssignDeliveryDto
  ): Promise<DeliveryAssignmentResponseDto> {
    this.logger.log(`Manual assignment requested`);
    return this.deliveryRequestService.manualAssignDelivery(assignmentDto);
  }

  /**
   * 자동 배달 배정
   */
  @Post('assignments/auto')
  @ApiOperation({ 
    summary: '자동 배달 배정', 
    description: '시스템이 자동으로 최적의 배달기사에게 배달을 배정합니다.' 
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: '배달이 성공적으로 배정되었습니다.',
    type: DeliveryAssignmentResponseDto 
  })
  async autoAssignDelivery(
    @Body() assignmentDto: AutoAssignDeliveryDto
  ): Promise<DeliveryAssignmentResponseDto | null> {
    this.logger.log(`Auto assignment requested`);
    return this.deliveryRequestService.autoAssignDelivery(assignmentDto);
  }

  /**
   * 브로드캐스트 배달 배정
   */
  @Post('assignments/broadcast')
  @ApiOperation({ 
    summary: '브로드캐스트 배달 배정', 
    description: '여러 배달기사에게 동시에 배달 요청을 브로드캐스트합니다.' 
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: '브로드캐스트 배정이 성공적으로 생성되었습니다.',
    type: [DeliveryAssignmentResponseDto] 
  })
  async broadcastAssignDelivery(
    @Body() assignmentDto: BroadcastAssignDeliveryDto
  ): Promise<DeliveryAssignmentResponseDto[]> {
    this.logger.log(`Broadcast assignment requested`);
    return this.deliveryRequestService.broadcastAssignDelivery(assignmentDto);
  }

  /**
   * 배달기사 응답 처리
   */
  @Post('assignments/response')
  @ApiOperation({ 
    summary: '배달기사 응답', 
    description: '배달기사가 배정된 배달에 대해 수락/거부 응답을 처리합니다.' 
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: '응답이 성공적으로 처리되었습니다.',
    type: DeliveryAssignmentResponseDto 
  })
  async handleDriverResponse(
    @Body() responseDto: DriverResponseDto
  ): Promise<DeliveryAssignmentResponseDto> {
    this.logger.log(`Driver response received`);
    return this.deliveryRequestService.handleDriverResponse(responseDto);
  }

  /**
   * 배정 취소
   */
  @Delete('assignments/:assignmentId')
  @ApiOperation({ 
    summary: '배정 취소', 
    description: '배달 배정을 취소합니다.' 
  })
  @ApiParam({ name: 'assignmentId', description: '배정 ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: '배정이 성공적으로 취소되었습니다.',
    type: DeliveryAssignmentResponseDto 
  })
  async cancelAssignment(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() cancelDto: CancelAssignmentDto
  ): Promise<DeliveryAssignmentResponseDto> {
    this.logger.log(`Cancelling assignment: ${assignmentId}`);
    return this.deliveryRequestService.cancelAssignment({
      ...cancelDto,
      assignmentId
    });
  }

  // ===================== 배달기사 위치 관리 =====================

  /**
   * 배달기사 위치 업데이트
   */
  @Put('drivers/:driverId/location')
  @ApiOperation({ 
    summary: '배달기사 위치 업데이트', 
    description: '배달기사의 현재 위치와 상태를 업데이트합니다.' 
  })
  @ApiParam({ name: 'driverId', description: '배달기사 ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: '위치가 성공적으로 업데이트되었습니다.',
    type: DriverLocationResponseDto 
  })
  async updateDriverLocation(
    @Param('driverId', ParseUUIDPipe) driverId: string,
    @Body() locationDto: UpdateDriverLocationDto
  ): Promise<DriverLocationResponseDto> {
    this.logger.log(`Updating location for driver: ${driverId}`);
    return this.driverLocationService.updateDriverLocation(driverId, locationDto);
  }

  /**
   * 배달기사 상태 업데이트
   */
  @Put('drivers/:driverId/status')
  @ApiOperation({ 
    summary: '배달기사 상태 업데이트', 
    description: '배달기사의 활성 상태만 업데이트합니다.' 
  })
  @ApiParam({ name: 'driverId', description: '배달기사 ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: '상태가 성공적으로 업데이트되었습니다.',
    type: DriverLocationResponseDto 
  })
  async updateDriverStatus(
    @Param('driverId', ParseUUIDPipe) driverId: string,
    @Body() statusDto: UpdateDriverStatusDto
  ): Promise<DriverLocationResponseDto> {
    this.logger.log(`Updating status for driver: ${driverId} to ${statusDto.status}`);
    return this.driverLocationService.updateDriverStatus(driverId, statusDto);
  }

  /**
   * 배달기사 위치 조회
   */
  @Get('drivers/:driverId/location')
  @ApiOperation({ 
    summary: '배달기사 위치 조회', 
    description: '특정 배달기사의 현재 위치 정보를 조회합니다.' 
  })
  @ApiParam({ name: 'driverId', description: '배달기사 ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: '위치 정보가 성공적으로 조회되었습니다.',
    type: DriverLocationResponseDto 
  })
  async getDriverLocation(
    @Param('driverId', ParseUUIDPipe) driverId: string
  ): Promise<DriverLocationResponseDto> {
    this.logger.log(`Getting location for driver: ${driverId}`);
    return this.driverLocationService.getDriverLocation(driverId);
  }

  /**
   * 주변 배달기사 검색
   */
  @Get('drivers/nearby')
  @ApiOperation({ 
    summary: '주변 배달기사 검색', 
    description: '특정 위치 주변의 활성 배달기사들을 검색합니다.' 
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: '주변 배달기사 목록이 성공적으로 조회되었습니다.',
    type: [NearbyDriverDto] 
  })
  async findNearbyDrivers(
    @Query() query: FindNearbyDriversQueryDto
  ): Promise<NearbyDriverDto[]> {
    this.logger.log(`Finding nearby drivers near (${query.latitude}, ${query.longitude})`);
    return this.driverLocationService.findNearbyDrivers(query);
  }

  /**
   * 배달기사 활동 통계 조회
   */
  @Get('drivers/:driverId/stats')
  @ApiOperation({ 
    summary: '배달기사 활동 통계', 
    description: '배달기사의 활동 통계를 조회합니다.' 
  })
  @ApiParam({ name: 'driverId', description: '배달기사 ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: '활동 통계가 성공적으로 조회되었습니다.',
    type: DriverActivityStatsDto 
  })
  async getDriverActivityStats(
    @Param('driverId', ParseUUIDPipe) driverId: string
  ): Promise<DriverActivityStatsDto> {
    this.logger.log(`Getting activity stats for driver: ${driverId}`);
    return this.driverLocationService.getDriverActivityStats(driverId);
  }
} 