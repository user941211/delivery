# Terraform 출력 값 정의

# AWS 출력
output "aws_vpc_id" {
  description = "AWS VPC ID"
  value       = local.deploy_aws ? aws_vpc.main[0].id : null
}

output "aws_load_balancer_dns" {
  description = "AWS 로드 밸런서 DNS 이름"
  value       = local.deploy_aws ? aws_lb.main[0].dns_name : null
}

output "aws_load_balancer_zone_id" {
  description = "AWS 로드 밸런서 Zone ID"
  value       = local.deploy_aws ? aws_lb.main[0].zone_id : null
}

output "aws_database_endpoint" {
  description = "AWS RDS 데이터베이스 엔드포인트"
  value       = local.deploy_aws ? aws_db_instance.main[0].endpoint : null
  sensitive   = true
}

output "aws_redis_endpoint" {
  description = "AWS ElastiCache Redis 엔드포인트"
  value       = local.deploy_aws ? aws_elasticache_cluster.redis[0].cache_nodes[0].address : null
  sensitive   = true
}

output "aws_public_subnets" {
  description = "AWS 퍼블릭 서브넷 ID들"
  value       = local.deploy_aws ? aws_subnet.public[*].id : []
}

output "aws_private_subnets" {
  description = "AWS 프라이빗 서브넷 ID들"
  value       = local.deploy_aws ? aws_subnet.private[*].id : []
}

# 도메인 및 SSL 출력 (새로 추가)
output "domain_name" {
  description = "설정된 도메인 이름"
  value       = var.domain_name
}

output "ssl_certificate_arn" {
  description = "SSL 인증서 ARN"
  value       = local.deploy_aws && var.domain_name != "delivery.example.com" ? aws_acm_certificate.main[0].arn : null
}

output "ssl_certificate_status" {
  description = "SSL 인증서 상태"
  value       = local.deploy_aws && var.domain_name != "delivery.example.com" ? aws_acm_certificate.main[0].status : null
}

output "hosted_zone_id" {
  description = "Route 53 Hosted Zone ID"
  value       = local.hosted_zone_id
}

output "hosted_zone_name_servers" {
  description = "Route 53 Hosted Zone 네임서버들"
  value = local.deploy_aws && var.domain_name == "delivery.example.com" ? aws_route53_zone.main[0].name_servers : null
}

output "domain_urls" {
  description = "도메인 URL들"
  value = var.domain_name != "delivery.example.com" ? {
    main_domain = "https://${var.domain_name}"
    api_domain  = "https://${var.api_subdomain}.${var.domain_name}"
    web_domain  = "https://${var.web_subdomain}.${var.domain_name}"
  } : {}
}

# 데이터베이스 연결 정보
output "database_connection_info" {
  description = "데이터베이스 연결 정보"
  value = local.deploy_aws ? {
    host     = aws_db_instance.main[0].endpoint
    port     = aws_db_instance.main[0].port
    database = aws_db_instance.main[0].db_name
    username = aws_db_instance.main[0].username
  } : {}
  sensitive = true
}

# Redis 연결 정보
output "redis_connection_info" {
  description = "Redis 연결 정보"
  value = local.deploy_aws ? {
    host = aws_elasticache_cluster.redis[0].cache_nodes[0].address
    port = aws_elasticache_cluster.redis[0].cache_nodes[0].port
  } : {}
  sensitive = true
}

# 보안 정보
output "database_password" {
  description = "데이터베이스 마스터 비밀번호"
  value       = random_password.db_password.result
  sensitive   = true
}

# 애플리케이션 URL
output "application_urls" {
  description = "애플리케이션 접속 URL들"
  value = local.deploy_aws ? {
    load_balancer = var.domain_name != "delivery.example.com" ? "https://${var.domain_name}" : "http://${aws_lb.main[0].dns_name}"
    api_endpoint  = var.domain_name != "delivery.example.com" ? "https://${var.api_subdomain}.${var.domain_name}/api" : "http://${aws_lb.main[0].dns_name}/api"
    health_check  = var.domain_name != "delivery.example.com" ? "https://${var.domain_name}/health" : "http://${aws_lb.main[0].dns_name}/health"
  } : {}
}

# 도메인 설정 정보 (Route 53 설정 시 사용)
output "dns_configuration" {
  description = "DNS 설정을 위한 정보"
  value = local.deploy_aws ? {
    domain_name           = var.domain_name
    load_balancer_dns     = aws_lb.main[0].dns_name
    load_balancer_zone_id = aws_lb.main[0].zone_id
    api_subdomain         = var.api_subdomain
    web_subdomain         = var.web_subdomain
    hosted_zone_id        = local.hosted_zone_id
    ssl_certificate_arn   = var.domain_name != "delivery.example.com" ? aws_acm_certificate.main[0].arn : null
  } : {}
}

