/**
 * 배달기사 신청 관련 DTO
 * 
 * 배달기사 신청서 작성, 서류 업로드, 차량 정보 등록 등의 데이터 전송 객체를 정의합니다.
 */

import { 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsDateString, 
  IsUrl, 
  IsBoolean,
  MinLength, 
  MaxLength, 
  Matches,
  IsArray,
  ValidateNested,
  IsUUID
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/** 차량 유형 */
export enum VehicleType {
  MOTORCYCLE = 'motorcycle',
  BICYCLE = 'bicycle',
  CAR = 'car',
  ELECTRIC_SCOOTER = 'electric_scooter'
}

/** 신청 상태 */
export enum ApplicationStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ADDITIONAL_INFO_REQUIRED = 'additional_info_required'
}

/** 차량 정보 DTO */
export class VehicleInfoDto {
  @ApiProperty({
    description: '차량 유형',
    enum: VehicleType,
    example: VehicleType.MOTORCYCLE
  })
  @IsEnum(VehicleType, { message: '올바른 차량 유형을 선택해주세요.' })
  type: VehicleType;

  @ApiProperty({
    description: '차량 번호 (오토바이/자동차의 경우)',
    example: '12가3456',
    required: false
  })
  @IsOptional()
  @IsString({ message: '차량 번호는 문자열이어야 합니다.' })
  @Matches(/^[0-9]{2,3}[가-힣][0-9]{4}$/, {
    message: '올바른 차량 번호 형식이 아닙니다. (예: 12가3456)'
  })
  plateNumber?: string;

  @ApiProperty({
    description: '차량 모델명',
    example: 'Honda PCX 150',
    maxLength: 100
  })
  @IsString({ message: '차량 모델명은 문자열이어야 합니다.' })
  @MaxLength(100, { message: '차량 모델명은 최대 100자까지 가능합니다.' })
  model: string;

  @ApiProperty({
    description: '제조년도',
    example: '2022'
  })
  @IsString({ message: '제조년도는 문자열이어야 합니다.' })
  @Matches(/^(19|20)\d{2}$/, {
    message: '올바른 제조년도를 입력해주세요. (예: 2022)'
  })
  year: string;

  @ApiProperty({
    description: '차량 색상',
    example: '검정',
    maxLength: 50
  })
  @IsString({ message: '차량 색상은 문자열이어야 합니다.' })
  @MaxLength(50, { message: '차량 색상은 최대 50자까지 가능합니다.' })
  color: string;
}

/** 서류 정보 DTO */
export class DocumentDto {
  @ApiProperty({
    description: '신분증 사진 URL',
    example: 'https://storage.example.com/documents/id-card.jpg'
  })
  @IsUrl({}, { message: '올바른 URL 형식이 아닙니다.' })
  identificationUrl: string;

  @ApiProperty({
    description: '운전면허증 사진 URL (오토바이/자동차의 경우)',
    example: 'https://storage.example.com/documents/license.jpg',
    required: false
  })
  @IsOptional()
  @IsUrl({}, { message: '올바른 URL 형식이 아닙니다.' })
  drivingLicenseUrl?: string;

  @ApiProperty({
    description: '차량등록증 사진 URL (오토바이/자동차의 경우)',
    example: 'https://storage.example.com/documents/registration.jpg',
    required: false
  })
  @IsOptional()
  @IsUrl({}, { message: '올바른 URL 형식이 아닙니다.' })
  vehicleRegistrationUrl?: string;

  @ApiProperty({
    description: '보험증서 사진 URL',
    example: 'https://storage.example.com/documents/insurance.jpg'
  })
  @IsUrl({}, { message: '올바른 URL 형식이 아닙니다.' })
  insuranceUrl: string;

  @ApiProperty({
    description: '통장 사본 URL (급여 지급용)',
    example: 'https://storage.example.com/documents/bankbook.jpg'
  })
  @IsUrl({}, { message: '올바른 URL 형식이 아닙니다.' })
  bankAccountUrl: string;
}

/** 배달 구역 DTO */
export class DeliveryAreaDto {
  @ApiProperty({
    description: '구역 이름',
    example: '강남구 역삼동',
    maxLength: 100
  })
  @IsString({ message: '구역 이름은 문자열이어야 합니다.' })
  @MaxLength(100, { message: '구역 이름은 최대 100자까지 가능합니다.' })
  name: string;

