#!/bin/bash

# EC2 인스턴스 초기화 스크립트
# 배달 플랫폼 애플리케이션 자동 배포

set -e

# 환경 변수 설정
ENVIRONMENT="${environment}"
LOG_FILE="/var/log/user-data.log"

# 로그 함수
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

log "=== 배달 플랫폼 EC2 인스턴스 초기화 시작 ==="
log "환경: $ENVIRONMENT"

# 시스템 업데이트
log "시스템 업데이트 중..."
apt-get update -y
apt-get upgrade -y

# 필수 패키지 설치
log "필수 패키지 설치 중..."
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    software-properties-common \
    wget \
    unzip \
    htop \
    tree \
    vim \
    git \
    awscli

# Docker 설치
log "Docker 설치 중..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io

# Docker Compose 설치
log "Docker Compose 설치 중..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Docker 서비스 시작 및 자동 시작 설정
log "Docker 서비스 설정 중..."
systemctl start docker
systemctl enable docker
usermod -aG docker ubuntu

# Node.js 설치 (버전 관리를 위해 NodeSource 사용)
log "Node.js 설치 중..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Yarn 설치
log "Yarn 설치 중..."
npm install -g yarn

# 애플리케이션 디렉토리 생성
log "애플리케이션 디렉토리 설정 중..."
mkdir -p /opt/delivery-platform
cd /opt/delivery-platform

# 환경별 설정
if [ "$ENVIRONMENT" = "production" ]; then
    log "프로덕션 환경 설정 적용 중..."
    # 프로덕션 환경 설정
    echo "NODE_ENV=production" > .env
    echo "LOG_LEVEL=info" >> .env
elif [ "$ENVIRONMENT" = "staging" ]; then
    log "스테이징 환경 설정 적용 중..."
    # 스테이징 환경 설정
    echo "NODE_ENV=staging" > .env
    echo "LOG_LEVEL=debug" >> .env
else
    log "개발 환경 설정 적용 중..."
    # 개발 환경 설정
    echo "NODE_ENV=development" > .env
    echo "LOG_LEVEL=debug" >> .env
fi

# AWS 메타데이터에서 정보 가져오기
log "AWS 메타데이터 수집 중..."
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
INSTANCE_TYPE=$(curl -s http://169.254.169.254/latest/meta-data/instance-type)
AVAILABILITY_ZONE=$(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone)
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

log "인스턴스 정보:"
log "  - ID: $INSTANCE_ID"
log "  - Type: $INSTANCE_TYPE"
log "  - AZ: $AVAILABILITY_ZONE"
log "  - Public IP: $PUBLIC_IP"

# 환경 변수에 AWS 정보 추가
echo "INSTANCE_ID=$INSTANCE_ID" >> .env
echo "INSTANCE_TYPE=$INSTANCE_TYPE" >> .env
echo "AVAILABILITY_ZONE=$AVAILABILITY_ZONE" >> .env
echo "PUBLIC_IP=$PUBLIC_IP" >> .env

# CloudWatch 에이전트 설치
log "CloudWatch 에이전트 설치 중..."
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i amazon-cloudwatch-agent.deb

# CloudWatch 에이전트 설정
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
{
    "agent": {
        "metrics_collection_interval": 60,
        "run_as_user": "cwagent"
    },
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/log/user-data.log",
                        "log_group_name": "delivery-platform-user-data",
                        "log_stream_name": "{instance_id}",
                        "timestamp_format": "%Y-%m-%d %H:%M:%S"
                    },
                    {
                        "file_path": "/opt/delivery-platform/logs/app.log",
                        "log_group_name": "delivery-platform-app",
                        "log_stream_name": "{instance_id}",
                        "timestamp_format": "%Y-%m-%d %H:%M:%S"
                    }
                ]
            }
        }
    },
    "metrics": {
        "namespace": "DeliveryPlatform/EC2",
        "metrics_collected": {
            "cpu": {
                "measurement": [
                    "cpu_usage_idle",
                    "cpu_usage_iowait",
                    "cpu_usage_user",
                    "cpu_usage_system"
                ],
                "metrics_collection_interval": 60
            },
            "disk": {
                "measurement": [
                    "used_percent"
                ],
                "metrics_collection_interval": 60,
                "resources": [
                    "*"
                ]
            },
            "mem": {
                "measurement": [
                    "mem_used_percent"
                ],
                "metrics_collection_interval": 60
            }
        }
    }
}
EOF

