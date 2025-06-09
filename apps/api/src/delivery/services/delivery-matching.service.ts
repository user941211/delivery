/**
 * 배달 매칭 알고리즘 서비스
 * 
 * 주문 위치와 배달기사 위치를 기반으로 최적의 매칭을 찾는 서비스입니다.
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DriverLocationService } from './driver-location.service';
import { 
  FindNearbyDriversQueryDto,
  NearbyDriverDto,
  DriverStatus
} from '../dto/driver-location.dto';
import { 
  AssignmentMethod 
} from '../dto/delivery-assignment.dto';
import { 
  DeliveryPriority 
} from '../dto/delivery-request.dto';

/**
 * 매칭 결과 인터페이스
 */
export interface MatchingResult {
  driverId: string;
  driverName: string;
  distance: number;
  matchingScore: number;
  estimatedArrivalTime: number;
  confidence: number; // 매칭 신뢰도 (0-1)
  reasoning: string; // 매칭 사유
}

/**
 * 매칭 요청 인터페이스
 */
export interface MatchingRequest {
  pickupLatitude: number;
  pickupLongitude: number;
  deliveryLatitude: number;
  deliveryLongitude: number;
  priority: DeliveryPriority;
  estimatedDistance?: number;
  excludeDriverIds?: string[];
  maxSearchRadius?: number;
  method: AssignmentMethod;
}

/**
 * 매칭 옵션 인터페이스
 */
export interface MatchingOptions {
  maxCandidates: number;
  maxSearchRadius: number;
  weightFactors: {
    distance: number;      // 거리 가중치
    rating: number;        // 평점 가중치
    experience: number;    // 경험 가중치
    availability: number;  // 가용성 가중치
  };
  minRating?: number;
  minExperience?: number;
}

/**
 * 배달 매칭 서비스 클래스
 */
@Injectable()
export class DeliveryMatchingService {
  private readonly logger = new Logger(DeliveryMatchingService.name);

  // 기본 매칭 옵션
  private readonly defaultOptions: MatchingOptions = {
    maxCandidates: 10,
    maxSearchRadius: 10, // 10km
    weightFactors: {
      distance: 0.4,      // 거리 40%
      rating: 0.3,        // 평점 30%  
      experience: 0.2,    // 경험 20%
      availability: 0.1   // 가용성 10%
    },
    minRating: 3.0,
    minExperience: 5 // 최소 5회 배달
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly driverLocationService: DriverLocationService
  ) {}