  @ApiProperty({
    description: '위도',
    example: 37.5665
  })
  @IsString({ message: '위도는 문자열이어야 합니다.' })
  @Matches(/^-?([1-8]?[0-9]\.{1}\d{1,6}$|90\.{1}0{1,6}$)/, {
    message: '올바른 위도 형식이 아닙니다.'
  })
  latitude: string;

  @ApiProperty({
    description: '경도',
    example: 127.0780
  })
  @IsString({ message: '경도는 문자열이어야 합니다.' })
  @Matches(/^-?([1]?[0-7][0-9]\.{1}\d{1,6}$|180\.{1}0{1,6}$|[1-9]?[0-9]\.{1}\d{1,6}$)/, {
    message: '올바른 경도 형식이 아닙니다.'
  })
  longitude: string;

  @ApiProperty({
    description: '반경 (미터)',
    example: 3000
  })
  @IsString({ message: '반경은 문자열이어야 합니다.' })
  @Matches(/^[1-9]\d{2,4}$/, {
    message: '반경은 100미터 이상 99999미터 이하여야 합니다.'
  })
  radius: string;
}

/** 배달기사 신청서 생성 DTO */
export class CreateDriverApplicationDto {
  @ApiProperty({
    description: '차량 정보',
    type: VehicleInfoDto
  })
  @ValidateNested()
  @Type(() => VehicleInfoDto)
  vehicleInfo: VehicleInfoDto;

  @ApiProperty({
    description: '서류 정보',
    type: DocumentDto
  })
  @ValidateNested()
  @Type(() => DocumentDto)
  documents: DocumentDto;

  @ApiProperty({
    description: '희망 배달 구역 목록',
    type: [DeliveryAreaDto],
    isArray: true
  })
  @IsArray({ message: '배달 구역은 배열이어야 합니다.' })
  @ValidateNested({ each: true })
  @Type(() => DeliveryAreaDto)
  deliveryAreas: DeliveryAreaDto[];

  @ApiProperty({
    description: '자기소개 및 지원 동기',
    example: '안전하고 신속한 배달 서비스를 제공하겠습니다.',
    maxLength: 1000,
    required: false
  })
  @IsOptional()
  @IsString({ message: '자기소개는 문자열이어야 합니다.' })
  @MaxLength(1000, { message: '자기소개는 최대 1000자까지 가능합니다.' })
  introduction?: string;

  @ApiProperty({
    description: '개인정보 처리 동의',
    example: true
  })
  @IsBoolean({ message: '개인정보 처리 동의는 불린 값이어야 합니다.' })
  privacyConsent: boolean;

  @ApiProperty({
    description: '서비스 이용약관 동의',
    example: true
  })
  @IsBoolean({ message: '서비스 이용약관 동의는 불린 값이어야 합니다.' })
  termsConsent: boolean;
}

