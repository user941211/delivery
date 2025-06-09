#!/usr/bin/env node

/**
 * 환경 설정 유틸리티 테스트 스크립트
 * TypeScript 컴파일 없이 환경 설정 기능을 테스트합니다.
 */

const fs = require('fs');
const path = require('path');

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

function colorLog(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * 환경 설정 파일들이 올바르게 생성되었는지 확인
 */
function testEnvironmentFiles() {
  colorLog('\n🔍 환경 설정 파일 검증 테스트', colors.blue);
  colorLog('=' .repeat(50), colors.blue);

  const requiredFiles = [
    'env.example',
    'env.development.example',
    'env.staging.example',
    'env.production.example'
  ];

  const actualFiles = [
    '.env.development'
  ];

  let allFilesExist = true;

  // 예제 파일 확인
  colorLog('\n📁 예제 파일 확인:', colors.magenta);
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      colorLog(`✅ ${file} - 존재함`, colors.green);
    } else {
      colorLog(`❌ ${file} - 없음`, colors.red);
      allFilesExist = false;
    }
  }

  // 실제 환경 파일 확인
  colorLog('\n📁 실제 환경 파일 확인:', colors.magenta);
  for (const file of actualFiles) {
    if (fs.existsSync(file)) {
      colorLog(`✅ ${file} - 존재함`, colors.green);
    } else {
      colorLog(`❌ ${file} - 없음`, colors.red);
      allFilesExist = false;
    }
  }

  return allFilesExist;
}

/**
 * 환경 설정 파일 내용 검증
 */
function testEnvironmentFileContents() {
  colorLog('\n📄 환경 설정 파일 내용 검증', colors.blue);
  colorLog('=' .repeat(50), colors.blue);

  const testFiles = [
    { file: 'env.development.example', env: 'development' },
    { file: 'env.staging.example', env: 'staging' },
    { file: 'env.production.example', env: 'production' }
  ];

  let allContentsValid = true;

  for (const { file, env } of testFiles) {
    colorLog(`\n🔍 ${file} 검증:`, colors.magenta);
    
    if (!fs.existsSync(file)) {
      colorLog(`❌ 파일이 존재하지 않음`, colors.red);
      allContentsValid = false;
      continue;
    }

    const content = fs.readFileSync(file, 'utf8');
    
    // 필수 환경 변수 확인
    const requiredVars = [
      'NODE_ENV',
      'API_PORT',
      'DATABASE_URL',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET'
    ];

    const missingVars = [];
    for (const varName of requiredVars) {
      if (!content.includes(varName)) {
        missingVars.push(varName);
      }
    }

    if (missingVars.length === 0) {
      colorLog(`✅ 모든 필수 환경 변수 포함됨`, colors.green);
    } else {
      colorLog(`❌ 누락된 환경 변수: ${missingVars.join(', ')}`, colors.red);
      allContentsValid = false;
    }

    // 환경별 특정 설정 확인
    if (env === 'development') {
      if (content.includes('DEBUG=true')) {
        colorLog(`✅ 개발 환경 디버그 모드 설정됨`, colors.green);
      } else {
        colorLog(`⚠️  개발 환경 디버그 모드 미설정`, colors.yellow);
      }
    }

    if (env === 'production') {
      if (content.includes('DEBUG=false')) {
        colorLog(`✅ 프로덕션 환경 디버그 모드 비활성화됨`, colors.green);
      } else {
        colorLog(`⚠️  프로덕션 환경 디버그 모드 설정 확인 필요`, colors.yellow);
      }
    }
  }

  return allContentsValid;
}

/**
 * 환경 설정 로드 스크립트 테스트
 */
function testEnvironmentLoadScript() {
  colorLog('\n🚀 환경 설정 로드 스크립트 테스트', colors.blue);
  colorLog('=' .repeat(50), colors.blue);

  const scriptPath = 'scripts/load-env.js';
  
  if (!fs.existsSync(scriptPath)) {
    colorLog(`❌ 로드 스크립트가 존재하지 않음: ${scriptPath}`, colors.red);
    return false;
  }

  colorLog(`✅ 로드 스크립트 존재함: ${scriptPath}`, colors.green);

  // 스크립트 실행 권한 확인
  try {
    const stats = fs.statSync(scriptPath);
    const isExecutable = !!(stats.mode & parseInt('111', 8));
    
    if (isExecutable) {
      colorLog(`✅ 스크립트 실행 권한 있음`, colors.green);
    } else {
      colorLog(`⚠️  스크립트 실행 권한 없음 (chmod +x 필요)`, colors.yellow);
    }
  } catch (error) {
    colorLog(`❌ 스크립트 권한 확인 실패: ${error instanceof Error ? error.message : error}`, colors.red);
  }

  return true;
}

/**
 * 환경 설정 유틸리티 파일 테스트
 */
