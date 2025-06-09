# AWS 인프라 설정

# VPC 생성
resource "aws_vpc" "main" {
  count = local.deploy_aws ? 1 : 0
  
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name = "${var.project_name}-${var.environment}-vpc"
  }
}

# 인터넷 게이트웨이
resource "aws_internet_gateway" "main" {
  count = local.deploy_aws ? 1 : 0
  
  vpc_id = aws_vpc.main[0].id
  
  tags = {
    Name = "${var.project_name}-${var.environment}-igw"
  }
}

# 퍼블릭 서브넷
resource "aws_subnet" "public" {
  count = local.deploy_aws ? length(var.public_subnet_cidrs) : 0
  
  vpc_id                  = aws_vpc.main[0].id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.aws_availability_zones[count.index]
  map_public_ip_on_launch = true
  
  tags = {
    Name = "${var.project_name}-${var.environment}-public-subnet-${count.index + 1}"
    Type = "Public"
  }
}

# 프라이빗 서브넷
resource "aws_subnet" "private" {
  count = local.deploy_aws ? length(var.private_subnet_cidrs) : 0
  
  vpc_id            = aws_vpc.main[0].id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.aws_availability_zones[count.index]
  
  tags = {
    Name = "${var.project_name}-${var.environment}-private-subnet-${count.index + 1}"
    Type = "Private"
  }
}

# 데이터베이스 서브넷
resource "aws_subnet" "database" {
  count = local.deploy_aws ? length(var.database_subnet_cidrs) : 0
  
  vpc_id            = aws_vpc.main[0].id
  cidr_block        = var.database_subnet_cidrs[count.index]
  availability_zone = var.aws_availability_zones[count.index]
  
  tags = {
    Name = "${var.project_name}-${var.environment}-database-subnet-${count.index + 1}"
    Type = "Database"
  }
}

# NAT 게이트웨이용 EIP
resource "aws_eip" "nat" {
  count = local.deploy_aws ? length(var.public_subnet_cidrs) : 0
  
  domain = "vpc"
  
  tags = {
    Name = "${var.project_name}-${var.environment}-nat-eip-${count.index + 1}"
  }
  
  depends_on = [aws_internet_gateway.main]
}

# NAT 게이트웨이
resource "aws_nat_gateway" "main" {
  count = local.deploy_aws ? length(var.public_subnet_cidrs) : 0
  
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  
  tags = {
    Name = "${var.project_name}-${var.environment}-nat-gateway-${count.index + 1}"
  }
  
  depends_on = [aws_internet_gateway.main]
}

# 퍼블릭 라우팅 테이블
resource "aws_route_table" "public" {
  count = local.deploy_aws ? 1 : 0
  
  vpc_id = aws_vpc.main[0].id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main[0].id
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-public-rt"
  }
}

# 프라이빗 라우팅 테이블
resource "aws_route_table" "private" {
  count = local.deploy_aws ? length(var.private_subnet_cidrs) : 0
  
  vpc_id = aws_vpc.main[0].id
  
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-private-rt-${count.index + 1}"
  }
}

# 퍼블릭 서브넷 라우팅 테이블 연결
resource "aws_route_table_association" "public" {
  count = local.deploy_aws ? length(var.public_subnet_cidrs) : 0
  
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public[0].id
}

# 프라이빗 서브넷 라우팅 테이블 연결
resource "aws_route_table_association" "private" {
  count = local.deploy_aws ? length(var.private_subnet_cidrs) : 0
  
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# 데이터베이스 서브넷 그룹
resource "aws_db_subnet_group" "main" {
  count = local.deploy_aws ? 1 : 0
  
  name       = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = aws_subnet.database[*].id
  
  tags = {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  }
}

# 보안 그룹 - 로드 밸런서
resource "aws_security_group" "alb" {
  count = local.deploy_aws ? 1 : 0
  
  name_prefix = "${var.project_name}-${var.environment}-alb-"
  vpc_id      = aws_vpc.main[0].id
  
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-alb-sg"
  }
}

# 보안 그룹 - 애플리케이션 서버
resource "aws_security_group" "app" {
  count = local.deploy_aws ? 1 : 0
  
  name_prefix = "${var.project_name}-${var.environment}-app-"
  vpc_id      = aws_vpc.main[0].id
  
  ingress {
    description     = "HTTP from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb[0].id]
  }
  
  ingress {
    description     = "SSH"
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    cidr_blocks     = [var.vpc_cidr]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-app-sg"
  }
}

