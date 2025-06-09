/**
 * GPS 추적 서비스
 * 
 * 고급 GPS 위치 수집, 추적 세션 관리, 지오펜싱 기능을 제공합니다.
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RealtimeNotificationService } from '../../realtime/services/realtime-notification.service';

import {
  AdvancedGpsUpdateDto,
  BatchGpsUpdateDto,
  StartTrackingSessionDto,
  GeofenceDto,
  GeofenceEventDto,
  TrackingSessionResponseDto,
  GpsTrackingStatsDto,
  GpsAccuracyLevel,
  TrackingSessionStatus,
  GeofenceEventType,
  GpsCoordinateDto
} from '../dto/gps-tracking.dto';

import {
  GpsTrackingEntity,
  TrackingSessionEntity,
  GeofenceEntity,
  GeofenceEventEntity,
  GpsTrackingStatsEntity,
  DriverCurrentLocationEntity
} from '../entities/gps-tracking.entity';

/**
 * 매칭된 지오펜스 인터페이스
 */
interface MatchedGeofence {
  geofence: GeofenceEntity;
  distance: number;
  isInside: boolean;
}

/**
 * 추적 세션 정보 인터페이스
 */
interface SessionInfo {
  sessionId: string;
  isNewSession: boolean;
  previousLocation?: GpsTrackingEntity;
}

/**
 * GPS 추적 서비스 클래스
 */
