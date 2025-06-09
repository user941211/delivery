# 보안 강화 설정

# WAF (Web Application Firewall) Web ACL
resource "aws_wafv2_web_acl" "main" {
  count = local.deploy_aws ? 1 : 0
  
  name  = "${var.project_name}-${var.environment}-waf"
  scope = "REGIONAL"
  
  default_action {
    allow {}
  }
  
  # SQL Injection 방어
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 1
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                 = "SQLiRuleSetMetric"
      sampled_requests_enabled    = true
    }
  }
  
  # XSS 방어
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                 = "KnownBadInputsRuleSetMetric"
      sampled_requests_enabled    = true
    }
  }
  
  # Common Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 3
    
    override_action {
      count {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
        
        excluded_rule {
          name = "SizeRestrictions_BODY"
        }
        
        excluded_rule {
          name = "GenericRFI_BODY"
        }
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                 = "CommonRuleSetMetric"
      sampled_requests_enabled    = true
    }
  }
  
  # Rate Limiting
  rule {
    name     = "RateLimitRule"
    priority = 4
    
    action {
      block {}
    }
    
    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                 = "RateLimitRuleMetric"
      sampled_requests_enabled    = true
    }
  }
  
  # IP Reputation List
  rule {
    name     = "AWSManagedRulesAmazonIpReputationList"
    priority = 5
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                 = "AmazonIpReputationListMetric"
      sampled_requests_enabled    = true
    }
  }
  
  # Bot Control (프로덕션만)
  dynamic "rule" {
    for_each = var.environment == "production" ? [1] : []
    content {
      name     = "AWSManagedRulesBotControlRuleSet"
      priority = 6
      
      override_action {
        none {}
      }
      
      statement {
        managed_rule_group_statement {
          name        = "AWSManagedRulesBotControlRuleSet"
          vendor_name = "AWS"
        }
      }
      
      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                 = "BotControlRuleSetMetric"
        sampled_requests_enabled    = true
      }
    }
  }
  
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                 = "${var.project_name}-${var.environment}-waf"
    sampled_requests_enabled    = true
  }
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-waf"
    Environment = var.environment
  }
}

# WAF와 ALB 연결
resource "aws_wafv2_web_acl_association" "main" {
  count = local.deploy_aws ? 1 : 0
  
  resource_arn = aws_lb.main[0].arn
  web_acl_arn  = aws_wafv2_web_acl.main[0].arn
}

# AWS Shield Advanced (프로덕션만)
resource "aws_shield_protection" "alb" {
  count = local.deploy_aws && var.environment == "production" ? 1 : 0
  
  name         = "${var.project_name}-${var.environment}-alb-shield"
  resource_arn = aws_lb.main[0].arn
}

# KMS 키 (데이터 암호화용)
resource "aws_kms_key" "main" {
  count = local.deploy_aws ? 1 : 0
  
  description             = "${var.project_name}-${var.environment} encryption key"
  deletion_window_in_days = var.environment == "production" ? 30 : 7
  enable_key_rotation     = true
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow CloudWatch Logs"
        Effect = "Allow"
        Principal = {
          Service = "logs.${var.aws_region}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-kms-key"
    Environment = var.environment
  }
}

# KMS 키 별칭
resource "aws_kms_alias" "main" {
  count = local.deploy_aws ? 1 : 0
  
  name          = "alias/${var.project_name}-${var.environment}"
  target_key_id = aws_kms_key.main[0].key_id
}

# AWS Config (컴플라이언스 모니터링)
resource "aws_config_configuration_recorder" "main" {
  count = local.deploy_aws && var.environment == "production" ? 1 : 0
  
  name     = "${var.project_name}-${var.environment}-config-recorder"
  role_arn = aws_iam_role.config[0].arn
  
  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
  
  depends_on = [aws_config_delivery_channel.main]
}

# AWS Config 전송 채널
resource "aws_config_delivery_channel" "main" {
  count = local.deploy_aws && var.environment == "production" ? 1 : 0
  
  name           = "${var.project_name}-${var.environment}-config-delivery-channel"
  s3_bucket_name = aws_s3_bucket.config[0].bucket
  
  depends_on = [aws_s3_bucket_policy.config]
}

# Config용 S3 버킷
resource "aws_s3_bucket" "config" {
  count = local.deploy_aws && var.environment == "production" ? 1 : 0
  
  bucket        = "${var.project_name}-${var.environment}-config-${random_id.bucket_suffix.hex}"
  force_destroy = var.environment != "production"
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-config-bucket"
    Environment = var.environment
  }
}

