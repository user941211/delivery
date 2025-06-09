-- 리뷰 및 평점 시스템을 위한 테이블 생성 스크립트
-- 실행 방법: Supabase 대시보드의 SQL Editor에서 실행

-- 1. 리뷰 테이블 생성
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- 평점 (1-5 범위)
  restaurant_rating INTEGER NOT NULL CHECK (restaurant_rating >= 1 AND restaurant_rating <= 5),
  delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  food_rating INTEGER NOT NULL CHECK (food_rating >= 1 AND food_rating <= 5),
  service_rating INTEGER NOT NULL CHECK (service_rating >= 1 AND service_rating <= 5),
  overall_rating DECIMAL(2,1) NOT NULL CHECK (overall_rating >= 1.0 AND overall_rating <= 5.0),
  
  -- 리뷰 내용
  comment TEXT,
  images TEXT[], -- 이미지 URL 배열
  
  -- 설정
  is_anonymous BOOLEAN DEFAULT FALSE,
  is_visible BOOLEAN DEFAULT TRUE,
  helpful_count INTEGER DEFAULT 0,
  
  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 제약 조건: 주문당 하나의 리뷰만 허용
  UNIQUE(order_id)
);

-- 2. 리뷰 응답 테이블 생성
CREATE TABLE IF NOT EXISTS review_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  responder_type TEXT NOT NULL CHECK (responder_type IN ('restaurant_owner', 'driver')),
  response_text TEXT NOT NULL,
  
  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 제약 조건: 리뷰당 응답자 타입별로 하나의 응답만 허용
  UNIQUE(review_id, responder_id, responder_type)
);

-- 3. 리뷰 도움됨 테이블 생성
CREATE TABLE IF NOT EXISTS review_helpful (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 제약 조건: 사용자당 리뷰별로 하나의 도움됨만 허용
  UNIQUE(review_id, user_id)
);

