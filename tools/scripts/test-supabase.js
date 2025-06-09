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

  // 1.5. URL 형식 검증
  colorLog('blue', '\n🔍 환경 변수 값 검증 중...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // URL 형식 체크
  if (supabaseUrl.includes('your-project-id') || supabaseUrl === 'https://your-project-id.supabase.co') {
    colorLog('red', `   ❌ SUPABASE_URL이 예제 값입니다: ${supabaseUrl}`);
    colorLog('yellow', '   💡 실제 Supabase 프로젝트 URL로 변경해주세요.');
    colorLog('cyan', '   📋 https://app.supabase.com에서 프로젝트 설정 → API 탭에서 확인');
    process.exit(1);
  }
  
  // 키 형식 체크
  if (supabaseKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9') && supabaseKey.endsWith('...')) {
    colorLog('red', `   ❌ SUPABASE_ANON_KEY가 예제 값입니다`);
    colorLog('yellow', '   💡 실제 Supabase anon key로 변경해주세요.');
    colorLog('cyan', '   📋 https://app.supabase.com에서 프로젝트 설정 → API 탭에서 확인');
    process.exit(1);
  }
  
  colorLog('green', '   ✅ 환경 변수 형식 검증 완료');
  colorLog('cyan', `   🌐 프로젝트 URL: ${supabaseUrl}`);

  // 2. Supabase 클라이언트 생성
  colorLog('blue', '\n2️⃣ Supabase 클라이언트 생성 중...');
  
  let supabase;
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    colorLog('green', '   ✅ 클라이언트 생성 성공');
  } catch (error) {
    colorLog('red', `   ❌ 클라이언트 생성 실패: ${error.message}`);
    process.exit(1);
  }

  // 3. 네트워크 연결 테스트
  colorLog('blue', '\n3️⃣ 네트워크 연결 테스트 중...');
  
  try {
    // Supabase REST API 엔드포인트로 테스트
    const apiUrl = `${supabaseUrl}/rest/v1/`;
    const response = await fetch(apiUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    if (response.ok) {
      colorLog('green', '   ✅ Supabase API 서버 연결 성공');
    } else if (response.status === 401) {
      colorLog('red', '   ❌ API 키 인증 실패');
      colorLog('yellow', '   💡 SUPABASE_ANON_KEY가 올바른지 확인해주세요.');
      return false;
    } else if (response.status === 404) {
      colorLog('red', '   ❌ 프로젝트를 찾을 수 없습니다');
      colorLog('yellow', '   💡 SUPABASE_URL이 올바른지 확인해주세요.');
      colorLog('yellow', '   💡 Supabase 프로젝트가 활성 상태인지 확인해주세요.');
      return false;
    } else {
      colorLog('red', `   ❌ 서버 응답 오류: ${response.status} ${response.statusText}`);
      colorLog('cyan', `   🔍 응답 URL: ${apiUrl}`);
      return false;
    }
  } catch (error) {
    colorLog('red', `   ❌ 네트워크 연결 실패: ${error.message}`);
    colorLog('yellow', '\n🔍 가능한 원인:');
    colorLog('yellow', '   1. 인터넷 연결 문제');
    colorLog('yellow', '   2. Supabase URL이 잘못됨');
    colorLog('yellow', '   3. 방화벽이나 프록시가 차단');
    colorLog('yellow', '   4. Supabase 프로젝트가 일시정지됨');
    
    // 더 자세한 에러 정보
    if (error.cause) {
      colorLog('cyan', `\n📋 상세 에러 정보: ${error.cause.message}`);
    }
    
    return false;
  }

  // 4. 기본 API 호출 테스트
  colorLog('blue', '\n4️⃣ Supabase API 테스트 중...');
  
  try {
    // 먼저 스키마가 있는지 확인
    colorLog('cyan', '   📋 데이터베이스 스키마 확인 중...');
    
    const { data: schemaData, error: schemaError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['users', 'restaurants', 'menu_items', 'orders']);

    if (schemaError) {
      colorLog('yellow', `   ⚠️  스키마 정보 조회 제한: ${schemaError.message}`);
      colorLog('cyan', '   💡 이는 정상적인 보안 설정일 수 있습니다.');
    } else if (schemaData && schemaData.length > 0) {
      colorLog('green', `   ✅ 데이터베이스 스키마 확인: ${schemaData.length}개 테이블 발견`);
    }

    // users 테이블로 기본 연결 테스트
    colorLog('cyan', '   🔍 users 테이블 접근 테스트...');
    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (error) {
      colorLog('red', `   ❌ API 호출 실패: ${error.message || 'Unknown error'}`);
      colorLog('cyan', `   📋 에러 코드: ${error.code || 'Unknown'}`);
      colorLog('cyan', `   📋 에러 상세: ${error.details || 'No details'}`);
      colorLog('cyan', `   📋 힌트: ${error.hint || 'No hint'}`);
      
      if (error.code === 'PGRST116') {
        colorLog('yellow', '\n   💡 users 테이블이 아직 생성되지 않았습니다.');
        colorLog('yellow', '   📋 다음 단계를 진행해주세요:');
        colorLog('yellow', '   1. Supabase Dashboard → SQL Editor');
        colorLog('yellow', '   2. docs/schema.sql 내용을 복사해서 실행');
        colorLog('yellow', '   3. 실행 후 다시 테스트');
        return false;
      } else if (error.code === '42P01') {
        colorLog('yellow', '\n   💡 데이터베이스 스키마가 설정되지 않았습니다.');
        colorLog('yellow', '   📋 Supabase 대시보드에서 스키마를 설정해주세요.');
        return false;
      } else if (error.code === 'PGRST301') {
        colorLog('green', '   ✅ 이는 정상적인 RLS 보안 설정입니다!');
        colorLog('cyan', '   💡 users 테이블이 성공적으로 생성되었습니다.');
      } else {
        colorLog('yellow', '\n   🔍 예상치 못한 에러입니다.');
        return false;
      }
    } else {
      colorLog('green', '   ✅ 데이터베이스 연결 성공');
      colorLog('green', `   📊 users 테이블 확인됨 (레코드 수: ${count || 0})`);
    }

    // restaurants 테이블도 테스트
    colorLog('cyan', '   🏪 restaurants 테이블 접근 테스트...');
    const { data: restData, error: restError } = await supabase
      .from('restaurants')
      .select('count(*)', { count: 'exact', head: true });

    if (restError) {
      if (restError.code === 'PGRST116' || restError.code === '42P01') {
        colorLog('yellow', '   ⚠️  restaurants 테이블이 생성되지 않았습니다.');
        return false;
      } else if (restError.code === 'PGRST301') {
        colorLog('green', '   ✅ restaurants 테이블 확인됨 (RLS 보안 활성화)');
      }
    } else {
      colorLog('green', '   ✅ restaurants 테이블 연결 성공');
    }
    
  } catch (err) {
    colorLog('red', `   ❌ API 테스트 오류: ${err.message}`);
    colorLog('cyan', `   📋 스택 트레이스: ${err.stack ? err.stack.split('\n')[0] : 'Not available'}`);
    return false;
  }

  // 5. 인증 상태 확인
  colorLog('blue', '\n5️⃣ 인증 시스템 테스트 중...');
  
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

  // 6. 프로젝트 정보 확인
  colorLog('blue', '\n6️⃣ 프로젝트 정보 확인 중...');
  
  const urlParts = supabaseUrl.split('.');
  const projectId = urlParts[0].split('//')[1];
  
  colorLog('cyan', `   🏗️  프로젝트 ID: ${projectId}`);
  colorLog('cyan', `   🌍 프로젝트 URL: ${supabaseUrl}`);
  
  // 7. 서비스 역할 키 테스트 (있는 경우)
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    colorLog('blue', '\n7️⃣ 서비스 역할 키 테스트 중...');
    
    try {
      const adminClient = createClient(
        supabaseUrl,
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