  /**
   * 주문에 대한 최적의 배달기사 매칭
   */
  async findBestMatch(
    request: MatchingRequest,
    options?: Partial<MatchingOptions>
  ): Promise<MatchingResult | null> {
    try {
      this.logger.log(`Finding best match for delivery at (${request.pickupLatitude}, ${request.pickupLongitude})`);

      const matchingOptions = { ...this.defaultOptions, ...options };
      
      // 매칭 방식에 따른 처리
      switch (request.method) {
        case AssignmentMethod.AUTO_NEAREST:
          return this.findNearestDriverMatch(request, matchingOptions);
        
        case AssignmentMethod.AUTO_OPTIMAL:
          return this.findOptimalDriverMatch(request, matchingOptions);
        
        default:
          throw new BadRequestException(`지원하지 않는 매칭 방식입니다: ${request.method}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to find best match: ${errorMessage}`);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('매칭 처리에 실패했습니다.');
    }
  }

  /**
   * 여러 배달기사 후보 찾기 (브로드캐스트용)
   */
  async findMultipleCandidates(
    request: MatchingRequest,
    maxCandidates: number = 5,
    options?: Partial<MatchingOptions>
  ): Promise<MatchingResult[]> {
    try {
      this.logger.log(`Finding multiple candidates for delivery at (${request.pickupLatitude}, ${request.pickupLongitude})`);

      const matchingOptions = { ...this.defaultOptions, ...options, maxCandidates };
      
      // 주변 배달기사 검색
      const nearbyDrivers = await this.findNearbyAvailableDrivers(request, matchingOptions);
      
      if (nearbyDrivers.length === 0) {
        this.logger.warn('No available drivers found in the area');
        return [];
      }

      // 모든 후보에 대해 매칭 점수 계산
      const candidates = await Promise.all(
        nearbyDrivers.map(driver => this.calculateMatchingScore(driver, request, matchingOptions))
      );

      // 점수 순으로 정렬하여 상위 후보 반환
      return candidates
        .filter(candidate => candidate.confidence >= 0.3) // 최소 신뢰도 필터
        .sort((a, b) => b.matchingScore - a.matchingScore)
        .slice(0, maxCandidates);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to find multiple candidates: ${errorMessage}`);
      throw new BadRequestException('후보 검색에 실패했습니다.');
    }
  }

  /**
   * 가장 가까운 배달기사 찾기 (단순 거리 기반)
   */
  private async findNearestDriverMatch(
    request: MatchingRequest,
    options: MatchingOptions
  ): Promise<MatchingResult | null> {
    const nearbyDrivers = await this.findNearbyAvailableDrivers(request, options);
    
    if (nearbyDrivers.length === 0) {
      return null;
    }

    // 가장 가까운 배달기사 선택
    const nearestDriver = nearbyDrivers.reduce((closest, current) => 
      current.distance < closest.distance ? current : closest
    );

    return this.calculateMatchingScore(nearestDriver, request, options);
  }

  /**
   * 최적화된 배달기사 찾기 (복합 점수 기반)
   */
  private async findOptimalDriverMatch(
    request: MatchingRequest,
    options: MatchingOptions
  ): Promise<MatchingResult | null> {
    const nearbyDrivers = await this.findNearbyAvailableDrivers(request, options);
    
    if (nearbyDrivers.length === 0) {
      return null;
    }

    // 모든 후보의 매칭 점수 계산
    const scoredCandidates = await Promise.all(
      nearbyDrivers.map(driver => this.calculateMatchingScore(driver, request, options))
    );

    // 최고 점수 배달기사 선택
    return scoredCandidates
      .filter(candidate => candidate.confidence >= 0.4) // 높은 신뢰도 요구
      .sort((a, b) => b.matchingScore - a.matchingScore)[0] || null;
  }

  /**
   * 주변 가용한 배달기사 검색
   */
  private async findNearbyAvailableDrivers(
    request: MatchingRequest,
    options: MatchingOptions
  ): Promise<NearbyDriverDto[]> {
    const searchQuery: FindNearbyDriversQueryDto = {
      latitude: request.pickupLatitude,
      longitude: request.pickupLongitude,
      radius: request.maxSearchRadius || options.maxSearchRadius,
      status: [DriverStatus.ONLINE], // 온라인 상태만
      limit: options.maxCandidates * 2, // 여유분 확보
      sortBy: 'distance'
    };

    const nearbyDrivers = await this.driverLocationService.findNearbyDrivers(searchQuery);
    
    // 제외할 배달기사 필터링
    return nearbyDrivers.filter(driver => 
      !request.excludeDriverIds?.includes(driver.driverId)
    );
  }

  /**
   * 매칭 점수 계산
   */
  private async calculateMatchingScore(
    driver: NearbyDriverDto,
    request: MatchingRequest,
    options: MatchingOptions
  ): Promise<MatchingResult> {
    const weights = options.weightFactors;
    
    // 1. 거리 점수 (0-1, 가까울수록 높음)
    const maxDistance = options.maxSearchRadius;
    const distanceScore = Math.max(0, 1 - (driver.distance / maxDistance));
    
    // 2. 평점 점수 (0-1, 5점 만점 기준)
    const rating = driver.rating || 3.0;
    const ratingScore = Math.min(1, rating / 5.0);
    
    // 3. 경험 점수 (0-1, 배달 완료 수 기준)
    const completedDeliveries = driver.completedDeliveries || 0;
    const experienceScore = Math.min(1, completedDeliveries / 100); // 100회를 만점으로
    
    // 4. 가용성 점수 (현재는 온라인 상태면 1)
    const availabilityScore = driver.status === DriverStatus.ONLINE ? 1 : 0;
    
    // 5. 우선순위 보정
    const priorityMultiplier = this.getPriorityMultiplier(request.priority);
    
    // 가중 평균으로 최종 점수 계산
    const baseScore = 
      (distanceScore * weights.distance) +
      (ratingScore * weights.rating) +
      (experienceScore * weights.experience) +
      (availabilityScore * weights.availability);
    
    const finalScore = baseScore * priorityMultiplier;
    
    // 신뢰도 계산 (다양한 요소 고려)
    const confidence = this.calculateConfidence(driver, distanceScore, ratingScore, experienceScore);
    
    // 매칭 사유 생성
    const reasoning = this.generateReasoning(driver, distanceScore, ratingScore, experienceScore);
    
    return {
      driverId: driver.driverId,
      driverName: driver.driverName,
      distance: driver.distance,
      matchingScore: Math.round(finalScore * 100) / 100,
      estimatedArrivalTime: driver.estimatedArrivalTime || this.calculateEstimatedArrivalTime(driver.distance),
      confidence: Math.round(confidence * 100) / 100,
      reasoning
    };
  }

  /**
   * 우선순위 배수 계산
   */
  private getPriorityMultiplier(priority: DeliveryPriority): number {
    switch (priority) {
      case DeliveryPriority.URGENT:
        return 1.5;
      case DeliveryPriority.HIGH:
        return 1.2;
      case DeliveryPriority.NORMAL:
        return 1.0;
      case DeliveryPriority.LOW:
        return 0.8;
      default:
        return 1.0;
    }
  }

  /**
   * 신뢰도 계산 (0-1)
   */
  private calculateConfidence(
    driver: NearbyDriverDto,
    distanceScore: number,
    ratingScore: number,
    experienceScore: number
  ): number {
    // 기본 신뢰도는 점수들의 평균
    let confidence = (distanceScore + ratingScore + experienceScore) / 3;
    
    // 거리가 너무 멀면 신뢰도 감소
    if (driver.distance > 5) {
      confidence *= 0.8;
    }
    
    // 평점이 낮으면 신뢰도 감소
    if ((driver.rating || 0) < 3.5) {
      confidence *= 0.7;
    }
    
    // 경험이 부족하면 신뢰도 감소
    if ((driver.completedDeliveries || 0) < 10) {
      confidence *= 0.9;
    }
    
    // 최근 위치 업데이트가 오래되었으면 신뢰도 감소
    const lastUpdateMinutes = (Date.now() - driver.lastUpdated.getTime()) / (1000 * 60);
    if (lastUpdateMinutes > 10) {
      confidence *= 0.8;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * 매칭 사유 생성
   */
  private generateReasoning(
    driver: NearbyDriverDto,
    distanceScore: number,
    ratingScore: number,
    experienceScore: number
  ): string {
    const reasons: string[] = [];
    
    if (distanceScore > 0.8) {
      reasons.push('매우 가까운 위치');
    } else if (distanceScore > 0.6) {
      reasons.push('적당한 거리');
    }
    
    if (ratingScore > 0.8) {
      reasons.push('높은 평점');
    } else if (ratingScore > 0.6) {
      reasons.push('양호한 평점');
    }
    
    if (experienceScore > 0.5) {
      reasons.push('풍부한 배달 경험');
    } else if (experienceScore > 0.2) {
      reasons.push('적절한 배달 경험');
    }
    
    if (driver.status === DriverStatus.ONLINE) {
      reasons.push('현재 활성 상태');
    }
    
    return reasons.length > 0 ? reasons.join(', ') : '기본 매칭 조건 충족';
  }

  /**
   * 예상 도착 시간 계산 (분)
   */
  private calculateEstimatedArrivalTime(distance: number): number {
    // 평균 속도 30km/h로 가정
    const averageSpeedKmh = 30;
    const timeHours = distance / averageSpeedKmh;
    const timeMinutes = timeHours * 60;
    
    // 최소 5분, 최대 60분으로 제한
    return Math.max(5, Math.min(60, Math.round(timeMinutes)));
  }

  /**
   * 매칭 가능 여부 검증
   */
  async validateMatchingEligibility(
    driverId: string,
    request: MatchingRequest
  ): Promise<{ eligible: boolean; reason?: string }> {
    try {
      // 배달기사 위치 정보 조회
      const driverLocation = await this.driverLocationService.getDriverLocation(driverId);
      
      // 상태 검증
      if (driverLocation.status !== DriverStatus.ONLINE) {
        return {
          eligible: false,
          reason: `배달기사가 현재 ${driverLocation.status} 상태입니다.`
        };
      }
      
      // 거리 검증
      const distance = this.calculateDistance(
        request.pickupLatitude,
        request.pickupLongitude,
        driverLocation.latitude,
        driverLocation.longitude
      );
      
      const maxDistance = request.maxSearchRadius || this.defaultOptions.maxSearchRadius;
      if (distance > maxDistance) {
        return {
          eligible: false,
          reason: `배달기사가 배정 가능 범위(${maxDistance}km)를 벗어났습니다.`
        };
      }
      
      // 최근 위치 업데이트 검증
      const lastUpdateMinutes = (Date.now() - driverLocation.lastUpdated.getTime()) / (1000 * 60);
      if (lastUpdateMinutes > 30) {
        return {
          eligible: false,
          reason: '배달기사의 위치 정보가 오래되었습니다.'
        };
      }
      
      return { eligible: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to validate matching eligibility: ${errorMessage}`);
      return {
        eligible: false,
        reason: '배달기사 정보 확인에 실패했습니다.'
      };
    }
  }

  /**
   * 거리 계산 (Haversine 공식)
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
} 