# Auto Scaling 정보
output "auto_scaling_info" {
  description = "Auto Scaling 그룹 정보"
  value = local.deploy_aws ? {
    asg_name         = aws_autoscaling_group.app[0].name
    min_capacity     = aws_autoscaling_group.app[0].min_size
    max_capacity     = aws_autoscaling_group.app[0].max_size
    desired_capacity = aws_autoscaling_group.app[0].desired_capacity
  } : {}
}

# 네트워크 정보
output "network_info" {
  description = "네트워크 구성 정보"
  value = local.deploy_aws ? {
    vpc_cidr              = aws_vpc.main[0].cidr_block
    public_subnet_cidrs   = aws_subnet.public[*].cidr_block
    private_subnet_cidrs  = aws_subnet.private[*].cidr_block
    database_subnet_cidrs = aws_subnet.database[*].cidr_block
    availability_zones    = aws_subnet.public[*].availability_zone
  } : {}
}

# 보안 그룹 정보
output "security_groups" {
  description = "보안 그룹 ID들"
  value = local.deploy_aws ? {
    alb_security_group      = aws_security_group.alb[0].id
    app_security_group      = aws_security_group.app[0].id
    database_security_group = aws_security_group.database[0].id
    redis_security_group    = aws_security_group.redis[0].id
  } : {}
}

# 태그 정보
output "resource_tags" {
  description = "리소스에 적용된 태그 정보"
  value = {
    project_name = var.project_name
    environment  = var.environment
    managed_by   = "terraform"
  }
}

# 배포 요약 정보
output "deployment_summary" {
  description = "배포 요약 정보"
  value = {
    cloud_provider    = var.cloud_provider
    environment       = var.environment
    project_name      = var.project_name
    deployed_regions  = local.deploy_aws ? [var.aws_region] : []
    domain_configured = var.domain_name != "delivery.example.com"
    ssl_enabled       = var.domain_name != "delivery.example.com"
    timestamp         = timestamp()
  }
}

# 환경 변수 템플릿 (애플리케이션 설정용)
output "environment_variables_template" {
  description = "애플리케이션 환경 변수 템플릿"
  value = local.deploy_aws ? {
    NODE_ENV     = var.environment
    DATABASE_URL = "postgresql://${aws_db_instance.main[0].username}:${random_password.db_password.result}@${aws_db_instance.main[0].endpoint}:${aws_db_instance.main[0].port}/${aws_db_instance.main[0].db_name}"
    REDIS_URL    = "redis://${aws_elasticache_cluster.redis[0].cache_nodes[0].address}:${aws_elasticache_cluster.redis[0].cache_nodes[0].port}"
    API_PORT     = "3000"
    CORS_ORIGINS = var.domain_name != "delivery.example.com" ? "https://${var.domain_name}" : "http://${aws_lb.main[0].dns_name}"
    DOMAIN_NAME  = var.domain_name
  } : {}
  sensitive = true
}

# 모니터링 설정 정보
output "monitoring_endpoints" {
  description = "모니터링 엔드포인트 정보"
  value = local.deploy_aws ? {
    cloudwatch_log_groups = [
      "delivery-platform-user-data",
      "delivery-platform-app"
    ]
    metrics_namespace = "DeliveryPlatform/EC2"
    health_check_id   = var.domain_name != "delivery.example.com" ? aws_route53_health_check.main[0].id : null
  } : {}
}

# 도메인 설정 가이드
output "domain_setup_guide" {
  description = "도메인 설정 가이드"
  value = var.domain_name == "delivery.example.com" ? {
    message = "실제 도메인을 사용하려면 다음 단계를 따르세요:"
    steps = [
      "1. 도메인을 구입하고 Route 53에 등록",
      "2. terraform.tfvars에서 domain_name을 실제 도메인으로 변경",
      "3. terraform apply를 다시 실행",
      "4. DNS 전파를 기다린 후 SSL 인증서 검증 완료"
    ]
    script = "./scripts/setup-domain.sh -d your-domain.com -e ${var.environment} setup"
  } : {
    message = "도메인이 설정되었습니다."
    test_command = "./scripts/setup-domain.sh -d ${var.domain_name} -e ${var.environment} test"
  }
} 