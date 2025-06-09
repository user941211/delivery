/**
 * GPS 추적 엔티티
 * 
 * GPS 위치 추적 데이터를 저장하기 위한 Supabase 테이블 인터페이스를 정의합니다.
 */

import { GpsAccuracyLevel, TrackingSessionStatus, GeofenceEventType } from '../dto/gps-tracking.dto';

/**
 * GPS 추적 데이터 엔티티
 */
export interface GpsTrackingEntity {
  id: string;
  driver_id: string;
  order_id?: string;
  session_id?: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  accuracy_level?: GpsAccuracyLevel;
  speed?: number;
  bearing?: number;
  battery_level?: number;
  signal_strength?: number;
  is_indoor?: boolean;
  timestamp: string;
  created_at: string;
  updated_at: string;
}

/**
 * 추적 세션 엔티티
 */
export interface TrackingSessionEntity {
  id: string;
  driver_id: string;
  order_id?: string;
  status: TrackingSessionStatus;
  start_time: string;
  end_time?: string;
  start_latitude: number;
  start_longitude: number;
  start_accuracy?: number;
  end_latitude?: number;
  end_longitude?: number;
  end_accuracy?: number;
  total_distance: number;
  total_duration: number;
  average_speed: number;
  max_speed: number;
  location_updates_count: number;
  estimated_end_time?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 지오펜스 엔티티
 */
export interface GeofenceEntity {
  id: string;
  name: string;
  center_latitude: number;
  center_longitude: number;
  radius: number;
  is_active: boolean;
  created_by: string;
  description?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

/**
 * 지오펜스 이벤트 엔티티
 */
export interface GeofenceEventEntity {
  id: string;
  geofence_id: string;
  driver_id: string;
  event_type: GeofenceEventType;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
  session_id?: string;
  order_id?: string;
  metadata?: any;
  created_at: string;
}

/**
 * GPS 추적 통계 엔티티
 */
export interface GpsTrackingStatsEntity {
  id: string;
  driver_id: string;
  period_start: string;
  period_end: string;
  total_tracking_time: number;
  total_distance: number;
  average_speed: number;
  max_speed: number;
  location_updates_count: number;
  accuracy_high: number;
  accuracy_medium: number;
  accuracy_low: number;
  accuracy_unknown: number;
  created_at: string;
  updated_at: string;
}

/**
 * 배달기사 현재 위치 엔티티 (확장)
 */
export interface DriverCurrentLocationEntity {
  driver_id: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  accuracy_level?: GpsAccuracyLevel;
  speed?: number;
  bearing?: number;
  battery_level?: number;
  signal_strength?: number;
  is_indoor?: boolean;
  last_session_id?: string;
  last_order_id?: string;
  last_updated: string;
  is_tracking_active: boolean;
  created_at: string;
  updated_at: string;
} 