-- 4. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant_id ON reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_driver_id ON reviews(driver_id);
CREATE INDEX IF NOT EXISTS idx_reviews_overall_rating ON reviews(overall_rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_is_visible ON reviews(is_visible);

CREATE INDEX IF NOT EXISTS idx_review_responses_review_id ON review_responses(review_id);
CREATE INDEX IF NOT EXISTS idx_review_responses_responder_id ON review_responses(responder_id);

CREATE INDEX IF NOT EXISTS idx_review_helpful_review_id ON review_helpful(review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_user_id ON review_helpful(user_id);

-- 5. 트리거 함수 생성 (updated_at 자동 업데이트)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language plpgsql;

-- 6. 트리거 적용
CREATE TRIGGER update_reviews_updated_at 
  BEFORE UPDATE ON reviews 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_responses_updated_at 
  BEFORE UPDATE ON review_responses 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 7. RLS (Row Level Security) 정책 설정

-- 리뷰 테이블 RLS 활성화
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 리뷰 조회 정책: 모든 사용자가 visible한 리뷰 조회 가능
CREATE POLICY "Anyone can view visible reviews" ON reviews
  FOR SELECT USING (is_visible = true);

-- 리뷰 생성 정책: 고객만 자신의 주문에 대해 리뷰 생성 가능
CREATE POLICY "Customers can create reviews for their orders" ON reviews
  FOR INSERT WITH CHECK (
    auth.uid() = customer_id AND
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_id 
      AND orders.customer_id = auth.uid() 
      AND orders.status = 'delivered'
    )
  );

-- 리뷰 수정 정책: 고객만 자신의 리뷰 수정 가능
CREATE POLICY "Customers can update their own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = customer_id);

-- 리뷰 응답 테이블 RLS 활성화
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;

-- 리뷰 응답 조회 정책: 모든 사용자가 조회 가능
CREATE POLICY "Anyone can view review responses" ON review_responses
  FOR SELECT USING (true);

-- 리뷰 응답 생성 정책: 점주나 배달기사만 자신의 관련 리뷰에 응답 가능
CREATE POLICY "Restaurant owners and drivers can create responses" ON review_responses
  FOR INSERT WITH CHECK (
    auth.uid() = responder_id AND
    (
      (responder_type = 'restaurant_owner' AND EXISTS (
        SELECT 1 FROM reviews r
        JOIN restaurants rest ON rest.id = r.restaurant_id
        WHERE r.id = review_id AND rest.owner_id = auth.uid()
      )) OR
      (responder_type = 'driver' AND EXISTS (
        SELECT 1 FROM reviews r
        WHERE r.id = review_id AND r.driver_id = auth.uid()
      ))
    )
  );

-- 리뷰 도움됨 테이블 RLS 활성화
ALTER TABLE review_helpful ENABLE ROW LEVEL SECURITY;

-- 리뷰 도움됨 조회 정책: 모든 사용자가 조회 가능
CREATE POLICY "Anyone can view review helpful" ON review_helpful
  FOR SELECT USING (true);

-- 리뷰 도움됨 생성/삭제 정책: 인증된 사용자만 자신의 도움됨 관리 가능
CREATE POLICY "Users can manage their own helpful marks" ON review_helpful
  FOR ALL USING (auth.uid() = user_id);

-- 8. 함수 생성 (레스토랑 평점 자동 업데이트)
CREATE OR REPLACE FUNCTION update_restaurant_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating DECIMAL(2,1);
  review_count INTEGER;
BEGIN
  -- 레스토랑의 평균 평점과 리뷰 수 계산
  SELECT 
    ROUND(AVG(overall_rating), 1),
    COUNT(*)
  INTO avg_rating, review_count
  FROM reviews 
  WHERE restaurant_id = COALESCE(NEW.restaurant_id, OLD.restaurant_id)
  AND is_visible = true;
  
  -- 레스토랑 테이블 업데이트
  UPDATE restaurants 
  SET 
    rating = COALESCE(avg_rating, 0),
    review_count = COALESCE(review_count, 0),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.restaurant_id, OLD.restaurant_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language plpgsql;

-- 9. 레스토랑 평점 업데이트 트리거 적용
CREATE TRIGGER update_restaurant_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_restaurant_rating();

-- 10. 리뷰 도움됨 카운트 업데이트 함수
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
DECLARE
  helpful_count INTEGER;
BEGIN
  -- 리뷰의 도움됨 카운트 계산
  SELECT COUNT(*)
  INTO helpful_count
  FROM review_helpful 
  WHERE review_id = COALESCE(NEW.review_id, OLD.review_id);
  
  -- 리뷰 테이블 업데이트
  UPDATE reviews 
  SET 
    helpful_count = helpful_count,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.review_id, OLD.review_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language plpgsql;

-- 11. 리뷰 도움됨 카운트 업데이트 트리거 적용
CREATE TRIGGER update_review_helpful_count_trigger
  AFTER INSERT OR DELETE ON review_helpful
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpful_count();

-- 12. 테스트 데이터 (개발 환경에서만 사용)
-- 실제 프로덕션에서는 주석 처리하거나 제거

/*
-- 샘플 리뷰 데이터 (기존 주문이 있다고 가정)
INSERT INTO reviews (
  order_id,
  customer_id, 
  restaurant_id,
  driver_id,
  restaurant_rating,
  delivery_rating,
  food_rating,
  service_rating,
  overall_rating,
  comment,
  is_anonymous
) VALUES (
  -- 실제 주문 ID들로 교체 필요
  'existing-order-id',
  'existing-customer-id',
  'existing-restaurant-id', 
  'existing-driver-id',
  4,
  5,
  4,
  4,
  4.2,
  '음식이 맛있었고 배달도 빨랐습니다!',
  false
);
*/

-- 완료 메시지
SELECT 'Review system tables created successfully!' as status; 