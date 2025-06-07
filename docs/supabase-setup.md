# Supabase 프로젝트 설정 가이드

## 📋 개요
배달 플랫폼을 위한 Supabase 프로젝트 설정 단계별 가이드입니다.

## 🚀 1단계: Supabase 계정 및 프로젝트 생성

### 1.1 계정 생성
1. [Supabase](https://supabase.com) 접속
2. "Start your project" 클릭
3. GitHub 계정으로 로그인 (권장) 또는 이메일로 회원가입

### 1.2 새 프로젝트 생성
1. Dashboard에서 "New Project" 클릭
2. Organization 선택 (개인 계정 또는 팀)
3. 프로젝트 정보 입력:
   - **Name**: `delivery-platform`
   - **Database Password**: 강력한 비밀번호 생성 (저장 필수!)
   - **Region**: `Northeast Asia (Seoul)` 선택 (한국 사용자 대상)
   - **Pricing Plan**: 개발 단계에서는 `Free tier` 선택

4. "Create new project" 클릭
5. 프로젝트 생성 완료까지 2-3분 대기

## 🔑 2단계: API 키 및 설정 정보 수집

### 2.1 프로젝트 설정 페이지 접속
1. 생성된 프로젝트 클릭
2. 좌측 메뉴에서 "Settings" → "API" 클릭

### 2.2 필요한 정보 수집
다음 정보들을 복사하여 안전한 곳에 저장:

```env
# Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Public anon key (공개 키)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service role key (서버용 - 비공개!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT Secret
SUPABASE_JWT_SECRET=your-jwt-secret
```

## ⚠️ 보안 주의사항
- **Service Role Key**는 절대 클라이언트 코드에 노출하지 마세요
- **JWT Secret**은 토큰 검증용으로만 사용
- **Anon Key**만 프론트엔드에서 사용 가능

## 🗄️ 3단계: 데이터베이스 스키마 설정

### 3.1 SQL Editor 접속
1. Supabase Dashboard에서 "SQL Editor" 클릭
2. "New query" 선택

### 3.2 기본 테이블 생성
다음 SQL을 실행하여 기본 스키마 생성:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Users 테이블 (Supabase Auth와 연동)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'driver', 'restaurant_owner', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false
);

-- Restaurants 테이블
CREATE TABLE public.restaurants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES public.users(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  image_url TEXT,
  cuisine_type TEXT NOT NULL,
  rating DECIMAL(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  is_open BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  minimum_order DECIMAL(10,2) DEFAULT 0,
  estimated_delivery_time INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Menu Items 테이블
CREATE TABLE public.menu_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL,
  is_available BOOLEAN DEFAULT true,
  preparation_time INTEGER DEFAULT 15,
  nutritional_info JSONB,
  allergens TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders 테이블
CREATE TABLE public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES public.users(id) NOT NULL,
  restaurant_id UUID REFERENCES public.restaurants(id) NOT NULL,
  driver_id UUID REFERENCES public.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled')),
  order_number TEXT UNIQUE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  tip_amount DECIMAL(10,2) DEFAULT 0,
  delivery_address TEXT NOT NULL,
  delivery_notes TEXT,
  estimated_delivery_time TIMESTAMP WITH TIME ZONE,
  actual_delivery_time TIMESTAMP WITH TIME ZONE,
  payment_method TEXT NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Updated timestamp trigger 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 각 테이블에 updated_at 트리거 추가
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3.3 Row Level Security (RLS) 설정
```sql
-- 모든 테이블에 RLS 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 기본 정책 예시 (나중에 상세 설정)
CREATE POLICY "Users can view own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid() = id);
```

## 🔧 4단계: 로컬 환경 설정

### 4.1 환경 변수 설정
프로젝트 루트에 `.env.local` 파일 생성:

```bash
cp .env.example .env.local
```

### 4.2 Supabase 정보 입력
`.env.local` 파일에서 Supabase 섹션 수정:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_actual_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_actual_service_role_key"
SUPABASE_JWT_SECRET="your_actual_jwt_secret"
```

### 4.3 패키지 설치
```bash
yarn install
```

## 🧪 5단계: 연결 테스트

### 5.1 간단한 연결 테스트 스크립트
`scripts/test-supabase.js` 파일 생성:

```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testConnection() {
  try {
    const { data, error } = await supabase.from('users').select('count(*)');
    
    if (error) {
      console.error('❌ Supabase 연결 실패:', error.message);
    } else {
      console.log('✅ Supabase 연결 성공!');
      console.log('📊 Users 테이블 확인됨');
    }
  } catch (err) {
    console.error('❌ 테스트 실행 오류:', err.message);
  }
}

testConnection();
```

### 5.2 테스트 실행
```bash
node scripts/test-supabase.js
```

## 📱 6단계: Authentication 설정

### 6.1 Auth 설정 페이지 접속
1. Supabase Dashboard → "Authentication" → "Settings"

### 6.2 기본 설정
- **Site URL**: `http://localhost:3000` (개발용)
- **Redirect URLs**: 
  - `http://localhost:3000/auth/callback`
  - `http://localhost:19006/auth/callback` (Expo 개발용)

### 6.3 이메일 템플릿 설정
1. "Email Templates" 탭에서 확인 이메일 템플릿 커스터마이즈
2. 한국어 템플릿으로 변경 (옵션)

## 🔄 7단계: 실시간 기능 설정

### 7.1 Realtime 활성화
```sql
-- 실시간 구독이 필요한 테이블에 대해 설정
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurants;
```

## 🚀 배포 준비

### 프로덕션 설정
1. **Custom Domain**: 프로덕션 도메인 추가
2. **SSL Certificate**: 자동 설정됨
3. **Environment Variables**: Vercel/Netlify에 환경 변수 설정
4. **Database Backup**: 자동 백업 정책 확인

## 📚 추가 리소스

- [Supabase 공식 문서](https://supabase.com/docs)
- [Next.js와 Supabase 통합 가이드](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)
- [Row Level Security 가이드](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI 가이드](https://supabase.com/docs/reference/cli)

## ❓ 문제 해결

### 자주 발생하는 문제

1. **API 키 오류**: 환경 변수가 올바르게 설정되었는지 확인
2. **CORS 오류**: Site URL과 Redirect URL 확인
3. **RLS 오류**: 정책이 올바르게 설정되었는지 확인
4. **연결 실패**: 프로젝트가 활성 상태인지 확인

도움이 필요하면 [Supabase Discord](https://discord.supabase.com) 커뮤니티에 문의하세요. 