# Terraform 변수 정의 파일

# 공통 변수
variable "project_name" {
  description = "프로젝트 이름"
  type        = string
  default     = "delivery-platform"
}

variable "environment" {
  description = "배포 환경 (development, staging, production)"
  type        = string
  default     = "development"
  
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "cloud_provider" {
  description = "클라우드 프로바이더 (aws, gcp, azure, multi)"
  type        = string
  default     = "aws"
  
  validation {
    condition     = contains(["aws", "gcp", "azure", "multi"], var.cloud_provider)
    error_message = "Cloud provider must be aws, gcp, azure, or multi."
  }
}

# AWS 변수
variable "aws_region" {
  description = "AWS 리전"
  type        = string
  default     = "ap-northeast-2"
}

variable "aws_availability_zones" {
  description = "AWS 가용 영역"
  type        = list(string)
  default     = ["ap-northeast-2a", "ap-northeast-2b", "ap-northeast-2c"]
}

variable "aws_instance_type" {
  description = "AWS EC2 인스턴스 타입"
  type        = string
  default     = "t3.medium"
}

variable "aws_min_capacity" {
  description = "AWS Auto Scaling 최소 용량"
  type        = number
  default     = 2
}

variable "aws_max_capacity" {
  description = "AWS Auto Scaling 최대 용량"
  type        = number
  default     = 10
}

variable "aws_desired_capacity" {
  description = "AWS Auto Scaling 희망 용량"
  type        = number
  default     = 3
}

# GCP 변수
variable "gcp_project_id" {
  description = "GCP 프로젝트 ID"
  type        = string
  default     = ""
}

variable "gcp_region" {
  description = "GCP 리전"
  type        = string
  default     = "asia-northeast3"
}

variable "gcp_zone" {
  description = "GCP 존"
  type        = string
  default     = "asia-northeast3-a"
}

variable "gcp_machine_type" {
  description = "GCP 머신 타입"
  type        = string
  default     = "e2-medium"
}

variable "gcp_min_replicas" {
  description = "GCP Auto Scaling 최소 복제본"
  type        = number
  default     = 2
}

variable "gcp_max_replicas" {
  description = "GCP Auto Scaling 최대 복제본"
  type        = number
  default     = 10
}

# Azure 변수
variable "azure_location" {
  description = "Azure 위치"
  type        = string
  default     = "Korea Central"
}

variable "azure_vm_size" {
  description = "Azure VM 크기"
  type        = string
  default     = "Standard_B2s"
}

variable "azure_min_capacity" {
  description = "Azure Auto Scaling 최소 용량"
  type        = number
  default     = 2
}

variable "azure_max_capacity" {
  description = "Azure Auto Scaling 최대 용량"
  type        = number
  default     = 10
}

# 데이터베이스 변수
variable "db_instance_class" {
  description = "데이터베이스 인스턴스 클래스"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "데이터베이스 할당된 스토리지 (GB)"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "데이터베이스 최대 할당 스토리지 (GB)"
  type        = number
  default     = 100
}

variable "db_backup_retention_period" {
  description = "데이터베이스 백업 보존 기간 (일)"
  type        = number
  default     = 7
}

# Redis/Cache 변수
variable "redis_node_type" {
  description = "Redis 노드 타입"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_nodes" {
  description = "Redis 캐시 노드 수"
  type        = number
  default     = 1
}

# 네트워크 변수
variable "vpc_cidr" {
  description = "VPC CIDR 블록"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "퍼블릭 서브넷 CIDR 블록들"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "프라이빗 서브넷 CIDR 블록들"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}

variable "database_subnet_cidrs" {
  description = "데이터베이스 서브넷 CIDR 블록들"
  type        = list(string)
  default     = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]
}

# SSL/도메인 변수
variable "domain_name" {
  description = "도메인 이름"
  type        = string
  default     = "delivery.example.com"
}

variable "api_subdomain" {
  description = "API 서브도메인"
  type        = string
  default     = "api"
}

variable "web_subdomain" {
  description = "웹 서브도메인"
  type        = string
  default     = "www"
}

# 모니터링 변수
variable "enable_monitoring" {
  description = "모니터링 활성화 여부"
  type        = bool
  default     = true
}

variable "enable_logging" {
  description = "로깅 활성화 여부"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "로그 보존 기간 (일)"
  type        = number
  default     = 30
}

# 알림 변수 (새로 추가)
variable "alert_email" {
  description = "알림을 받을 이메일 주소"
  type        = string
  default     = ""
}

# 태그 변수
variable "additional_tags" {
  description = "추가 태그"
  type        = map(string)
  default     = {}
} 