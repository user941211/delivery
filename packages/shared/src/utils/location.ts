/**
 * 지리적 위치 관련 유틸리티 함수
 */

import type { Coordinates } from '../types/location';

/**
 * 두 지점 사이의 거리 계산 (Haversine 공식)
 */
export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 6371; // 지구 반지름 (km)
  
  const lat1Rad = (point1.latitude * Math.PI) / 180;
  const lat2Rad = (point2.latitude * Math.PI) / 180;
  const deltaLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const deltaLng = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a = 
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // 거리 (km)
}

/**
 * 특정 지점이 원형 영역 내에 있는지 확인
 */
export function isWithinRadius(
  center: Coordinates, 
  point: Coordinates, 
  radiusKm: number
): boolean {
  const distance = calculateDistance(center, point);
  return distance <= radiusKm;
}

/**
 * 경계 박스 내에 있는지 확인
 */
export function isWithinBounds(
  point: Coordinates,
  bounds: { northeast: Coordinates; southwest: Coordinates }
): boolean {
  return (
    point.latitude >= bounds.southwest.latitude &&
    point.latitude <= bounds.northeast.latitude &&
    point.longitude >= bounds.southwest.longitude &&
    point.longitude <= bounds.northeast.longitude
  );
}

/**
 * 좌표 유효성 검사
 */
export function isValidCoordinates(coords: Coordinates): boolean {
  return (
    coords.latitude >= -90 && coords.latitude <= 90 &&
    coords.longitude >= -180 && coords.longitude <= 180
  );
} 