/**
 * 배달기사 위치 추적 서비스
 * 
 * 배달기사의 실시간 위치 정보를 관리하고 주변 기사 검색 기능을 제공합니다.
 */

import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RealtimeNotificationService } from '../../realtime/services/realtime-notification.service';
import { 
  UpdateDriverLocationDto,
  UpdateDriverStatusDto,
  FindNearbyDriversQueryDto,
  DriverLocationResponseDto,
  NearbyDriverDto,
  DriverActivityStatsDto,
  DriverLocationHistoryQueryDto,
  DriverStatus
} from '../dto/driver-location.dto';
import { 
  DriverLocationEntity,
  DriverLocationHistoryEntity,
  Database
} from '../entities/delivery.entity';

/**
 * 배달기사 위치 추적 서비스 클래스
 */
@Injectable()
export class DriverLocationService {
  private readonly logger = new Logger(DriverLocationService.name);
  private readonly supabase: SupabaseClient<Database>;

  constructor(
    private readonly configService: ConfigService,
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
   * 배달기사 위치 업데이트
   */
  async updateDriverLocation(
    driverId: string,
    updateData: UpdateDriverLocationDto
  ): Promise<DriverLocationResponseDto> {
    try {
      this.logger.log(`Updating location for driver: ${driverId}`);

      const now = new Date().toISOString();

      // 기존 위치 정보 확인
      const { data: existingLocation } = await this.supabase
        .from('driver_locations')
        .select('*')
        .eq('driver_id', driverId)
        .single();

      let locationData: DriverLocationEntity;

      if (existingLocation) {
        // 기존 위치 정보 업데이트
        const { data, error } = await this.supabase
          .from('driver_locations')
          .update({
            latitude: updateData.latitude,
            longitude: updateData.longitude,
            status: updateData.status,
            accuracy: updateData.accuracy,
            speed: updateData.speed,
            bearing: updateData.bearing,
            altitude: updateData.altitude,
            last_updated: now,
            updated_at: now,
            // 온라인 상태가 되면 online_since 설정
            ...(updateData.status === DriverStatus.ONLINE && 
                existingLocation.status !== DriverStatus.ONLINE && {
              online_since: now
            })
          })
          .eq('driver_id', driverId)
          .select()
          .single();

        if (error) throw error;
        locationData = data;
      } else {
        // 새로운 위치 정보 생성
        const { data, error } = await this.supabase
          .from('driver_locations')
          .insert({
            driver_id: driverId,
            latitude: updateData.latitude,
            longitude: updateData.longitude,
            status: updateData.status,
            accuracy: updateData.accuracy,
            speed: updateData.speed,
            bearing: updateData.bearing,
            altitude: updateData.altitude,
            last_updated: now,
            online_since: updateData.status === DriverStatus.ONLINE ? now : null,
          })
          .select()
          .single();

        if (error) throw error;
        locationData = data;
      }

      // 위치 히스토리 저장
      await this.saveLocationHistory(driverId, updateData, now);

      return this.mapToLocationResponse(locationData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to update driver location: ${errorMessage}`, errorStack);
      throw new BadRequestException('위치 업데이트에 실패했습니다.');
    }
  }

  /**
   * 배달기사 상태만 업데이트
   */
  async updateDriverStatus(
    driverId: string,
    updateData: UpdateDriverStatusDto
  ): Promise<DriverLocationResponseDto> {
    try {
      this.logger.log(`Updating status for driver: ${driverId} to ${updateData.status}`);

      const now = new Date().toISOString();

      const { data, error } = await this.supabase
        .from('driver_locations')
        .update({
          status: updateData.status,
          updated_at: now,
          // 온라인 상태가 되면 online_since 설정
          ...(updateData.status === DriverStatus.ONLINE && {
            online_since: now
          }),
          // 오프라인 상태가 되면 online_since 초기화
          ...(updateData.status === DriverStatus.OFFLINE && {
            online_since: null
          })
        })
        .eq('driver_id', driverId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundException('배달기사 위치 정보를 찾을 수 없습니다.');
        }
        throw error;
      }

      return this.mapToLocationResponse(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to update driver status: ${errorMessage}`, errorStack);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('상태 업데이트에 실패했습니다.');
    }
  }

  /**
   * 주변 배달기사 검색
   */
  async findNearbyDrivers(query: FindNearbyDriversQueryDto): Promise<NearbyDriverDto[]> {
    try {
      this.logger.log(`Finding nearby drivers near (${query.latitude}, ${query.longitude})`);

      // PostGIS 함수를 사용한 거리 기반 검색 (Supabase는 PostGIS 지원)
      const { data, error } = await this.supabase.rpc('find_nearby_drivers', {
        center_lat: query.latitude,
        center_lng: query.longitude,
        radius_km: query.radius,
        driver_statuses: query.status,
        result_limit: query.limit
      });

      if (error) {
        this.logger.warn('PostGIS function not available, using fallback search');
        return this.findNearbyDriversFallback(query);
      }

      return data.map(driver => this.mapToNearbyDriver(driver));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to find nearby drivers: ${errorMessage}`, errorStack);
      throw new BadRequestException('주변 배달기사 검색에 실패했습니다.');
    }
  }

  /**
   * PostGIS 함수가 없을 때의 대안 검색 방법
   */
  private async findNearbyDriversFallback(query: FindNearbyDriversQueryDto): Promise<NearbyDriverDto[]> {
    // 모든 활성 배달기사 가져오기
    const { data: drivers, error } = await this.supabase
      .from('driver_locations')
      .select(`
        *,
        users:driver_id (
          id,
          name,
          profile
        )
      `)
      .in('status', query.status)
      .gte('last_updated', new Date(Date.now() - 30 * 60 * 1000).toISOString()); // 30분 이내 업데이트

    if (error) throw error;

    // 거리 계산 및 필터링
    const driversWithDistance = drivers
      .map(driver => {
        const distance = this.calculateDistance(
          query.latitude,
          query.longitude,
          driver.latitude,
          driver.longitude
        );

        return {
          ...driver,
          distance
        };
      })
      .filter(driver => driver.distance <= query.radius)
      .sort((a, b) => {
        if (query.sortBy === 'distance') {
          return a.distance - b.distance;
        }
        // 평점 기준 정렬 (구현 필요)
        return a.distance - b.distance;
      })
      .slice(0, query.limit);

    return driversWithDistance.map(driver => ({
      driverId: driver.driver_id,
      driverName: driver.users?.name || 'Unknown',
      latitude: driver.latitude,
      longitude: driver.longitude,
      status: driver.status,
      distance: driver.distance,
      estimatedArrivalTime: Math.round(driver.distance / 0.5 * 60), // 30km/h 평균 속도 가정
      rating: driver.users?.profile?.rating,
      completedDeliveries: driver.users?.profile?.completed_deliveries,
      vehicleType: driver.users?.profile?.vehicle_type,
      lastUpdated: new Date(driver.last_updated)
    }));
  }

  /**
   * 배달기사 위치 정보 조회
   */
  async getDriverLocation(driverId: string): Promise<DriverLocationResponseDto> {
    try {
      const { data, error } = await this.supabase
        .from('driver_locations')
        .select('*')
        .eq('driver_id', driverId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundException('배달기사 위치 정보를 찾을 수 없습니다.');
        }
        throw error;
      }

      return this.mapToLocationResponse(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get driver location: ${errorMessage}`, errorStack);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('위치 정보 조회에 실패했습니다.');
    }
  }

