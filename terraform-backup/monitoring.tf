# CloudWatch 모니터링 설정

# CloudWatch 로그 그룹들
resource "aws_cloudwatch_log_group" "user_data" {
  count = local.deploy_aws ? 1 : 0
  
  name              = "/delivery-platform/${var.environment}/user-data"
  retention_in_days = var.log_retention_days
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-user-data-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "app" {
  count = local.deploy_aws ? 1 : 0
  
  name              = "/delivery-platform/${var.environment}/app"
  retention_in_days = var.log_retention_days
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-app-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "api" {
  count = local.deploy_aws ? 1 : 0
  
  name              = "/delivery-platform/${var.environment}/api"
  retention_in_days = var.log_retention_days
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-api-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "nginx" {
  count = local.deploy_aws ? 1 : 0
  
  name              = "/delivery-platform/${var.environment}/nginx"
  retention_in_days = var.log_retention_days
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-nginx-logs"
    Environment = var.environment
  }
}

# SNS 토픽 (알림용)
resource "aws_sns_topic" "alerts" {
  count = local.deploy_aws ? 1 : 0
  
  name = "${var.project_name}-${var.environment}-alerts"
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-alerts"
    Environment = var.environment
  }
}

# SNS 토픽 구독 (이메일 알림)
resource "aws_sns_topic_subscription" "email_alerts" {
  count = local.deploy_aws && var.alert_email != "" ? 1 : 0
  
  topic_arn = aws_sns_topic.alerts[0].arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# CloudWatch 대시보드
resource "aws_cloudwatch_dashboard" "main" {
  count = local.deploy_aws ? 1 : 0
  
  dashboard_name = "${var.project_name}-${var.environment}-dashboard"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.main[0].arn_suffix],
            [".", "TargetResponseTime", ".", "."],
            [".", "HTTPCode_Target_2XX_Count", ".", "."],
            [".", "HTTPCode_Target_4XX_Count", ".", "."],
            [".", "HTTPCode_Target_5XX_Count", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Load Balancer Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/AutoScaling", "GroupDesiredCapacity", "AutoScalingGroupName", aws_autoscaling_group.app[0].name],
            [".", "GroupInServiceInstances", ".", "."],
            [".", "GroupPendingInstances", ".", "."],
            [".", "GroupTerminatingInstances", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Auto Scaling Group"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 6
        height = 6
        
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.main[0].id],
            [".", "DatabaseConnections", ".", "."],
            [".", "FreeableMemory", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "RDS Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 6
        y      = 12
        width  = 6
        height = 6
        
        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", aws_elasticache_cluster.redis[0].cluster_id],
            [".", "CurrConnections", ".", "."],
            [".", "Evictions", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Redis Metrics"
          period  = 300
        }
      }
    ]
  })
}

# CloudWatch 알람 - 높은 CPU 사용률
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  count = local.deploy_aws ? 1 : 0
  
  alarm_name          = "${var.project_name}-${var.environment}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ec2 cpu utilization"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  
  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.app[0].name
  }
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-high-cpu-alarm"
    Environment = var.environment
  }
}

# CloudWatch 알람 - 높은 메모리 사용률
resource "aws_cloudwatch_metric_alarm" "high_memory" {
  count = local.deploy_aws ? 1 : 0
  
  alarm_name          = "${var.project_name}-${var.environment}-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "CWAgent"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors memory utilization"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  
  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.app[0].name
  }
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-high-memory-alarm"
    Environment = var.environment
  }
}

# CloudWatch 알람 - ALB 응답 시간
resource "aws_cloudwatch_metric_alarm" "high_response_time" {
  count = local.deploy_aws ? 1 : 0
  
  alarm_name          = "${var.project_name}-${var.environment}-high-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = "2"
  alarm_description   = "This metric monitors ALB response time"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  
  dimensions = {
    LoadBalancer = aws_lb.main[0].arn_suffix
  }
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-high-response-time-alarm"
    Environment = var.environment
  }
}

# CloudWatch 알람 - HTTP 5xx 에러
resource "aws_cloudwatch_metric_alarm" "http_5xx_errors" {
  count = local.deploy_aws ? 1 : 0
  
  alarm_name          = "${var.project_name}-${var.environment}-http-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors 5xx errors"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  treat_missing_data  = "notBreaching"
  
  dimensions = {
    LoadBalancer = aws_lb.main[0].arn_suffix
  }
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-5xx-errors-alarm"
    Environment = var.environment
  }
}

# CloudWatch 알람 - RDS CPU 사용률
resource "aws_cloudwatch_metric_alarm" "rds_high_cpu" {
  count = local.deploy_aws ? 1 : 0
  
  alarm_name          = "${var.project_name}-${var.environment}-rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "70"
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main[0].id
  }
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-rds-high-cpu-alarm"
    Environment = var.environment
  }
}

# CloudWatch 알람 - RDS 연결 수
resource "aws_cloudwatch_metric_alarm" "rds_high_connections" {
  count = local.deploy_aws ? 1 : 0
  
  alarm_name          = "${var.project_name}-${var.environment}-rds-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "40"
  alarm_description   = "This metric monitors RDS connection count"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main[0].id
  }
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-rds-high-connections-alarm"
    Environment = var.environment
  }
}

# CloudWatch 알람 - Redis 높은 CPU
resource "aws_cloudwatch_metric_alarm" "redis_high_cpu" {
  count = local.deploy_aws ? 1 : 0
  
  alarm_name          = "${var.project_name}-${var.environment}-redis-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "70"
  alarm_description   = "This metric monitors Redis CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  
  dimensions = {
    CacheClusterId = aws_elasticache_cluster.redis[0].cluster_id
  }
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-redis-high-cpu-alarm"
    Environment = var.environment
  }
}

# Auto Scaling 정책 - Scale Up
resource "aws_autoscaling_policy" "scale_up" {
  count = local.deploy_aws ? 1 : 0
  
  name                   = "${var.project_name}-${var.environment}-scale-up"
  scaling_adjustment     = 1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.app[0].name
}

# Auto Scaling 정책 - Scale Down
resource "aws_autoscaling_policy" "scale_down" {
  count = local.deploy_aws ? 1 : 0
  
  name                   = "${var.project_name}-${var.environment}-scale-down"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.app[0].name
}

# CloudWatch 알람 - Scale Up 트리거
resource "aws_cloudwatch_metric_alarm" "cpu_alarm_high" {
  count = local.deploy_aws ? 1 : 0
  
  alarm_name          = "${var.project_name}-${var.environment}-cpu-alarm-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "70"
  alarm_description   = "This metric monitors ec2 cpu utilization for scaling up"
  alarm_actions       = [aws_autoscaling_policy.scale_up[0].arn]
  
  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.app[0].name
  }
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-cpu-alarm-high"
    Environment = var.environment
  }
}

# CloudWatch 알람 - Scale Down 트리거
resource "aws_cloudwatch_metric_alarm" "cpu_alarm_low" {
  count = local.deploy_aws ? 1 : 0
  
  alarm_name          = "${var.project_name}-${var.environment}-cpu-alarm-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "25"
  alarm_description   = "This metric monitors ec2 cpu utilization for scaling down"
  alarm_actions       = [aws_autoscaling_policy.scale_down[0].arn]
  
  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.app[0].name
  }
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-cpu-alarm-low"
    Environment = var.environment
  }
} 