@Injectable()
export class GpsTrackingService {
  private readonly logger = new Logger(GpsTrackingService.name);
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly realtimeNotificationService: RealtimeNotificationService
  ) {
    // Supabase 클라이언트 초기화
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')
    );
  }

  /**
   * 고급 GPS 위치 업데이트
   */
  async updateAdvancedGpsLocation(updateData: AdvancedGpsUpdateDto): Promise<GpsTrackingEntity> {
    try {
      this.logger.log(`Updating advanced GPS location for driver: ${updateData.driverId}`);

      // 위치 데이터 유효성 검증
      this.validateLocationData(updateData);

      // 정확도 레벨 자동 계산
      const accuracyLevel = this.calculateAccuracyLevel(updateData.accuracy);

      // 세션 정보 처리
      const sessionInfo = await this.handleTrackingSession(updateData);

      // GPS 추적 데이터 저장
      const { data: trackingData, error } = await this.supabase
        .from('gps_tracking')
        .insert({
          driver_id: updateData.driverId,
          order_id: updateData.orderId,
          session_id: sessionInfo.sessionId,
          latitude: updateData.latitude,
          longitude: updateData.longitude,
          altitude: updateData.altitude,
          accuracy: updateData.accuracy,
          accuracy_level: accuracyLevel,
          speed: updateData.speed,
          bearing: updateData.bearing,
          battery_level: updateData.batteryLevel,
          signal_strength: updateData.signalStrength,
          is_indoor: updateData.isIndoor,
          timestamp: updateData.timestamp || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // 현재 위치 업데이트
      await this.updateCurrentLocation(updateData, sessionInfo.sessionId, accuracyLevel);

      // 지오펜스 확인
      await this.checkGeofences(updateData, sessionInfo.sessionId);

      // 세션 통계 업데이트
      if (sessionInfo.previousLocation) {
        await this.updateSessionStats(sessionInfo.sessionId, trackingData, sessionInfo.previousLocation);
      }

      // 실시간 위치 업데이트 알림
      if (updateData.orderId) {
        await this.sendLocationUpdateNotification(updateData, trackingData);
      }

      this.logger.log(`GPS location updated successfully for driver: ${updateData.driverId}`);
      return trackingData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to update GPS location: ${errorMessage}`);
      throw new BadRequestException('GPS 위치 업데이트에 실패했습니다.');
    }
  }

  /**
   * 배치 GPS 위치 업데이트
   */
  async updateBatchGpsLocations(batchData: BatchGpsUpdateDto): Promise<GpsTrackingEntity[]> {
    try {
      this.logger.log(`Processing batch GPS update for driver: ${batchData.driverId}, count: ${batchData.locations.length}`);

      const results: GpsTrackingEntity[] = [];

      // 타임스탬프 순으로 정렬
      const sortedLocations = batchData.locations.sort((a, b) => 
        new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
      );

      // 순차적으로 처리 (병렬 처리 시 세션 관리 복잡성 증가)
      for (const location of sortedLocations) {
        const updateData: AdvancedGpsUpdateDto = {
          ...location,
          driverId: batchData.driverId
        };

        const result = await this.updateAdvancedGpsLocation(updateData);
        results.push(result);
      }

      this.logger.log(`Batch GPS update completed for driver: ${batchData.driverId}`);
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to process batch GPS update: ${errorMessage}`);
      throw new BadRequestException('배치 GPS 위치 업데이트에 실패했습니다.');
    }
  }

  /**
   * 추적 세션 시작
   */
  async startTrackingSession(sessionData: StartTrackingSessionDto): Promise<TrackingSessionResponseDto> {
    try {
      this.logger.log(`Starting tracking session for driver: ${sessionData.driverId}`);

      // 기존 활성 세션 종료
      await this.endActiveSessionsForDriver(sessionData.driverId);

      // 새 세션 생성
      const { data: session, error } = await this.supabase
        .from('tracking_sessions')
        .insert({
          driver_id: sessionData.driverId,
          order_id: sessionData.orderId,
          status: TrackingSessionStatus.ACTIVE,
          start_time: new Date().toISOString(),
          start_latitude: sessionData.startLocation.latitude,
          start_longitude: sessionData.startLocation.longitude,
          start_accuracy: sessionData.startLocation.accuracy,
          estimated_end_time: sessionData.estimatedEndTime,
          total_distance: 0,
          total_duration: 0,
          average_speed: 0,
          max_speed: 0,
          location_updates_count: 0
        })
        .select()
        .single();

      if (error) throw error;

      this.logger.log(`Tracking session started: ${session.id}`);
      return this.mapToSessionResponse(session);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to start tracking session: ${errorMessage}`);
      throw new BadRequestException('추적 세션 시작에 실패했습니다.');
    }
  }

  /**
   * 추적 세션 종료
   */
  async endTrackingSession(sessionId: string, endLocation?: GpsCoordinateDto): Promise<TrackingSessionResponseDto> {
    try {
      this.logger.log(`Ending tracking session: ${sessionId}`);

      const { data: session, error } = await this.supabase
        .from('tracking_sessions')
        .update({
          status: TrackingSessionStatus.COMPLETED,
          end_time: new Date().toISOString(),
          end_latitude: endLocation?.latitude,
          end_longitude: endLocation?.longitude,
          end_accuracy: endLocation?.accuracy,
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      // 통계 계산 및 저장
      await this.calculateAndSaveSessionStats(sessionId);

      this.logger.log(`Tracking session ended: ${sessionId}`);
      return this.mapToSessionResponse(session);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to end tracking session: ${errorMessage}`);
      throw new BadRequestException('추적 세션 종료에 실패했습니다.');
    }
  }

  /**
   * 지오펜스 생성
   */
  async createGeofence(geofenceData: GeofenceDto, createdBy: string): Promise<GeofenceEntity> {
    try {
      this.logger.log(`Creating geofence: ${geofenceData.name}`);

      const { data: geofence, error } = await this.supabase
        .from('geofences')
        .insert({
          id: geofenceData.id,
          name: geofenceData.name,
          center_latitude: geofenceData.center.latitude,
          center_longitude: geofenceData.center.longitude,
          radius: geofenceData.radius,
          is_active: geofenceData.isActive ?? true,
          created_by: createdBy
        })
        .select()
        .single();

      if (error) throw error;

      this.logger.log(`Geofence created: ${geofence.id}`);
      return geofence;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to create geofence: ${errorMessage}`);
      throw new BadRequestException('지오펜스 생성에 실패했습니다.');
    }
  }

  /**
   * GPS 추적 통계 조회
   */
  async getTrackingStats(driverId: string, startDate: Date, endDate: Date): Promise<GpsTrackingStatsDto> {
    try {
      this.logger.log(`Getting tracking stats for driver: ${driverId}`);

      // 기간 내 추적 데이터 조회
      const { data: trackingData, error } = await this.supabase
        .from('gps_tracking')
        .select('*')
        .eq('driver_id', driverId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp');

      if (error) throw error;

      // 통계 계산
      const stats = this.calculateTrackingStatistics(trackingData, driverId, startDate, endDate);

      return stats;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get tracking stats: ${errorMessage}`);
      throw new BadRequestException('추적 통계 조회에 실패했습니다.');
    }
  }

  /**
   * 위치 데이터 유효성 검증
   */
  private validateLocationData(locationData: AdvancedGpsUpdateDto): void {
    if (locationData.latitude < -90 || locationData.latitude > 90) {
      throw new BadRequestException('잘못된 위도 값입니다.');
    }

    if (locationData.longitude < -180 || locationData.longitude > 180) {
      throw new BadRequestException('잘못된 경도 값입니다.');
    }

    if (locationData.accuracy && locationData.accuracy < 0) {
      throw new BadRequestException('정확도는 양수여야 합니다.');
    }

    if (locationData.speed && locationData.speed < 0) {
      throw new BadRequestException('속도는 양수여야 합니다.');
    }
  }

  /**
   * 정확도 레벨 계산
   */
  private calculateAccuracyLevel(accuracy?: number): GpsAccuracyLevel {
    if (!accuracy) return GpsAccuracyLevel.UNKNOWN;
    
    if (accuracy < 5) return GpsAccuracyLevel.HIGH;
    if (accuracy <= 20) return GpsAccuracyLevel.MEDIUM;
    return GpsAccuracyLevel.LOW;
  }

  /**
   * 추적 세션 처리
   */
  private async handleTrackingSession(updateData: AdvancedGpsUpdateDto): Promise<SessionInfo> {
    // 현재 활성 세션 조회
    const { data: activeSession } = await this.supabase
      .from('tracking_sessions')
      .select('*')
      .eq('driver_id', updateData.driverId)
      .eq('status', TrackingSessionStatus.ACTIVE)
      .single();

    let sessionId: string;
    let isNewSession = false;

    if (!activeSession) {
      // 새 세션 자동 생성
      const sessionData: StartTrackingSessionDto = {
        driverId: updateData.driverId,
        orderId: updateData.orderId,
        startLocation: {
          latitude: updateData.latitude,
          longitude: updateData.longitude,
          accuracy: updateData.accuracy
        }
      };

      const newSession = await this.startTrackingSession(sessionData);
      sessionId = newSession.sessionId;
      isNewSession = true;
    } else {
      sessionId = activeSession.id;
    }

    // 이전 위치 조회
    const { data: previousLocation } = await this.supabase
      .from('gps_tracking')
      .select('*')
      .eq('driver_id', updateData.driverId)
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    return {
      sessionId,
      isNewSession,
      previousLocation
    };
  }

  /**
   * 현재 위치 업데이트
   */
  private async updateCurrentLocation(
    updateData: AdvancedGpsUpdateDto, 
    sessionId: string, 
    accuracyLevel: GpsAccuracyLevel
  ): Promise<void> {
    await this.supabase
      .from('driver_current_locations')
      .upsert({
        driver_id: updateData.driverId,
        latitude: updateData.latitude,
        longitude: updateData.longitude,
        altitude: updateData.altitude,
        accuracy: updateData.accuracy,
        accuracy_level: accuracyLevel,
        speed: updateData.speed,
        bearing: updateData.bearing,
        battery_level: updateData.batteryLevel,
        signal_strength: updateData.signalStrength,
        is_indoor: updateData.isIndoor,
        last_session_id: sessionId,
        last_order_id: updateData.orderId,
        last_updated: new Date().toISOString(),
        is_tracking_active: true,
      });
  }

  /**
   * 지오펜스 확인
   */
  private async checkGeofences(updateData: AdvancedGpsUpdateDto, sessionId: string): Promise<void> {
    // 활성 지오펜스 조회
    const { data: geofences } = await this.supabase
      .from('geofences')
      .select('*')
      .eq('is_active', true);

    if (!geofences) return;

    // 각 지오펜스에 대해 진입/이탈 확인
    for (const geofence of geofences) {
      const distance = this.calculateDistance(
        updateData.latitude,
        updateData.longitude,
        geofence.center_latitude,
        geofence.center_longitude
      );

      const isInside = distance <= geofence.radius;

      // 이전 상태 확인 (마지막 지오펜스 이벤트)
      const { data: lastEvent } = await this.supabase
        .from('geofence_events')
        .select('event_type')
        .eq('geofence_id', geofence.id)
        .eq('driver_id', updateData.driverId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      const wasInside = lastEvent?.event_type === GeofenceEventType.ENTER;

      // 상태 변화 감지 및 이벤트 생성
      if (isInside && !wasInside) {
        await this.createGeofenceEvent(geofence.id, updateData, GeofenceEventType.ENTER, sessionId);
      } else if (!isInside && wasInside) {
        await this.createGeofenceEvent(geofence.id, updateData, GeofenceEventType.EXIT, sessionId);
      }
    }
  }

  /**
   * 지오펜스 이벤트 생성
   */
  private async createGeofenceEvent(
    geofenceId: string,
    updateData: AdvancedGpsUpdateDto,
    eventType: GeofenceEventType,
    sessionId: string
  ): Promise<void> {
    await this.supabase
      .from('geofence_events')
      .insert({
        geofence_id: geofenceId,
        driver_id: updateData.driverId,
        event_type: eventType,
        latitude: updateData.latitude,
        longitude: updateData.longitude,
        accuracy: updateData.accuracy,
        timestamp: new Date().toISOString(),
        session_id: sessionId,
        order_id: updateData.orderId
      });

    this.logger.log(`Geofence event created: ${eventType} for driver ${updateData.driverId}`);
  }

  /**
   * 세션 통계 업데이트
   */
  private async updateSessionStats(
    sessionId: string,
    currentLocation: GpsTrackingEntity,
    previousLocation: GpsTrackingEntity
  ): Promise<void> {
    // 거리 계산
    const distance = this.calculateDistance(
      previousLocation.latitude,
      previousLocation.longitude,
      currentLocation.latitude,
      currentLocation.longitude
    ) * 1000; // km to meters

    // 시간 차이 계산
    const timeDiff = new Date(currentLocation.timestamp).getTime() - new Date(previousLocation.timestamp).getTime();
    const timeDiffSeconds = timeDiff / 1000;

    // 속도 계산 (m/s)
    const speed = timeDiffSeconds > 0 ? distance / timeDiffSeconds : 0;
    const speedKmh = speed * 3.6; // m/s to km/h

    // 세션 업데이트
    const { data: session } = await this.supabase
      .from('tracking_sessions')
      .select('total_distance, max_speed, location_updates_count')
      .eq('id', sessionId)
      .single();

    if (session) {
      await this.supabase
        .from('tracking_sessions')
        .update({
          total_distance: session.total_distance + distance,
          max_speed: Math.max(session.max_speed, speedKmh),
          location_updates_count: session.location_updates_count + 1
        })
        .eq('id', sessionId);
    }
  }

  /**
   * Haversine 공식을 사용한 거리 계산 (킬로미터)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // 지구 반지름 (킬로미터)
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * 도를 라디안으로 변환
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * 실시간 위치 업데이트 알림 발송
   */
  private async sendLocationUpdateNotification(
    updateData: AdvancedGpsUpdateDto,
    trackingData: GpsTrackingEntity
  ): Promise<void> {
    try {
      await this.realtimeNotificationService.sendDriverLocationUpdate({
        orderId: updateData.orderId!,
        driverId: updateData.driverId,
        driverName: 'Driver', // 실제로는 사용자 정보 조회 필요
        location: {
          latitude: updateData.latitude,
          longitude: updateData.longitude,
          accuracy: updateData.accuracy
        },
        status: 'active',
        speed: updateData.speed,
        bearing: updateData.bearing,
        metadata: {
          accuracyLevel: this.calculateAccuracyLevel(updateData.accuracy),
          batteryLevel: updateData.batteryLevel,
          signalStrength: updateData.signalStrength,
          timestamp: trackingData.timestamp
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.warn(`Failed to send location update notification: ${errorMessage}`);
    }
  }

  /**
   * 배달기사의 활성 세션들 종료
   */
  private async endActiveSessionsForDriver(driverId: string): Promise<void> {
    await this.supabase
      .from('tracking_sessions')
      .update({ 
        status: TrackingSessionStatus.COMPLETED,
        end_time: new Date().toISOString()
      })
      .eq('driver_id', driverId)
      .eq('status', TrackingSessionStatus.ACTIVE);
  }

  /**
   * 세션 엔티티를 응답 DTO로 매핑
   */
  private mapToSessionResponse(session: TrackingSessionEntity): TrackingSessionResponseDto {
    const startTime = new Date(session.start_time);
    const endTime = session.end_time ? new Date(session.end_time) : undefined;
    const duration = endTime ? (endTime.getTime() - startTime.getTime()) / 1000 : 0;

    return {
      sessionId: session.id,
      driverId: session.driver_id,
      orderId: session.order_id,
      status: session.status,
      startTime,
      endTime,
      startLocation: {
        latitude: session.start_latitude,
        longitude: session.start_longitude,
        accuracy: session.start_accuracy
      },
      endLocation: session.end_latitude && session.end_longitude ? {
        latitude: session.end_latitude,
        longitude: session.end_longitude,
        accuracy: session.end_accuracy
      } : undefined,
      totalDistance: session.total_distance,
      totalDuration: duration,
      averageSpeed: session.average_speed
    };
  }

  /**
   * 세션 통계 계산 및 저장
   */
  private async calculateAndSaveSessionStats(sessionId: string): Promise<void> {
    // 구현 생략 - 복잡한 통계 계산 로직
  }

  /**
   * 추적 통계 계산
   */
  private calculateTrackingStatistics(
    trackingData: GpsTrackingEntity[],
    driverId: string,
    startDate: Date,
    endDate: Date
  ): GpsTrackingStatsDto {
    // 구현 생략 - 복잡한 통계 계산 로직
    return {
      driverId,
      periodStart: startDate,
      periodEnd: endDate,
      totalTrackingTime: 0,
      totalDistance: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      locationUpdatesCount: trackingData.length,
      accuracyDistribution: {
        high: 0,
        medium: 0,
        low: 0,
        unknown: 0
      }
    };
  }
} 