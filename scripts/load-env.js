#!/usr/bin/env node

/**
 * 환경별 설정 로드 스크립트
 * 개발, 스테이징, 프로덕션 환경에 맞는 .env 파일을 로드합니다.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 색상 출력을 위한 ANSI 코드
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * 색상이 적용된 로그 출력
 */
function colorLog(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * 환경 설정 파일 존재 여부 확인
 */
function checkEnvFile(filename) {
  const filePath = path.resolve(process.cwd(), filename);
  return fs.existsSync(filePath);
}

/**
 * 환경 설정 파일 로드
 */
function loadEnvFile(filename) {
  const filePath = path.resolve(process.cwd(), filename);
  
  if (fs.existsSync(filePath)) {
    const result = dotenv.config({ path: filePath });
    if (result.error) {
      colorLog(`❌ 환경 파일 로드 실패: ${filename}`, colors.red);
      colorLog(`   오류: ${result.error.message}`, colors.red);
      return false;
    } else {
      colorLog(`✅ 환경 파일 로드 성공: ${filename}`, colors.green);
      return true;
    }
  } else {
    colorLog(`⚠️  환경 파일 없음: ${filename}`, colors.yellow);
    return false;
  }
}

/**
 * 필수 환경 변수 검증
 */
function validateRequiredVariables(environment) {
  const baseRequired = [
    'NODE_ENV',
    'API_PORT',
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET'
  ];

  const developmentRequired = [...baseRequired];
  
  const stagingRequired = [
    ...baseRequired,
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'REDIS_URL'
  ];

  const productionRequired = [
    ...baseRequired,
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'REDIS_URL',
    'REDIS_PASSWORD',
    'NEXTAUTH_SECRET',
    'ENCRYPTION_KEY'
  ];

  let requiredVars;
  switch (environment) {
    case 'production':
      requiredVars = productionRequired;
      break;
    case 'staging':
      requiredVars = stagingRequired;
      break;
    case 'development':
    default:
      requiredVars = developmentRequired;
      break;
  }

  const missingVars = [];
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    colorLog(`❌ 필수 환경 변수가 누락되었습니다:`, colors.red);
    missingVars.forEach(varName => {
      colorLog(`   - ${varName}`, colors.red);
    });
    return false;
  }

  colorLog(`✅ 모든 필수 환경 변수 검증 완료`, colors.green);
  return true;
}

/**
 * 보안 설정 검증 (프로덕션 환경)
 */
function validateSecuritySettings() {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  const securityChecks = [
    { 
      key: 'JWT_SECRET', 
      insecureValues: [
        'dev-jwt-secret-not-for-production', 
        'your-super-secret-jwt-key-change-this-in-production'
      ] 
    },
    { 
      key: 'JWT_REFRESH_SECRET', 
      insecureValues: [
        'dev-refresh-secret-not-for-production', 
        'your-super-secret-refresh-key-change-this-in-production'
      ] 
    },
    { 
      key: 'NEXTAUTH_SECRET', 
      insecureValues: [
        'dev-nextauth-secret', 
        'your-nextauth-secret-change-this-in-production'
      ] 
    },
    { 
      key: 'DATABASE_URL', 
      insecureValues: [
        'postgresql://postgres:devpassword@localhost:5433/delivery_platform_dev'
      ] 
    }
  ];

  const insecureSettings = [];

  for (const check of securityChecks) {
    const value = process.env[check.key];
    if (value && check.insecureValues.includes(value)) {
      insecureSettings.push(check.key);
    }
  }

  if (insecureSettings.length > 0) {
    colorLog(`❌ 프로덕션 환경에서 안전하지 않은 기본값이 감지되었습니다:`, colors.red);
    insecureSettings.forEach(key => {
      colorLog(`   - ${key}`, colors.red);
    });
    return false;
  }

  colorLog(`✅ 보안 설정 검증 완료`, colors.green);
  return true;
}

/**
 * 환경 정보 출력
 */
function displayEnvironmentInfo() {
  const env = process.env.NODE_ENV || 'development';
  const port = process.env.API_PORT || '3000';
  const dbConnected = !!process.env.DATABASE_URL;
  const redisConnected = !!process.env.REDIS_URL;

  colorLog('\n=== 환경 설정 정보 ===', colors.cyan);
  colorLog(`환경: ${env}`, colors.bright);
  colorLog(`포트: ${port}`, colors.bright);
  colorLog(`데이터베이스 연결: ${dbConnected ? '설정됨' : '미설정'}`, dbConnected ? colors.green : colors.yellow);
  colorLog(`Redis 연결: ${redisConnected ? '설정됨' : '미설정'}`, redisConnected ? colors.green : colors.yellow);
  colorLog(`디버그 모드: ${process.env.DEBUG === 'true' ? '활성화' : '비활성화'}`, colors.bright);
  colorLog(`인증 비활성화: ${process.env.DISABLE_AUTH === 'true' ? '예' : '아니오'}`, colors.bright);
  colorLog('=====================\n', colors.cyan);
}

/**
 * 메인 실행 함수
 */
function main() {
  const args = process.argv.slice(2);
  const environment = args[0] || process.env.NODE_ENV || 'development';

  colorLog(`\n🚀 환경 설정 로드 시작: ${environment}`, colors.blue);
  colorLog('=' .repeat(50), colors.blue);

  // 환경 변수 설정
  process.env.NODE_ENV = environment;

  let loadSuccess = true;

  // 1. 기본 .env 파일 로드
  colorLog('\n📁 환경 파일 로드:', colors.magenta);
  loadEnvFile('.env');

  // 2. 환경별 .env 파일 로드
  const envFile = `.env.${environment}`;
  if (checkEnvFile(envFile)) {
    loadEnvFile(envFile);
  } else {
    colorLog(`⚠️  환경별 설정 파일이 없습니다: ${envFile}`, colors.yellow);
    colorLog(`   예제 파일을 참고하여 생성하세요: ${envFile}.example`, colors.yellow);
  }

  // 3. 로컬 오버라이드 파일 로드
  loadEnvFile('.env.local');

  // 4. 필수 환경 변수 검증
  colorLog('\n🔍 환경 변수 검증:', colors.magenta);
  if (!validateRequiredVariables(environment)) {
    loadSuccess = false;
  }

  // 5. 보안 설정 검증 (프로덕션만)
  if (environment === 'production') {
    colorLog('\n🔒 보안 설정 검증:', colors.magenta);
    if (!validateSecuritySettings()) {
      loadSuccess = false;
    }
  }

  // 6. 환경 정보 출력
  if (loadSuccess) {
    displayEnvironmentInfo();
    colorLog('✅ 환경 설정 로드 완료!', colors.green);
  } else {
    colorLog('\n❌ 환경 설정 로드 실패!', colors.red);
    colorLog('위의 오류를 수정한 후 다시 시도하세요.', colors.red);
    process.exit(1);
  }
}

// 스크립트가 직접 실행될 때만 main 함수 호출
if (require.main === module) {
  main();
}

module.exports = {
  loadEnvFile,
  validateRequiredVariables,
  validateSecuritySettings,
  displayEnvironmentInfo
}; 