/** 배달기사 신청서 업데이트 DTO */
export class UpdateDriverApplicationDto {
  @ApiProperty({
    description: '차량 정보',
    type: VehicleInfoDto,
    required: false
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleInfoDto)
  vehicleInfo?: VehicleInfoDto;

  @ApiProperty({
    description: '서류 정보',
    type: DocumentDto,
    required: false
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentDto)
  documents?: DocumentDto;

  @ApiProperty({
    description: '희망 배달 구역 목록',
    type: [DeliveryAreaDto],
    isArray: true,
    required: false
  })
  @IsOptional()
  @IsArray({ message: '배달 구역은 배열이어야 합니다.' })
  @ValidateNested({ each: true })
  @Type(() => DeliveryAreaDto)
  deliveryAreas?: DeliveryAreaDto[];

  @ApiProperty({
    description: '자기소개 및 지원 동기',
    maxLength: 1000,
    required: false
  })
  @IsOptional()
  @IsString({ message: '자기소개는 문자열이어야 합니다.' })
  @MaxLength(1000, { message: '자기소개는 최대 1000자까지 가능합니다.' })
  introduction?: string;
}

/** 관리자 승인/거부 DTO */
export class ReviewApplicationDto {
  @ApiProperty({
    description: '승인 여부',
    example: true
  })
  @IsBoolean({ message: '승인 여부는 불린 값이어야 합니다.' })
  approved: boolean;

  @ApiProperty({
    description: '검토 의견 (거부 시 필수)',
    example: '서류가 불분명합니다. 재제출 바랍니다.',
    maxLength: 500,
    required: false
  })
  @IsOptional()
  @IsString({ message: '검토 의견은 문자열이어야 합니다.' })
  @MaxLength(500, { message: '검토 의견은 최대 500자까지 가능합니다.' })
  reviewComment?: string;

  @ApiProperty({
    description: '추가 정보 요청 여부',
    example: false,
    required: false
  })
  @IsOptional()
  @IsBoolean({ message: '추가 정보 요청 여부는 불린 값이어야 합니다.' })
  requiresAdditionalInfo?: boolean;
}

/** 배달기사 신청서 응답 DTO */
export class DriverApplicationResponseDto {
  @ApiProperty({
    description: '신청서 ID',
    example: 'uuid-string'
  })
  id: string;

  @ApiProperty({
    description: '신청자 사용자 ID',
    example: 'user-uuid-string'
  })
  userId: string;

  @ApiProperty({
    description: '신청자 이름',
    example: '홍길동'
  })
  applicantName: string;

  @ApiProperty({
    description: '신청자 이메일',
    example: 'driver@example.com'
  })
  applicantEmail: string;

  @ApiProperty({
    description: '신청자 전화번호',
    example: '010-1234-5678'
  })
  applicantPhone: string;

  @ApiProperty({
    description: '차량 정보',
    type: VehicleInfoDto
  })
  vehicleInfo: VehicleInfoDto;

  @ApiProperty({
    description: '서류 정보',
    type: DocumentDto
  })
  documents: DocumentDto;

  @ApiProperty({
    description: '희망 배달 구역 목록',
    type: [DeliveryAreaDto],
    isArray: true
  })
  deliveryAreas: DeliveryAreaDto[];

  @ApiProperty({
    description: '자기소개 및 지원 동기',
    example: '안전하고 신속한 배달 서비스를 제공하겠습니다.',
    required: false
  })
  introduction?: string;

  @ApiProperty({
    description: '신청 상태',
    enum: ApplicationStatus,
    example: ApplicationStatus.PENDING
  })
  status: ApplicationStatus;

  @ApiProperty({
    description: '검토 의견',
    example: '서류 검토 중입니다.',
    required: false
  })
  reviewComment?: string;

  @ApiProperty({
    description: '검토자 ID',
    example: 'admin-uuid-string',
    required: false
  })
  reviewedBy?: string;

  @ApiProperty({
    description: '검토 일시',
    example: '2024-01-15T10:30:00Z',
    required: false
  })
  reviewedAt?: Date;

  @ApiProperty({
    description: '신청 일시',
    example: '2024-01-10T14:20:00Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정 일시',
    example: '2024-01-12T16:45:00Z'
  })
  updatedAt: Date;
}

/** 배달기사 신청서 목록 조회 쿼리 DTO */
export class GetDriverApplicationsQueryDto {
  @ApiProperty({
    description: '신청 상태 필터',
    enum: ApplicationStatus,
    required: false
  })
  @IsOptional()
  @IsEnum(ApplicationStatus, { message: '올바른 신청 상태를 선택해주세요.' })
  status?: ApplicationStatus;

  @ApiProperty({
    description: '페이지 번호 (1부터 시작)',
    example: 1,
    required: false
  })
  @IsOptional()
  @IsString({ message: '페이지 번호는 문자열이어야 합니다.' })
  @Matches(/^[1-9]\d*$/, { message: '페이지 번호는 1 이상의 정수여야 합니다.' })
  page?: string;

  @ApiProperty({
    description: '페이지당 항목 수 (최대 100)',
    example: 20,
    required: false
  })
  @IsOptional()
  @IsString({ message: '페이지 크기는 문자열이어야 합니다.' })
  @Matches(/^([1-9]|[1-9]\d|100)$/, { message: '페이지 크기는 1-100 사이의 정수여야 합니다.' })
  limit?: string;

  @ApiProperty({
    description: '검색 키워드 (이름, 이메일, 전화번호)',
    example: '홍길동',
    required: false
  })
  @IsOptional()
  @IsString({ message: '검색 키워드는 문자열이어야 합니다.' })
  @MaxLength(100, { message: '검색 키워드는 최대 100자까지 가능합니다.' })
  search?: string;
} 