function testEnvironmentUtilFile() {
  colorLog('\n🛠️  환경 설정 유틸리티 파일 테스트', colors.blue);
  colorLog('=' .repeat(50), colors.blue);

  const utilPath = 'apps/api/src/common/utils/env-config.util.ts';
  
  if (!fs.existsSync(utilPath)) {
    colorLog(`❌ 유틸리티 파일이 존재하지 않음: ${utilPath}`, colors.red);
    return false;
  }

  colorLog(`✅ 유틸리티 파일 존재함: ${utilPath}`, colors.green);

  const content = fs.readFileSync(utilPath, 'utf8');
  
  // 주요 메서드 확인
  const requiredMethods = [
    'loadEnvironmentConfig',
    'validateRequiredVariables',
    'validateSecuritySettings',
    'logEnvironmentInfo',
    'get',
    'getNumber',
    'getBoolean',
    'getArray',
    'isDevelopment',
    'isStaging',
    'isProduction'
  ];

  const missingMethods = [];
  for (const method of requiredMethods) {
    if (!content.includes(method)) {
      missingMethods.push(method);
    }
  }

  if (missingMethods.length === 0) {
    colorLog(`✅ 모든 필수 메서드 포함됨`, colors.green);
  } else {
    colorLog(`❌ 누락된 메서드: ${missingMethods.join(', ')}`, colors.red);
    return false;
  }

  return true;
}

/**
 * 문서 파일 테스트
 */
function testDocumentationFile() {
  colorLog('\n📚 문서 파일 테스트', colors.blue);
  colorLog('=' .repeat(50), colors.blue);

  const docPath = 'docs/environment-setup.md';
  
  if (!fs.existsSync(docPath)) {
    colorLog(`❌ 문서 파일이 존재하지 않음: ${docPath}`, colors.red);
    return false;
  }

  colorLog(`✅ 문서 파일 존재함: ${docPath}`, colors.green);

  const content = fs.readFileSync(docPath, 'utf8');
  
  // 주요 섹션 확인
  const requiredSections = [
    '환경 구분',
    '환경 파일 구조',
    '설정 방법',
    '환경 변수 검증',
    '보안 고려사항',
    '트러블슈팅'
  ];

  const missingSections = [];
  for (const section of requiredSections) {
    if (!content.includes(section)) {
      missingSections.push(section);
    }
  }

  if (missingSections.length === 0) {
    colorLog(`✅ 모든 필수 섹션 포함됨`, colors.green);
  } else {
    colorLog(`❌ 누락된 섹션: ${missingSections.join(', ')}`, colors.red);
    return false;
  }

  return true;
}

/**
 * 메인 테스트 실행
 */
function runTests() {
  colorLog('\n🧪 환경 설정 관리 기능 테스트 시작', colors.cyan);
  colorLog('=' .repeat(60), colors.cyan);

  const tests = [
    { name: '환경 설정 파일 존재 확인', fn: testEnvironmentFiles },
    { name: '환경 설정 파일 내용 검증', fn: testEnvironmentFileContents },
    { name: '환경 설정 로드 스크립트 테스트', fn: testEnvironmentLoadScript },
    { name: '환경 설정 유틸리티 파일 테스트', fn: testEnvironmentUtilFile },
    { name: '문서 파일 테스트', fn: testDocumentationFile }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    try {
      const result = test.fn();
      if (result) {
        passedTests++;
        colorLog(`\n✅ ${test.name} - 통과`, colors.green);
      } else {
        colorLog(`\n❌ ${test.name} - 실패`, colors.red);
      }
    } catch (error) {
      colorLog(`\n💥 ${test.name} - 오류: ${error instanceof Error ? error.message : error}`, colors.red);
    }
  }

  // 최종 결과
  colorLog('\n' + '=' .repeat(60), colors.cyan);
  colorLog(`🏁 테스트 완료: ${passedTests}/${totalTests} 통과`, 
    passedTests === totalTests ? colors.green : colors.yellow);

  if (passedTests === totalTests) {
    colorLog('🎉 모든 테스트가 성공적으로 완료되었습니다!', colors.green);
    colorLog('\n📋 다음 단계:', colors.cyan);
    colorLog('1. 실제 환경 변수 값으로 .env 파일들을 설정하세요', colors.bright);
    colorLog('2. node scripts/load-env.js development 명령으로 환경 설정을 테스트하세요', colors.bright);
    colorLog('3. API 서버를 시작하여 환경 설정이 올바르게 로드되는지 확인하세요', colors.bright);
  } else {
    colorLog('\n⚠️  일부 테스트가 실패했습니다. 위의 오류를 확인하고 수정하세요.', colors.yellow);
  }

  return passedTests === totalTests;
}

// 스크립트가 직접 실행될 때만 테스트 실행
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = {
  runTests,
  testEnvironmentFiles,
  testEnvironmentFileContents,
  testEnvironmentLoadScript,
  testEnvironmentUtilFile,
  testDocumentationFile
}; 