# 보안 그룹 - 데이터베이스
resource "aws_security_group" "database" {
  count = local.deploy_aws ? 1 : 0
  
  name_prefix = "${var.project_name}-${var.environment}-db-"
  vpc_id      = aws_vpc.main[0].id
  
  ingress {
    description     = "PostgreSQL from App"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app[0].id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-db-sg"
  }
}

# 보안 그룹 - Redis
resource "aws_security_group" "redis" {
  count = local.deploy_aws ? 1 : 0
  
  name_prefix = "${var.project_name}-${var.environment}-redis-"
  vpc_id      = aws_vpc.main[0].id
  
  ingress {
    description     = "Redis from App"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app[0].id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-redis-sg"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  count = local.deploy_aws ? 1 : 0
  
  name               = "${var.project_name}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb[0].id]
  subnets            = aws_subnet.public[*].id
  
  enable_deletion_protection = var.environment == "production"
  
  tags = {
    Name = "${var.project_name}-${var.environment}-alb"
  }
}

# Target Group
resource "aws_lb_target_group" "app" {
  count = local.deploy_aws ? 1 : 0
  
  name     = "${var.project_name}-${var.environment}-app-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main[0].id
  
  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-app-tg"
  }
}

# ALB Listener
resource "aws_lb_listener" "app" {
  count = local.deploy_aws ? 1 : 0
  
  load_balancer_arn = aws_lb.main[0].arn
  port              = "80"
  protocol          = "HTTP"
  
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app[0].arn
  }
}

# Launch Template
resource "aws_launch_template" "app" {
  count = local.deploy_aws ? 1 : 0
  
  name_prefix   = "${var.project_name}-${var.environment}-app-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = var.aws_instance_type
  
  vpc_security_group_ids = [aws_security_group.app[0].id]
  
  user_data = base64encode(templatefile("${path.module}/user-data.sh", {
    environment = var.environment
  }))
  
  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "${var.project_name}-${var.environment}-app-instance"
    }
  }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "app" {
  count = local.deploy_aws ? 1 : 0
  
  name                = "${var.project_name}-${var.environment}-app-asg"
  vpc_zone_identifier = aws_subnet.private[*].id
  target_group_arns   = [aws_lb_target_group.app[0].arn]
  health_check_type   = "ELB"
  
  min_size         = var.aws_min_capacity
  max_size         = var.aws_max_capacity
  desired_capacity = var.aws_desired_capacity
  
  launch_template {
    id      = aws_launch_template.app[0].id
    version = "$Latest"
  }
  
  tag {
    key                 = "Name"
    value               = "${var.project_name}-${var.environment}-app-asg"
    propagate_at_launch = false
  }
}

# RDS 인스턴스
resource "aws_db_instance" "main" {
  count = local.deploy_aws ? 1 : 0
  
  identifier = "${var.project_name}-${var.environment}-db"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.db_instance_class
  
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_encrypted     = true
  
  db_name  = "delivery_platform"
  username = "dbadmin"
  password = random_password.db_password.result
  
  vpc_security_group_ids = [aws_security_group.database[0].id]
  db_subnet_group_name   = aws_db_subnet_group.main[0].name
  
  backup_retention_period = var.db_backup_retention_period
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = var.environment != "production"
  
  tags = {
    Name = "${var.project_name}-${var.environment}-db"
  }
}

# ElastiCache 서브넷 그룹
resource "aws_elasticache_subnet_group" "main" {
  count = local.deploy_aws ? 1 : 0
  
  name       = "${var.project_name}-${var.environment}-cache-subnet-group"
  subnet_ids = aws_subnet.private[*].id
}

# ElastiCache Redis 클러스터
resource "aws_elasticache_cluster" "redis" {
  count = local.deploy_aws ? 1 : 0
  
  cluster_id           = "${var.project_name}-${var.environment}-redis"
  engine               = "redis"
  node_type            = var.redis_node_type
  num_cache_nodes      = var.redis_num_cache_nodes
  parameter_group_name = "default.redis7"
  port                 = 6379
  
  subnet_group_name  = aws_elasticache_subnet_group.main[0].name
  security_group_ids = [aws_security_group.redis[0].id]
  
  tags = {
    Name = "${var.project_name}-${var.environment}-redis"
  }
}

# 랜덤 데이터베이스 비밀번호
resource "random_password" "db_password" {
  length  = 16
  special = true
}

# Ubuntu AMI 데이터 소스
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical
  
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"]
  }
  
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
} 