# CloudWatch 에이전트 시작
log "CloudWatch 에이전트 시작 중..."
systemctl enable amazon-cloudwatch-agent
systemctl start amazon-cloudwatch-agent

# 헬스체크 엔드포인트 설정
log "헬스체크 서비스 설정 중..."
cat > /opt/delivery-platform/healthcheck.js << 'EOF'
const http = require('http');

const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        }));
    } else {
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('Not Found');
    }
});

const PORT = process.env.HEALTH_CHECK_PORT || 3000;
server.listen(PORT, () => {
    console.log(`Health check server running on port ${PORT}`);
});
EOF

# systemd 서비스 파일 생성
cat > /etc/systemd/system/delivery-platform-health.service << 'EOF'
[Unit]
Description=Delivery Platform Health Check
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/delivery-platform
ExecStart=/usr/bin/node healthcheck.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# 권한 설정
chown -R ubuntu:ubuntu /opt/delivery-platform

# 헬스체크 서비스 시작
log "헬스체크 서비스 시작 중..."
systemctl daemon-reload
systemctl enable delivery-platform-health
systemctl start delivery-platform-health

# 로그 디렉토리 생성
mkdir -p /opt/delivery-platform/logs
chown -R ubuntu:ubuntu /opt/delivery-platform/logs

# 방화벽 설정 (UFW)
log "방화벽 설정 중..."
ufw --force enable
ufw allow ssh
ufw allow 3000/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# 시스템 성능 최적화
log "시스템 성능 최적화 설정 중..."
echo 'vm.swappiness=10' >> /etc/sysctl.conf
echo 'net.core.rmem_max=134217728' >> /etc/sysctl.conf
echo 'net.core.wmem_max=134217728' >> /etc/sysctl.conf
sysctl -p

# 로그 로테이션 설정
cat > /etc/logrotate.d/delivery-platform << 'EOF'
/opt/delivery-platform/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        systemctl reload delivery-platform-health > /dev/null 2>&1 || true
    endscript
}
EOF

# 사용자에게 Docker 권한 부여를 위한 재로그인 없이 적용
newgrp docker

# 시스템 정보 수집
log "시스템 정보 수집 중..."
{
    echo "=== 시스템 정보 ==="
    echo "OS: $(lsb_release -d | cut -f2)"
    echo "Kernel: $(uname -r)"
    echo "CPU: $(nproc) cores"
    echo "Memory: $(free -h | grep Mem | awk '{print $2}')"
    echo "Disk: $(df -h / | tail -1 | awk '{print $2}')"
    echo ""
    echo "=== 설치된 소프트웨어 버전 ==="
    echo "Docker: $(docker --version)"
    echo "Docker Compose: $(docker-compose --version)"
    echo "Node.js: $(node --version)"
    echo "Yarn: $(yarn --version)"
    echo "AWS CLI: $(aws --version)"
} | tee -a $LOG_FILE

# 완료 상태 체크
log "=== 서비스 상태 확인 ==="
systemctl status docker | grep "Active:" | tee -a $LOG_FILE
systemctl status delivery-platform-health | grep "Active:" | tee -a $LOG_FILE
systemctl status amazon-cloudwatch-agent | grep "Active:" | tee -a $LOG_FILE

log "=== 배달 플랫폼 EC2 인스턴스 초기화 완료 ==="
log "헬스체크 URL: http://$PUBLIC_IP:3000/health"

# 완료 신호
touch /opt/delivery-platform/.init-complete
echo "$(date '+%Y-%m-%d %H:%M:%S')" > /opt/delivery-platform/.init-timestamp 