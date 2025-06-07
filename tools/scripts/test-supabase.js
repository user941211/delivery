#!/usr/bin/env node

/**
 * Supabase 연결 테스트 스크립트
 * 
 * 이 스크립트는 다음을 테스트합니다:
 * 1. Supabase 클라이언트 연결
 * 2. 환경 변수 설정 확인
 * 3. 기본 API 호출
 * 4. 데이터베이스 테이블 접근
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// 색상 출력 함수
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 환경 변수 로드
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function testSupabaseConnection() {
  console.log('\n🧪 Supabase 연결 테스트 시작...\n');

  // 1. 환경 변수 확인
  colorLog('blue', '1️⃣ 환경 변수 확인 중...');
  
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];

  const optionalEnvVars = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_JWT_SECRET'
  ];

  let missingVars = [];
  
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    } else {
      colorLog('green', `   ✅ ${varName}: 설정됨`);
    }
  });

  optionalEnvVars.forEach(varName => {
    if (process.env[varName]) {
      colorLog('green', `   ✅ ${varName}: 설정됨`);
    } else {
      colorLog('yellow', `   ⚠️  ${varName}: 설정되지 않음 (선택사항)`);
    }
  });

  if (missingVars.length > 0) {
    colorLog('red', `\n❌ 필수 환경 변수가 설정되지 않았습니다:`);
    missingVars.forEach(varName => {
      colorLog('red', `   - ${varName}`);
    });
    colorLog('yellow', '\n💡 .env.local 파일을 확인하고 필수 환경 변수를 설정해주세요.');
    colorLog('cyan', '   가이드: docs/supabase-setup.md 참조');
    process.exit(1);
  }

  // 2. Supabase 클라이언트 생성
  colorLog('blue', '\n2️⃣ Supabase 클라이언트 생성 중...');
  
  let supabase;
  try {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    colorLog('green', '   ✅ 클라이언트 생성 성공');
  } catch (error) {
    colorLog('red', `   ❌ 클라이언트 생성 실패: ${error.message}`);
    process.exit(1);
  }

  // 3. 기본 연결 테스트
  colorLog('blue', '\n3️⃣ 기본 연결 테스트 중...');
  
  try {
    // 간단한 쿼리로 연결 테스트
    const { data, error } = await supabase
      .from('users')
      .select('count(*)', { count: 'exact', head: true });

    if (error) {
      if (error.code === 'PGRST116') {
        colorLog('yellow', '   ⚠️  users 테이블이 아직 생성되지 않았습니다.');
        colorLog('cyan', '   💡 docs/supabase-setup.md의 스키마 설정 단계를 진행해주세요.');
      } else {
        colorLog('red', `   ❌ 연결 실패: ${error.message}`);
        return false;
      }
    } else {
      colorLog('green', '   ✅ 데이터베이스 연결 성공');
      colorLog('green', `   📊 users 테이블 확인됨 (레코드 수: ${data || 0})`);
    }
  } catch (err) {
    colorLog('red', `   ❌ 연결 테스트 오류: ${err.message}`);
    return false;
  }

  // 4. 인증 상태 확인
  colorLog('blue', '\n4️⃣ 인증 시스템 테스트 중...');
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      colorLog('red', `   ❌ 인증 시스템 오류: ${error.message}`);
    } else {
      if (session) {
        colorLog('green', '   ✅ 현재 로그인된 사용자가 있습니다.');
        colorLog('cyan', `   👤 사용자 ID: ${session.user.id}`);
      } else {
        colorLog('green', '   ✅ 인증 시스템 정상 작동 (현재 로그인된 사용자 없음)');
      }
    }
  } catch (err) {
    colorLog('red', `   ❌ 인증 테스트 오류: ${err.message}`);
  }

  // 5. 프로젝트 정보 확인
  colorLog('blue', '\n5️⃣ 프로젝트 정보 확인 중...');
  
  const urlParts = process.env.NEXT_PUBLIC_SUPABASE_URL.split('.');
  const projectId = urlParts[0].split('//')[1];
  
  colorLog('cyan', `   🏗️  프로젝트 ID: ${projectId}`);
  colorLog('cyan', `   🌍 프로젝트 URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  
  // 6. 서비스 역할 키 테스트 (있는 경우)
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    colorLog('blue', '\n6️⃣ 서비스 역할 키 테스트 중...');
    
    try {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data, error } = await adminClient.auth.admin.listUsers();
      
      if (error) {
        colorLog('red', `   ❌ 서비스 키 테스트 실패: ${error.message}`);
      } else {
        colorLog('green', '   ✅ 서비스 역할 키 정상 작동');
        colorLog('cyan', `   👥 총 사용자 수: ${data.users.length}`);
      }
    } catch (err) {
      colorLog('red', `   ❌ 서비스 키 테스트 오류: ${err.message}`);
    }
  }

  // 완료 메시지
  colorLog('green', '\n🎉 Supabase 연결 테스트 완료!');
  colorLog('cyan', '\n📋 다음 단계:');
  colorLog('cyan', '   1. docs/supabase-setup.md를 참조하여 데이터베이스 스키마 설정');
  colorLog('cyan', '   2. Authentication 설정 구성');
  colorLog('cyan', '   3. Row Level Security 정책 설정');
  colorLog('cyan', '   4. 실시간 기능 활성화');
  
  return true;
}

// 메인 실행
if (require.main === module) {
  testSupabaseConnection()
    .then(success => {
      if (success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      colorLog('red', `\n💥 예상치 못한 오류: ${error.message}`);
      colorLog('yellow', '\n디버깅 정보:');
      console.error(error);
      process.exit(1);
    });
}

module.exports = { testSupabaseConnection }; 