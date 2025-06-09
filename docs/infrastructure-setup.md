# 배달 플랫폼 클라우드 인프라 설정 가이드

본 문서는 배달 플랫폼의 클라우드 인프라 구성과 배포 방법을 설명합니다.

## 📋 목차

1. [개요](#개요)
2. [지원 클라우드 프로바이더](#지원-클라우드-프로바이더)
3. [사전 요구사항](#사전-요구사항)
4. [인프라 아키텍처](#인프라-아키텍처)
5. [배포 가이드](#배포-가이드)
6. [환경별 설정](#환경별-설정)
7. [모니터링 및 로깅](#모니터링-및-로깅)
8. [보안 설정](#보안-설정)
9. [문제 해결](#문제-해결)

## 📖 개요

배달 플랫폼은 Terraform을 사용하여 Infrastructure as Code (IaC) 방식으로 클라우드 인프라를 관리합니다. 다음과 같은 특징을 가집니다:

- **멀티 클라우드 지원**: AWS, GCP, Azure
- **환경별 분리**: Development, Staging, Production
- **자동 스케일링**: 트래픽에 따른 자동 확장/축소
- **고가용성**: 다중 가용 영역 배포
- **보안**: 네트워크 격리 및 암호화
- **모니터링**: CloudWatch, 로깅, 알림

## ☁️ 지원 클라우드 프로바이더

### AWS (Amazon Web Services)
- **주요 서비스**: EC2, RDS, ElastiCache, ALB, Auto Scaling
- **리전**: Asia Pacific (Seoul) - ap-northeast-2
- **권장 환경**: 모든 환경 (개발, 스테이징, 프로덕션)

### GCP (Google Cloud Platform)
- **주요 서비스**: Compute Engine, Cloud SQL, Memorystore, Load Balancer
- **리전**: Asia Northeast 3 (Seoul) - asia-northeast3
- **상태**: 구현 예정

### Azure (Microsoft Azure)
- **주요 서비스**: Virtual Machines, Azure Database, Redis Cache, Load Balancer
- **리전**: Korea Central
- **상태**: 구현 예정

## 🔧 사전 요구사항

### 필수 도구

1. **Terraform** (>= 1.0)
   ```bash
   # macOS
   brew install terraform
   
   # Ubuntu/Debian
   wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg
   echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
   sudo apt update && sudo apt install terraform
   ```

2. **AWS CLI** (AWS 사용 시)
   ```bash
   # macOS
   brew install awscli
   
   # Ubuntu/Debian
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   ```

3. **jq** (JSON 처리용)
   ```bash
   # macOS
   brew install jq
   
   # Ubuntu/Debian
   sudo apt install jq
   ```

### AWS 자격증명 설정

1. **AWS 계정 및 IAM 사용자 생성**
2. **필요한 권한**: EC2, RDS, ElastiCache, VPC, IAM, CloudWatch
3. **자격증명 설정**:
   ```bash
   aws configure
   # AWS Access Key ID: [YOUR_ACCESS_KEY]
   # AWS Secret Access Key: [YOUR_SECRET_KEY]
   # Default region name: ap-northeast-2
   # Default output format: json
   ```

## 🏗️ 인프라 아키텍처

### AWS 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Internet Gateway                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              Application Load Balancer                      │
│                  (Public Subnets)                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 Auto Scaling Group                          │
│              EC2 Instances (API Servers)                   │
│                 (Private Subnets)                          │
└─────────────┬───────────────────────┬───────────────────────┘
              │                       │
┌─────────────▼───────────────┐  ┌────▼──────────────────────┐
│         RDS PostgreSQL      │  │     ElastiCache Redis     │
│      (Database Subnets)     │  │    (Private Subnets)      │
└─────────────────────────────┘  └───────────────────────────┘
```

### 네트워크 구성

- **VPC**: 10.0.0.0/16
- **Public Subnets**: 10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24
- **Private Subnets**: 10.0.11.0/24, 10.0.12.0/24, 10.0.13.0/24
- **Database Subnets**: 10.0.21.0/24, 10.0.22.0/24, 10.0.23.0/24

### 보안 그룹

1. **ALB Security Group**: HTTP(80), HTTPS(443) 허용
2. **App Security Group**: ALB에서 3000 포트 허용
3. **Database Security Group**: App에서 5432 포트 허용
4. **Redis Security Group**: App에서 6379 포트 허용

## 🚀 배포 가이드

### 1. 저장소 클론 및 설정

```bash
git clone https://github.com/user941211/delivery.git
cd delivery
```

### 2. Terraform 변수 설정

```bash
# Terraform 변수 파일 복사 및 수정
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
vim terraform/terraform.tfvars
```

### 3. 배포 스크립트 실행 권한 부여

```bash
chmod +x scripts/deploy-infrastructure.sh
```

### 4. Terraform 초기화

```bash
./scripts/deploy-infrastructure.sh -e development init
```

### 5. 배포 계획 확인

```bash
./scripts/deploy-infrastructure.sh -e development plan
```

### 6. 인프라 배포

```bash
./scripts/deploy-infrastructure.sh -e development apply
```

### 7. 배포 결과 확인

```bash
./scripts/deploy-infrastructure.sh output
```

## 🏷️ 환경별 설정

### Development 환경

```bash
# terraform-development.tfvars
project_name = "delivery-platform"
environment = "development"
cloud_provider = "aws"

# 개발용 소형 인스턴스
aws_instance_type = "t3.small"
db_instance_class = "db.t3.micro"
redis_node_type = "cache.t3.micro"

# 최소한의 Auto Scaling
aws_min_capacity = 1
aws_max_capacity = 3
aws_desired_capacity = 1

# 짧은 백업 보존 기간
db_backup_retention_period = 3
log_retention_days = 7
```

### Staging 환경

```bash
# terraform-staging.tfvars
project_name = "delivery-platform"
environment = "staging"
cloud_provider = "aws"

# 중형 인스턴스
aws_instance_type = "t3.medium"
db_instance_class = "db.t3.small"
redis_node_type = "cache.t3.small"

# 적당한 Auto Scaling
aws_min_capacity = 2
aws_max_capacity = 5
aws_desired_capacity = 2

# 중간 백업 보존 기간
db_backup_retention_period = 7
log_retention_days = 14
```

### Production 환경

```bash
# terraform-production.tfvars
project_name = "delivery-platform"
environment = "production"
cloud_provider = "aws"

# 고성능 인스턴스
aws_instance_type = "t3.large"
db_instance_class = "db.r5.large"
redis_node_type = "cache.r5.large"

# 확장성 있는 Auto Scaling
aws_min_capacity = 3
aws_max_capacity = 20
aws_desired_capacity = 5

# 긴 백업 보존 기간
db_backup_retention_period = 30
log_retention_days = 90

# 삭제 방지
enable_deletion_protection = true
```

## 📊 모니터링 및 로깅

### CloudWatch 로그 그룹

- `delivery-platform-user-data`: EC2 초기화 로그
- `delivery-platform-app`: 애플리케이션 로그

### CloudWatch 메트릭

- **네임스페이스**: `DeliveryPlatform/EC2`
- **메트릭**: CPU 사용률, 메모리 사용률, 디스크 사용률

### 알림 설정

```bash
# CloudWatch 알람 예제
aws cloudwatch put-metric-alarm \
  --alarm-name "delivery-platform-high-cpu" \
  --alarm-description "High CPU usage" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

## 🔐 보안 설정

### 네트워크 보안

- **Private Subnets**: 애플리케이션 서버는 퍼블릭 인터넷에 직접 노출되지 않음
- **NAT Gateway**: 아웃바운드 인터넷 접속용
- **Security Groups**: 최소 권한 원칙 적용

### 데이터 보안

- **RDS 암호화**: 저장 시 암호화 활성화
- **EBS 암호화**: EC2 볼륨 암호화
- **전송 중 암호화**: HTTPS/TLS 사용

### 접근 제어

- **IAM 역할**: EC2 인스턴스용 최소 권한 역할
- **VPC 엔드포인트**: AWS 서비스 접근용
- **SSL/TLS**: 모든 외부 통신 암호화

## 🔄 자동화 및 CI/CD

### GitHub Actions 연동

```yaml
# .github/workflows/infrastructure.yml
name: Infrastructure Deployment

on:
  push:
    branches: [main]
    paths: ['terraform/**']

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: hashicorp/setup-terraform@v2
      - name: Terraform Plan
        run: ./scripts/deploy-infrastructure.sh -e staging plan
      - name: Terraform Apply
        run: ./scripts/deploy-infrastructure.sh -e staging apply --auto-approve
```

## 🛠️ 문제 해결

### 일반적인 문제들

1. **AWS 자격증명 오류**
   ```bash
   aws sts get-caller-identity
   aws configure list
   ```

2. **Terraform 상태 파일 충돌**
   ```bash
   terraform force-unlock LOCK_ID
   ```

3. **리소스 생성 실패**
   ```bash
   terraform refresh
   terraform plan
   ```

### 로그 확인

```bash
# EC2 인스턴스 로그
aws logs describe-log-groups --log-group-name-prefix delivery-platform

# 특정 로그 스트림 확인
aws logs get-log-events \
  --log-group-name delivery-platform-app \
  --log-stream-name i-1234567890abcdef0
```

### 리소스 정리

```bash
# 개발 환경 삭제
./scripts/deploy-infrastructure.sh -e development destroy

# 강제 삭제 (주의!)
./scripts/deploy-infrastructure.sh -e development destroy --auto-approve
```

## 📞 지원 및 문의

- **기술 문서**: [docs/](../docs/)
- **이슈 트래킹**: GitHub Issues
- **개발팀 연락처**: [팀 이메일]

## 📝 참고 자료

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html) 