# S3 버킷 암호화
resource "aws_s3_bucket_server_side_encryption_configuration" "config" {
  count = local.deploy_aws && var.environment == "production" ? 1 : 0
  
  bucket = aws_s3_bucket.config[0].id
  
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.main[0].arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# S3 버킷 퍼블릭 액세스 차단
resource "aws_s3_bucket_public_access_block" "config" {
  count = local.deploy_aws && var.environment == "production" ? 1 : 0
  
  bucket = aws_s3_bucket.config[0].id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Config S3 버킷 정책
resource "aws_s3_bucket_policy" "config" {
  count = local.deploy_aws && var.environment == "production" ? 1 : 0
  
  bucket = aws_s3_bucket.config[0].id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSConfigBucketPermissionsCheck"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.config[0].arn
        Condition = {
          StringEquals = {
            "AWS:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      },
      {
        Sid    = "AWSConfigBucketExistenceCheck"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
        Action   = "s3:ListBucket"
        Resource = aws_s3_bucket.config[0].arn
        Condition = {
          StringEquals = {
            "AWS:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      },
      {
        Sid    = "AWSConfigBucketDelivery"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.config[0].arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl"     = "bucket-owner-full-control"
            "AWS:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

# Config IAM 역할
resource "aws_iam_role" "config" {
  count = local.deploy_aws && var.environment == "production" ? 1 : 0
  
  name = "${var.project_name}-${var.environment}-config-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
      }
    ]
  })
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-config-role"
    Environment = var.environment
  }
}

# Config IAM 역할 정책 연결
resource "aws_iam_role_policy_attachment" "config" {
  count = local.deploy_aws && var.environment == "production" ? 1 : 0
  
  role       = aws_iam_role.config[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/ConfigRole"
}

# GuardDuty (보안 위협 탐지)
resource "aws_guardduty_detector" "main" {
  count = local.deploy_aws && var.environment == "production" ? 1 : 0
  
  enable                       = true
  finding_publishing_frequency = "FIFTEEN_MINUTES"
  
  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = true
        }
      }
    }
  }
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-guardduty"
    Environment = var.environment
  }
}

# Inspector (취약점 스캔)
resource "aws_inspector2_enabler" "example" {
  count = local.deploy_aws && var.environment == "production" ? 1 : 0
  
  account_ids    = [data.aws_caller_identity.current.account_id]
  resource_types = ["ECR", "EC2"]
}

# Security Hub
resource "aws_securityhub_account" "main" {
  count = local.deploy_aws && var.environment == "production" ? 1 : 0
  
  enable_default_standards = true
}

# CloudTrail (API 호출 로깅)
resource "aws_cloudtrail" "main" {
  count = local.deploy_aws && var.environment == "production" ? 1 : 0
  
  name                          = "${var.project_name}-${var.environment}-cloudtrail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail[0].bucket
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_logging                = true
  
  kms_key_id = aws_kms_key.main[0].arn
  
  event_selector {
    read_write_type                 = "All"
    include_management_events       = true
    exclude_management_event_sources = []
    
    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::*/*"]
    }
  }
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-cloudtrail"
    Environment = var.environment
  }
  
  depends_on = [aws_s3_bucket_policy.cloudtrail]
}

# CloudTrail S3 버킷
resource "aws_s3_bucket" "cloudtrail" {
  count = local.deploy_aws && var.environment == "production" ? 1 : 0
  
  bucket        = "${var.project_name}-${var.environment}-cloudtrail-${random_id.bucket_suffix.hex}"
  force_destroy = var.environment != "production"
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-cloudtrail-bucket"
    Environment = var.environment
  }
}

# CloudTrail S3 버킷 정책
resource "aws_s3_bucket_policy" "cloudtrail" {
  count = local.deploy_aws && var.environment == "production" ? 1 : 0
  
  bucket = aws_s3_bucket.cloudtrail[0].id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail[0].arn
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = "arn:aws:cloudtrail:${var.aws_region}:${data.aws_caller_identity.current.account_id}:trail/${var.project_name}-${var.environment}-cloudtrail"
          }
        }
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail[0].arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
            "AWS:SourceArn" = "arn:aws:cloudtrail:${var.aws_region}:${data.aws_caller_identity.current.account_id}:trail/${var.project_name}-${var.environment}-cloudtrail"
          }
        }
      }
    ]
  })
}

# 랜덤 ID (버킷 이름 고유성을 위해)
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# 현재 AWS 계정 정보
data "aws_caller_identity" "current" {}

# 보안 그룹 규칙 강화 (기존 보안 그룹에 추가 규칙)
resource "aws_security_group_rule" "app_outbound_https_only" {
  count = local.deploy_aws ? 1 : 0
  
  type              = "egress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.app[0].id
  description       = "HTTPS outbound only"
}

# Database 보안 그룹에 추가 제한
resource "aws_security_group_rule" "database_port_restriction" {
  count = local.deploy_aws ? 1 : 0
  
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.app[0].id
  security_group_id        = aws_security_group.database[0].id
  description              = "PostgreSQL from app instances only"
} 