  /**
   * 배달기사 활동 통계 조회
   */
  async getDriverActivityStats(driverId: string): Promise<DriverActivityStatsDto> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

      // 현재 위치 정보
      const { data: currentLocation } = await this.supabase
        .from('driver_locations')
        .select('*')
        .eq('driver_id', driverId)
        .single();

      // 오늘의 온라인 시간 계산
      const { data: todayHistory } = await this.supabase
        .from('driver_location_history')
        .select('*')
        .eq('driver_id', driverId)
        .gte('recorded_at', todayStart.toISOString())
        .order('recorded_at');

      // 이번 주 온라인 시간 계산
      const { data: weekHistory } = await this.supabase
        .from('driver_location_history')
        .select('*')
        .eq('driver_id', driverId)
        .gte('recorded_at', weekStart.toISOString())
        .order('recorded_at');

      const todayOnlineTime = this.calculateOnlineTime(todayHistory || []);
      const weekOnlineTime = this.calculateOnlineTime(weekHistory || []);
      const totalDistance = this.calculateTotalDistance(weekHistory || []);
      const averageSpeed = this.calculateAverageSpeed(weekHistory || []);

      return {
        driverId,
        onlineTimeToday: todayOnlineTime,
        onlineTimeThisWeek: weekOnlineTime,
        totalDistance,
        averageSpeed,
        lastActivity: currentLocation ? new Date(currentLocation.last_updated) : new Date(),
        currentStatus: currentLocation?.status || DriverStatus.OFFLINE
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get driver activity stats: ${errorMessage}`, errorStack);
      throw new BadRequestException('활동 통계 조회에 실패했습니다.');
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
   * 위치 히스토리 저장
   */
  private async saveLocationHistory(
    driverId: string,
    locationData: UpdateDriverLocationDto,
    recordedAt: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('driver_location_history')
        .insert({
          driver_id: driverId,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          status: locationData.status,
          accuracy: locationData.accuracy,
          speed: locationData.speed,
          bearing: locationData.bearing,
          altitude: locationData.altitude,
          recorded_at: recordedAt
        });
    } catch (error) {
      // 히스토리 저장 실패는 주요 기능에 영향을 주지 않도록 로그만 남김
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.warn(`Failed to save location history: ${errorMessage}`);
    }
  }

  /**
   * 온라인 시간 계산
   */
  private calculateOnlineTime(history: DriverLocationHistoryEntity[]): number {
    let totalMinutes = 0;
    let lastOnlineTime: Date | null = null;

    for (const record of history) {
      const recordTime = new Date(record.recorded_at);
      
      if (record.status === DriverStatus.ONLINE || record.status === DriverStatus.BUSY) {
        if (!lastOnlineTime) {
          lastOnlineTime = recordTime;
        }
      } else {
        if (lastOnlineTime) {
          totalMinutes += (recordTime.getTime() - lastOnlineTime.getTime()) / (1000 * 60);
          lastOnlineTime = null;
        }
      }
    }

    // 마지막이 온라인 상태면 현재까지의 시간 추가
    if (lastOnlineTime) {
      totalMinutes += (new Date().getTime() - lastOnlineTime.getTime()) / (1000 * 60);
    }

    return Math.round(totalMinutes);
  }

  /**
   * 총 이동 거리 계산
   */
  private calculateTotalDistance(history: DriverLocationHistoryEntity[]): number {
    let totalDistance = 0;
    
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];
      
      totalDistance += this.calculateDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      );
    }
    
    return Math.round(totalDistance * 100) / 100; // 소수점 둘째 자리까지
  }

  /**
   * 평균 속도 계산 (km/h)
   */
  private calculateAverageSpeed(history: DriverLocationHistoryEntity[]): number {
    const speeds = history
      .filter(record => record.speed !== null && record.speed !== undefined)
      .map(record => record.speed * 3.6); // m/s를 km/h로 변환

    if (speeds.length === 0) return 0;
    
    const averageSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
    return Math.round(averageSpeed * 100) / 100;
  }

  /**
   * 엔티티를 응답 DTO로 매핑
   */
  private mapToLocationResponse(entity: DriverLocationEntity): DriverLocationResponseDto {
    return {
      driverId: entity.driver_id,
      latitude: entity.latitude,
      longitude: entity.longitude,
      status: entity.status,
      accuracy: entity.accuracy,
      speed: entity.speed,
      bearing: entity.bearing,
      altitude: entity.altitude,
      lastUpdated: new Date(entity.last_updated),
      onlineSince: entity.online_since ? new Date(entity.online_since) : undefined
    };
  }

  /**
   * 주변 배달기사 DTO로 매핑
   */
  private mapToNearbyDriver(data: any): NearbyDriverDto {
    return {
      driverId: data.driver_id,
      driverName: data.driver_name || 'Unknown',
      latitude: data.latitude,
      longitude: data.longitude,
      status: data.status,
      distance: data.distance,
      estimatedArrivalTime: data.estimated_arrival_time,
      rating: data.rating,
      completedDeliveries: data.completed_deliveries,
      vehicleType: data.vehicle_type,
      lastUpdated: new Date(data.last_updated)
    };
  }

  /**
   * 주문별 배달기사 위치 업데이트 (실시간 알림 포함)
   */
  async updateDriverLocationForOrder(
    driverId: string,
    orderId: string,
    updateData: UpdateDriverLocationDto
  ): Promise<DriverLocationResponseDto> {
    try {
      // 기본 위치 업데이트 수행
      const locationResponse = await this.updateDriverLocation(driverId, updateData);

      // 실시간 위치 업데이트 알림 발송
      await this.realtimeNotificationService.sendDriverLocationUpdate({
        orderId,
        driverId,
        driverName: 'Driver', // 실제로는 배달기사 정보를 조회해야 함
        location: {
          latitude: updateData.latitude,
          longitude: updateData.longitude,
          accuracy: updateData.accuracy
        },
        status: updateData.status || 'active',
        speed: updateData.speed,
        bearing: updateData.bearing,
        metadata: {
          updatedAt: new Date().toISOString()
        }
      });

      this.logger.log(`Real-time location update sent for driver ${driverId} on order ${orderId}`);
      return locationResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to update driver location for order: ${errorMessage}`);
      throw new BadRequestException('주문별 배달기사 위치 업데이트에 실패했습니다.');
    }
  }
} 