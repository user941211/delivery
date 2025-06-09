/**
 * 배달 관련 엔티티 인터페이스
 * 
 * Supabase 데이터베이스 테이블 구조를 정의합니다.
 */

import { 
  DeliveryRequestStatus, 
  DeliveryPriority 
} from '../dto/delivery-request.dto';

import { 
  DriverStatus 
} from '../dto/driver-location.dto';

import { 
  DeliveryAssignmentStatus, 
  AssignmentMethod, 
  DriverResponseType 
} from '../dto/delivery-assignment.dto';

/**
 * 위치 정보 인터페이스
 */
export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  addressDetail?: string;
  zipCode?: string;
}

/**
 * 배달 요청 엔티티 (delivery_requests 테이블)
 */
export interface DeliveryRequestEntity {
  id: string;
  order_id: string;
  pickup_location: Location;
  delivery_location: Location;
  status: DeliveryRequestStatus;
  priority: DeliveryPriority;
  assigned_driver_id?: string;
  estimated_distance?: number;
  estimated_duration?: number;
  special_instructions?: string;
  customer_phone?: string;
  customer_name?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  assigned_at?: string;
  completed_at?: string;
}

/**
 * 배달기사 위치 엔티티 (driver_locations 테이블)
 */
export interface DriverLocationEntity {
  id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  status: DriverStatus;
  accuracy?: number;
  speed?: number;
  bearing?: number;
  altitude?: number;
  last_updated: string;
  online_since?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 배달 배정 엔티티 (delivery_assignments 테이블)
 */
export interface DeliveryAssignmentEntity {
  id: string;
  delivery_request_id: string;
  driver_id: string;
  status: DeliveryAssignmentStatus;
  method: AssignmentMethod;
  assignment_note?: string;
  response_message?: string;
  estimated_pickup_time_minutes?: number;
  attempt_number: number;
  assigned_at: string;
  responded_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 배달기사 응답 히스토리 엔티티 (driver_response_history 테이블)
 */
export interface DriverResponseHistoryEntity {
  id: string;
  assignment_id: string;
  driver_id: string;
  response_type: DriverResponseType;
  message?: string;
  response_time_seconds: number;
  created_at: string;
}

/**
 * 배달기사 위치 히스토리 엔티티 (driver_location_history 테이블)
 */
export interface DriverLocationHistoryEntity {
  id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  status: DriverStatus;
  accuracy?: number;
  speed?: number;
  bearing?: number;
  altitude?: number;
  recorded_at: string;
  created_at: string;
}

/**
 * 배달 통계 엔티티 (delivery_stats 테이블)
 */
export interface DeliveryStatsEntity {
  id: string;
  driver_id?: string;
  date: string;
  total_requests: number;
  accepted_requests: number;
  rejected_requests: number;
  completed_deliveries: number;
  cancelled_deliveries: number;
  total_distance_km: number;
  total_online_time_minutes: number;
  average_response_time_seconds: number;
  created_at: string;
  updated_at: string;
}

/**
 * 배달 지역 설정 엔티티 (delivery_zones 테이블)
 */
export interface DeliveryZoneEntity {
  id: string;
  name: string;
  description?: string;
  boundary_coordinates: Array<{ latitude: number; longitude: number }>;
  max_delivery_radius_km: number;
  is_active: boolean;
  priority_multiplier: number;
  created_at: string;
  updated_at: string;
}

/**
 * 배달기사 지역 할당 엔티티 (driver_zone_assignments 테이블)
 */
export interface DriverZoneAssignmentEntity {
  id: string;
  driver_id: string;
  zone_id: string;
  is_primary: boolean;
  assigned_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Supabase 데이터베이스 스키마 정의
 */
export interface Database {
  public: {
    Tables: {
      delivery_requests: {
        Row: DeliveryRequestEntity;
        Insert: Omit<DeliveryRequestEntity, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DeliveryRequestEntity, 'id' | 'created_at'>>;
      };
      driver_locations: {
        Row: DriverLocationEntity;
        Insert: Omit<DriverLocationEntity, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DriverLocationEntity, 'id' | 'driver_id' | 'created_at'>>;
      };
      delivery_assignments: {
        Row: DeliveryAssignmentEntity;
        Insert: Omit<DeliveryAssignmentEntity, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DeliveryAssignmentEntity, 'id' | 'created_at'>>;
      };
      driver_response_history: {
        Row: DriverResponseHistoryEntity;
        Insert: Omit<DriverResponseHistoryEntity, 'id' | 'created_at'>;
        Update: Partial<Omit<DriverResponseHistoryEntity, 'id' | 'created_at'>>;
      };
      driver_location_history: {
        Row: DriverLocationHistoryEntity;
        Insert: Omit<DriverLocationHistoryEntity, 'id' | 'created_at'>;
        Update: Partial<Omit<DriverLocationHistoryEntity, 'id' | 'created_at'>>;
      };
      delivery_stats: {
        Row: DeliveryStatsEntity;
        Insert: Omit<DeliveryStatsEntity, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DeliveryStatsEntity, 'id' | 'created_at'>>;
      };
      delivery_zones: {
        Row: DeliveryZoneEntity;
        Insert: Omit<DeliveryZoneEntity, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DeliveryZoneEntity, 'id' | 'created_at'>>;
      };
      driver_zone_assignments: {
        Row: DriverZoneAssignmentEntity;
        Insert: Omit<DriverZoneAssignmentEntity, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DriverZoneAssignmentEntity, 'id' | 'created_at'>>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      delivery_request_status: DeliveryRequestStatus;
      delivery_priority: DeliveryPriority;
      driver_status: DriverStatus;
      delivery_assignment_status: DeliveryAssignmentStatus;
      assignment_method: AssignmentMethod;
      driver_response_type: DriverResponseType;
    };
  };
} 