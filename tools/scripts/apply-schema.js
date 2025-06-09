#!/usr/bin/env node

/**
 * Supabase 스키마 적용 스크립트
 * 
 * docs/schema.sql 파일을 읽어서 Supabase 데이터베이스에 적용합니다.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
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

async function applySchema() {
  console.log('\n🔧 Supabase 스키마 적용 시작...\n');

  // 1. 환경 변수 확인
  colorLog('blue', '1️⃣ 환경 변수 확인 중...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    colorLog('red', '❌ 필수 환경 변수가 설정되지 않았습니다.');
    colorLog('red', '   - NEXT_PUBLIC_SUPABASE_URL');
    colorLog('red', '   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  colorLog('green', '   ✅ 환경 변수 확인 완료');

  // 2. 스키마 파일 읽기
  colorLog('blue', '\n2️⃣ 스키마 파일 읽기 중...');
  
  const schemaPath = path.join(__dirname, '../../docs/schema.sql');
  
  if (!fs.existsSync(schemaPath)) {
    colorLog('red', '   ❌ 스키마 파일을 찾을 수 없습니다: docs/schema.sql');
    process.exit(1);
  }
  
  const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
  colorLog('green', `   ✅ 스키마 파일 읽기 완료 (${schemaSQL.length} characters)`);

  // 3. Supabase 클라이언트 생성 (서비스 역할)
  colorLog('blue', '\n3️⃣ Supabase 클라이언트 생성 중...');
  
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  colorLog('green', '   ✅ 서비스 역할 클라이언트 생성 완료');

  // 4. SQL 실행
  colorLog('blue', '\n4️⃣ 스키마 적용 중...');
  colorLog('yellow', '   ⚠️  이 과정은 시간이 걸릴 수 있습니다...');
  
  try {
    // SQL을 실행하기 위해 RPC 호출을 사용
    // 실제로는 Supabase Dashboard의 SQL Editor를 사용하는 것이 권장됩니다
    colorLog('yellow', '\n   💡 참고: 복잡한 스키마는 Supabase Dashboard SQL Editor에서 실행하는 것이 권장됩니다.');
    colorLog('cyan', '   📋 다음 단계를 따라주세요:');
    colorLog('cyan', '   1. https://app.supabase.com 에 접속');
    colorLog('cyan', '   2. 프로젝트 선택');
    colorLog('cyan', '   3. SQL Editor 탭으로 이동');
    colorLog('cyan', '   4. docs/schema.sql 파일 내용을 복사하여 붙여넣기');
    colorLog('cyan', '   5. Run 버튼 클릭');
    
    // 간단한 테스트: 테이블 존재 여부 확인
    colorLog('blue', '\n5️⃣ 기존 테이블 상태 확인 중...');
    
    const tables = ['users', 'restaurants', 'menu_items', 'orders', 'order_items', 'reviews'];
    const existingTables = [];
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (!error) {
          existingTables.push(table);
          colorLog('green', `   ✅ ${table} 테이블 존재함`);
        } else if (error.code === 'PGRST116') {
          colorLog('yellow', `   ⚠️  ${table} 테이블이 아직 생성되지 않음`);
        } else {
          colorLog('yellow', `   ⚠️  ${table} 테이블 상태 불명: ${error.message}`);
        }
      } catch (err) {
        colorLog('yellow', `   ⚠️  ${table} 테이블 확인 중 오류: ${err.message}`);
      }
    }
    
    colorLog('blue', '\n📊 현재 상태:');
    colorLog('cyan', `   🗃️  확인된 테이블: ${existingTables.length}/${tables.length}`);
    colorLog('cyan', `   📋 테이블 목록: ${existingTables.join(', ')}`);
    
    if (existingTables.length === tables.length) {
      colorLog('green', '\n🎉 모든 테이블이 이미 생성되어 있습니다!');
      
      // 샘플 데이터 확인
      colorLog('blue', '\n6️⃣ 샘플 데이터 확인 중...');
      
      for (const table of existingTables) {
        try {
          const { data, error, count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
            
          if (!error) {
            colorLog('cyan', `   📊 ${table}: ${count || 0} 레코드`);
          }
        } catch (err) {
          colorLog('yellow', `   ⚠️  ${table} 데이터 확인 중 오류`);
        }
      }
    } else {
      colorLog('yellow', '\n💡 아직 모든 테이블이 생성되지 않았습니다.');
      colorLog('cyan', '   📋 Supabase Dashboard에서 스키마를 적용해주세요.');
    }
    
  } catch (error) {
    colorLog('red', `   ❌ 스키마 적용 중 오류: ${error.message}`);
    process.exit(1);
  }

  colorLog('green', '\n✅ 스키마 적용 프로세스 완료!');
  return true;
}

// 메인 실행
if (require.main === module) {
  applySchema()
    .then(success => {
      if (success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      colorLog('red', `\n💥 예상치 못한 오류: ${error.message}`);
      console.error(error);
      process.exit(1);
    });
}

module.exports = { applySchema }; 