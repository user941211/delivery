import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/database.types';

// Supabase 클라이언트 인스턴스 생성
export const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase 환경 변수가 설정되지 않았습니다.');
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'X-Client-Info': 'delivery-platform-client',
      },
    },
  });
};

// 서버 사이드용 Supabase 클라이언트 (서비스 키 사용)
export const createSupabaseServerClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase 서버 환경 변수가 설정되지 않았습니다.');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'delivery-platform-server',
      },
    },
  });
};

// 기본 클라이언트 인스턴스
export const supabase = createSupabaseClient();

// 데이터베이스 타입 유틸리티
export type { Database } from './types/database.types';

// 테이블 타입 익스포트
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// 인증 관련 유틸리티
export const getUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('사용자 정보 가져오기 실패:', error);
    return null;
  }
  return user;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('로그아웃 실패:', error);
    throw error;
  }
};

// 실시간 구독 헬퍼
export const subscribeToTable = <T extends keyof Database['public']['Tables']>(
  tableName: T,
  callback: (payload: any) => void,
  filter?: string
) => {
  return supabase
    .channel(`public:${tableName}`)
    .on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: tableName as string,
        filter 
      },
      callback
    )
    .subscribe();
}; 