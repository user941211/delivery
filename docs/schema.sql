-- ============================================================================
-- 배달 플랫폼 데이터베이스 스키마
-- Supabase SQL Editor에서 실행하세요
-- ============================================================================

-- 필요한 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. Users 테이블 (Supabase Auth와 연동)
-- ============================================================================
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

-- ============================================================================
-- 2. Restaurants 테이블
-- ============================================================================
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
  rating DECIMAL(2,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER DEFAULT 0,
  is_open BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  minimum_order DECIMAL(10,2) DEFAULT 0,
  estimated_delivery_time INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. Menu Items 테이블
-- ============================================================================
CREATE TABLE public.menu_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  category TEXT NOT NULL,
  is_available BOOLEAN DEFAULT true,
  preparation_time INTEGER DEFAULT 15,
  nutritional_info JSONB,
  allergens TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 4. Orders 테이블
-- ============================================================================
CREATE TABLE public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES public.users(id) NOT NULL,
  restaurant_id UUID REFERENCES public.restaurants(id) NOT NULL,
  driver_id UUID REFERENCES public.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled')),
  order_number TEXT UNIQUE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
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

-- ============================================================================
-- 5. Order Items 테이블 (주문에 포함된 메뉴 아이템들)
-- ============================================================================
CREATE TABLE public.order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 6. Reviews 테이블
-- ============================================================================
CREATE TABLE public.reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) NOT NULL,
  customer_id UUID REFERENCES public.users(id) NOT NULL,
  restaurant_id UUID REFERENCES public.restaurants(id) NOT NULL,
  driver_id UUID REFERENCES public.users(id),
  restaurant_rating INTEGER CHECK (restaurant_rating >= 1 AND restaurant_rating <= 5),
  driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
  restaurant_comment TEXT,
  driver_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 7. 트리거 함수: updated_at 자동 업데이트
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- 8. 트리거 적용
-- ============================================================================
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurants_updated_at 
  BEFORE UPDATE ON public.restaurants 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at 
  BEFORE UPDATE ON public.menu_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
  BEFORE UPDATE ON public.orders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. 인덱스 생성 (성능 최적화)
-- ============================================================================
CREATE INDEX idx_restaurants_owner_id ON public.restaurants(owner_id);
CREATE INDEX idx_restaurants_cuisine_type ON public.restaurants(cuisine_type);
CREATE INDEX idx_restaurants_is_open ON public.restaurants(is_open);

CREATE INDEX idx_menu_items_restaurant_id ON public.menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category ON public.menu_items(category);
CREATE INDEX idx_menu_items_is_available ON public.menu_items(is_available);

CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_restaurant_id ON public.orders(restaurant_id);
CREATE INDEX idx_orders_driver_id ON public.orders(driver_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);

CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_menu_item_id ON public.order_items(menu_item_id);

CREATE INDEX idx_reviews_order_id ON public.reviews(order_id);
CREATE INDEX idx_reviews_restaurant_id ON public.reviews(restaurant_id);

-- ============================================================================
-- 10. Row Level Security (RLS) 활성화
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 11. 기본 RLS 정책 (보안)
-- ============================================================================

-- Users: 자신의 데이터만 접근 가능
CREATE POLICY "Users can view own data" ON public.users 
  FOR SELECT USING (auth.uid() = id);
  
CREATE POLICY "Users can update own data" ON public.users 
  FOR UPDATE USING (auth.uid() = id);

-- Restaurants: 모든 사용자가 조회 가능, 소유자만 수정 가능
CREATE POLICY "Anyone can view restaurants" ON public.restaurants 
  FOR SELECT USING (true);
  
CREATE POLICY "Owners can manage restaurants" ON public.restaurants 
  FOR ALL USING (auth.uid() = owner_id);

-- Menu Items: 모든 사용자가 조회 가능, 레스토랑 소유자만 수정 가능
CREATE POLICY "Anyone can view menu items" ON public.menu_items 
  FOR SELECT USING (true);
  
CREATE POLICY "Restaurant owners can manage menu items" ON public.menu_items 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.restaurants 
      WHERE restaurants.id = menu_items.restaurant_id 
      AND restaurants.owner_id = auth.uid()
    )
  );

-- Orders: 관련 사용자들만 접근 가능
CREATE POLICY "Users can view related orders" ON public.orders 
  FOR SELECT USING (
    auth.uid() = customer_id 
    OR auth.uid() = driver_id 
    OR EXISTS (
      SELECT 1 FROM public.restaurants 
      WHERE restaurants.id = orders.restaurant_id 
      AND restaurants.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 12. 샘플 데이터 (개발용)
-- ============================================================================

-- 예시 사용자 (실제로는 Supabase Auth를 통해 생성됨)
-- INSERT INTO public.users (id, email, full_name, role) VALUES 
--   ('00000000-0000-0000-0000-000000000001', 'customer@example.com', '김고객', 'customer'),
--   ('00000000-0000-0000-0000-000000000002', 'owner@example.com', '이사장', 'restaurant_owner'),
--   ('00000000-0000-0000-0000-000000000003', 'driver@example.com', '박배달', 'driver');

-- ============================================================================
-- 완료!
-- ============================================================================
-- 스키마 생성이 완료되었습니다.
-- 이제 애플리케이션에서 Supabase를 사용할 수 있습니다.
-- ============================================================================ 