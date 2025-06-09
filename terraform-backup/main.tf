# 배달 플랫폼 클라우드 인프라 설정
# 지원 클라우드: AWS, GCP, Azure

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  # 상태 파일 원격 저장소 설정 (선택적)
  backend "s3" {
    bucket = "delivery-platform-terraform-state"
    key    = "infrastructure/terraform.tfstate"
    region = "ap-northeast-2"
    
    # DynamoDB를 사용한 상태 잠금
    dynamodb_table = "delivery-platform-terraform-locks"
    encrypt        = true
  }
}

# AWS Provider 설정
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Google Cloud Provider 설정
provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
  zone    = var.gcp_zone
}

# Azure Provider 설정
provider "azurerm" {
  features {}
}

# 현재 활성화된 클라우드 프로바이더에 따른 조건부 배포
locals {
  deploy_aws   = var.cloud_provider == "aws" || var.cloud_provider == "multi"
  deploy_gcp   = var.cloud_provider == "gcp" || var.cloud_provider == "multi"
  deploy_azure = var.cloud_provider == "azure" || var.cloud_provider == "multi"
} 