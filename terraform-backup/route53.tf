# Route 53 DNS 설정

# 도메인 존재 여부 확인을 위한 데이터 소스
data "aws_route53_zone" "main" {
  count = local.deploy_aws && var.domain_name != "delivery.example.com" ? 1 : 0
  
  name         = var.domain_name
  private_zone = false
}

# Route 53 Hosted Zone 생성 (도메인이 존재하지 않는 경우)
resource "aws_route53_zone" "main" {
  count = local.deploy_aws && var.domain_name == "delivery.example.com" ? 1 : 0
  
  name = var.domain_name
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-hosted-zone"
    Environment = var.environment
  }
}

# Hosted Zone ID 결정
locals {
  hosted_zone_id = local.deploy_aws ? (
    var.domain_name != "delivery.example.com" ? 
    data.aws_route53_zone.main[0].zone_id : 
    aws_route53_zone.main[0].zone_id
  ) : null
}

# SSL 인증서 (Certificate Manager)
resource "aws_acm_certificate" "main" {
  count = local.deploy_aws && var.domain_name != "delivery.example.com" ? 1 : 0
  
  domain_name               = var.domain_name
  subject_alternative_names = [
    "*.${var.domain_name}",
    "${var.api_subdomain}.${var.domain_name}",
    "${var.web_subdomain}.${var.domain_name}"
  ]
  
  validation_method = "DNS"
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-certificate"
    Environment = var.environment
  }
}

# SSL 인증서 DNS 검증 레코드
resource "aws_route53_record" "certificate_validation" {
  for_each = local.deploy_aws && var.domain_name != "delivery.example.com" ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}
  
  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = local.hosted_zone_id
}

# SSL 인증서 검증 완료 대기
resource "aws_acm_certificate_validation" "main" {
  count = local.deploy_aws && var.domain_name != "delivery.example.com" ? 1 : 0
  
  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for record in aws_route53_record.certificate_validation : record.fqdn]
  
  timeouts {
    create = "5m"
  }
}

# ALB에 SSL 인증서 적용을 위한 HTTPS 리스너 (기존 ALB 업데이트)
resource "aws_lb_listener" "app_https" {
  count = local.deploy_aws && var.domain_name != "delivery.example.com" ? 1 : 0
  
  load_balancer_arn = aws_lb.main[0].arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate_validation.main[0].certificate_arn
  
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app[0].arn
  }
}

# HTTP에서 HTTPS로 리다이렉트 (기존 HTTP 리스너 업데이트)
resource "aws_lb_listener" "app_http_redirect" {
  count = local.deploy_aws && var.domain_name != "delivery.example.com" ? 1 : 0
  
  load_balancer_arn = aws_lb.main[0].arn
  port              = "80"
  protocol          = "HTTP"
  
  default_action {
    type = "redirect"
    
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# 메인 도메인 A 레코드 (ALB 연결)
resource "aws_route53_record" "main" {
  count = local.deploy_aws && var.domain_name != "delivery.example.com" ? 1 : 0
  
  zone_id = local.hosted_zone_id
  name    = var.domain_name
  type    = "A"
  
  alias {
    name                   = aws_lb.main[0].dns_name
    zone_id                = aws_lb.main[0].zone_id
    evaluate_target_health = true
  }
}

# www 서브도메인 A 레코드
resource "aws_route53_record" "www" {
  count = local.deploy_aws && var.domain_name != "delivery.example.com" ? 1 : 0
  
  zone_id = local.hosted_zone_id
  name    = "${var.web_subdomain}.${var.domain_name}"
  type    = "A"
  
  alias {
    name                   = aws_lb.main[0].dns_name
    zone_id                = aws_lb.main[0].zone_id
    evaluate_target_health = true
  }
}

# API 서브도메인 A 레코드
resource "aws_route53_record" "api" {
  count = local.deploy_aws && var.domain_name != "delivery.example.com" ? 1 : 0
  
  zone_id = local.hosted_zone_id
  name    = "${var.api_subdomain}.${var.domain_name}"
  type    = "A"
  
  alias {
    name                   = aws_lb.main[0].dns_name
    zone_id                = aws_lb.main[0].zone_id
    evaluate_target_health = true
  }
}

# 헬스체크 (Route 53 Health Check)
resource "aws_route53_health_check" "main" {
  count = local.deploy_aws && var.domain_name != "delivery.example.com" ? 1 : 0
  
  fqdn                            = var.domain_name
  port                            = 443
  type                            = "HTTPS"
  resource_path                   = "/health"
  failure_threshold               = "3"
  request_interval                = "30"
  cloudwatch_logs_region          = var.aws_region
  cloudwatch_alarm_region         = var.aws_region
  insufficient_data_health_status = "Failure"
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-health-check"
    Environment = var.environment
  }
}

# CloudWatch 알람 (헬스체크 실패 시)
resource "aws_cloudwatch_metric_alarm" "health_check" {
  count = local.deploy_aws && var.domain_name != "delivery.example.com" ? 1 : 0
  
  alarm_name          = "${var.project_name}-${var.environment}-health-check-failed"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = "60"
  statistic           = "Minimum"
  threshold           = "1"
  alarm_description   = "This metric monitors health check status"
  alarm_actions       = []  # SNS 토픽 추가 가능
  
  dimensions = {
    HealthCheckId = aws_route53_health_check.main[0].id
  }
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-health-alarm"
    Environment = var.environment
  }
} 