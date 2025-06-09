-- ============================================================================
-- 성능 최적화를 위한 데이터베이스 인덱스 생성
-- 실행 순서: Supabase SQL Editor에서 순차적으로 실행
-- ============================================================================

-- 1. 사용자 관련 인덱스
-- ============================================================================

-- 사용자 역할별 검색 최적화
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role) WHERE is_active = true;

-- 이메일 검색 최적화 (이미 UNIQUE 제약조건으로 인덱스가 있지만 부분 인덱스로 성능 향상)
CREATE INDEX IF NOT EXISTS idx_users_email_active ON public.users(email) WHERE is_active = true;

-- 전화번호 검색 최적화
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone) WHERE phone IS NOT NULL;

-- 최근 로그인 사용자 조회 최적화
CREATE INDEX IF NOT EXISTS idx_users_last_login ON public.users(last_login DESC) WHERE is_active = true;

-- 2. 레스토랑 관련 인덱스
-- ============================================================================

-- 지역별 활성 레스토랑 검색 최적화
CREATE INDEX IF NOT EXISTS idx_restaurants_location_active ON public.restaurants(address) WHERE is_open = true AND is_verified = true;

-- 음식 카테고리별 검색 최적화
CREATE INDEX IF NOT EXISTS idx_restaurants_cuisine_active ON public.restaurants(cuisine_type) WHERE is_open = true AND is_verified = true;

-- 평점별 정렬 최적화
CREATE INDEX IF NOT EXISTS idx_restaurants_rating ON public.restaurants(rating DESC, review_count DESC) WHERE is_open = true;

-- 배달비 및 최소 주문 금액 필터 최적화
CREATE INDEX IF NOT EXISTS idx_restaurants_delivery_filter ON public.restaurants(delivery_fee, minimum_order) WHERE is_open = true;

-- 소유자별 레스토랑 조회 최적화
CREATE INDEX IF NOT EXISTS idx_restaurants_owner ON public.restaurants(owner_id, created_at DESC);

-- 복합 인덱스: 검색 조건 최적화
CREATE INDEX IF NOT EXISTS idx_restaurants_search_composite ON public.restaurants(is_open, is_verified, cuisine_type, rating DESC);

-- 3. 메뉴 아이템 관련 인덱스
-- ============================================================================

-- 레스토랑별 활성 메뉴 조회 최적화
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_active ON public.menu_items(restaurant_id, is_available, category);

-- 가격대별 검색 최적화
CREATE INDEX IF NOT EXISTS idx_menu_items_price ON public.menu_items(price) WHERE is_available = true;

-- 카테고리별 메뉴 검색 최적화
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category, restaurant_id) WHERE is_available = true;

-- 준비 시간별 정렬 최적화
CREATE INDEX IF NOT EXISTS idx_menu_items_prep_time ON public.menu_items(preparation_time) WHERE is_available = true;

-- 4. 주문 관련 인덱스
-- ============================================================================

-- 고객별 주문 이력 조회 최적화
CREATE INDEX IF NOT EXISTS idx_orders_customer_date ON public.orders(customer_id, created_at DESC);

-- 레스토랑별 주문 관리 최적화
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON public.orders(restaurant_id, status, created_at DESC);

-- 배달기사별 배정 주문 조회 최적화
CREATE INDEX IF NOT EXISTS idx_orders_driver_status ON public.orders(driver_id, status, created_at DESC) WHERE driver_id IS NOT NULL;

-- 주문 상태별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_orders_status_date ON public.orders(status, created_at DESC);

-- 결제 상태별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status, created_at DESC);

-- 주문 번호 검색 최적화 (이미 UNIQUE이지만 성능 향상)
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);

-- 배달 완료 시간 분석을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_orders_delivery_time ON public.orders(estimated_delivery_time, actual_delivery_time) WHERE status = 'delivered';

-- 5. 주문 아이템 관련 인덱스
-- ============================================================================

-- 주문별 아이템 조회 최적화
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- 메뉴별 주문 통계를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_order_items_menu_stats ON public.order_items(menu_item_id, quantity);

-- 가격별 분석을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_order_items_price ON public.order_items(unit_price, quantity);

-- 6. 결제 관련 인덱스
-- ============================================================================

-- 사용자별 결제 이력 조회 최적화
CREATE INDEX IF NOT EXISTS idx_payments_user_date ON public.payments(user_id, created_at DESC);

-- 결제 상태별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status, created_at DESC);

-- 결제 방법별 통계를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_payments_method ON public.payments(payment_method, created_at DESC);

-- 금액별 분석을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_payments_amount ON public.payments(amount, created_at DESC);

-- PG사별 결제 분석을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_payments_provider ON public.payments(provider, status, created_at DESC);

-- 7. 리뷰 관련 인덱스 (리뷰 시스템이 구현되면 사용)
-- ============================================================================

-- 레스토랑별 리뷰 조회 최적화
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant_date ON public.reviews(restaurant_id, created_at DESC);

-- 고객별 리뷰 이력 조회 최적화
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON public.reviews(customer_id, created_at DESC);

-- 평점별 필터링 최적화
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating, created_at DESC);

-- 8. 채팅 관련 인덱스
-- ============================================================================

-- 채팅방별 메시지 조회 최적화
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_date ON public.chat_messages(chat_room_id, created_at DESC);

-- 사용자별 읽지 않은 메시지 카운트 최적화
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON public.chat_messages(recipient_id, read_at) WHERE read_at IS NULL;

-- 채팅방 참가자 조회 최적화
CREATE INDEX IF NOT EXISTS idx_chat_participants_room ON public.chat_participants(chat_room_id) WHERE left_at IS NULL;

-- 사용자별 참가 채팅방 조회 최적화
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON public.chat_participants(user_id) WHERE left_at IS NULL;

-- 주문별 채팅방 조회 최적화
CREATE INDEX IF NOT EXISTS idx_chat_rooms_order ON public.chat_rooms(order_id);

-- 9. 위치 추적 관련 인덱스
-- ============================================================================

-- 배달기사별 최신 위치 조회 최적화
CREATE INDEX IF NOT EXISTS idx_driver_locations_latest ON public.driver_locations(driver_id, created_at DESC);

-- 주문별 위치 추적 최적화
CREATE INDEX IF NOT EXISTS idx_driver_locations_order ON public.driver_locations(order_id, created_at DESC);

-- 지리적 검색을 위한 공간 인덱스 (PostGIS 확장이 활성화된 경우)
-- CREATE INDEX IF NOT EXISTS idx_driver_locations_geom ON public.driver_locations USING GIST(location) WHERE location IS NOT NULL;

-- 10. 쿠폰 및 할인 관련 인덱스
-- ============================================================================

-- 활성 쿠폰 조회 최적화
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active, valid_from, valid_until) WHERE is_active = true;

-- 사용자별 쿠폰 사용 이력 최적화
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user ON public.coupon_usage(user_id, used_at DESC);

-- 쿠폰별 사용 통계 최적화
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON public.coupon_usage(coupon_id, used_at DESC);

-- 11. 포인트 관련 인덱스
-- ============================================================================

-- 사용자별 포인트 이력 조회 최적화
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_date ON public.point_transactions(user_id, created_at DESC);

-- 포인트 유형별 분석을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_point_transactions_type ON public.point_transactions(transaction_type, created_at DESC);

-- 포인트 잔액 계산을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_point_transactions_balance ON public.point_transactions(user_id, created_at, amount);

-- 12. 보안 및 로깅 관련 인덱스
-- ============================================================================

-- 결제 로그 조회 최적화
CREATE INDEX IF NOT EXISTS idx_payment_logs_payment_date ON public.payment_logs(payment_id, created_at DESC);

-- 로그 레벨별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_payment_logs_level ON public.payment_logs(level, created_at DESC);

-- 사용자별 로그 조회 최적화
CREATE INDEX IF NOT EXISTS idx_payment_logs_user ON public.payment_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- IP별 로그 분석을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_payment_logs_ip ON public.payment_logs(ip_address, created_at DESC) WHERE ip_address IS NOT NULL;

-- 보안 이벤트 조회 최적화
CREATE INDEX IF NOT EXISTS idx_security_events_type_date ON public.security_events(event_type, occurred_at DESC);

-- 위험도별 보안 이벤트 조회 최적화
CREATE INDEX IF NOT EXISTS idx_security_events_risk ON public.security_events(risk_level, occurred_at DESC);

-- 미해결 보안 이벤트 조회 최적화
CREATE INDEX IF NOT EXISTS idx_security_events_unresolved ON public.security_events(resolved, occurred_at DESC) WHERE resolved = false;

-- 13. 구독 관련 인덱스
-- ============================================================================

-- 활성 구독 조회 최적화
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status, created_at DESC);

-- 사용자별 구독 조회 최적화
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id, status, created_at DESC);

-- 갱신 예정 구독 조회 최적화
CREATE INDEX IF NOT EXISTS idx_subscriptions_renewal ON public.subscriptions(next_billing_date) WHERE status = 'active';

-- 구독 결제 이력 최적화
CREATE INDEX IF NOT EXISTS idx_subscription_payments_sub_date ON public.subscription_payments(subscription_id, created_at DESC);

-- 14. 환불 관련 인덱스
-- ============================================================================

-- 환불 상태별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_refunds_status_date ON public.refunds(status, requested_at DESC);

-- 주문별 환불 조회 최적화
CREATE INDEX IF NOT EXISTS idx_refunds_order ON public.refunds(order_id);

-- 환불 유형별 통계를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_refunds_type ON public.refunds(type, status, requested_at DESC);

-- 환불 사유별 분석을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_refunds_reason ON public.refunds(reason, requested_at DESC);

-- 15. 복합 검색 최적화 인덱스
-- ============================================================================

-- 레스토랑 종합 검색 최적화 (위치, 카테고리, 평점, 활성 상태)
CREATE INDEX IF NOT EXISTS idx_restaurants_comprehensive_search 
ON public.restaurants(is_open, is_verified, cuisine_type, rating DESC, delivery_fee) 
WHERE is_open = true AND is_verified = true;

-- 주문 관리 대시보드 최적화 (상태, 날짜, 레스토랑)
CREATE INDEX IF NOT EXISTS idx_orders_dashboard 
ON public.orders(restaurant_id, status, created_at DESC, total_amount);

-- 사용자 활동 분석 최적화 (역할, 활성 상태, 최근 로그인)
CREATE INDEX IF NOT EXISTS idx_users_activity_analysis 
ON public.users(role, is_active, last_login DESC, created_at DESC);

-- ============================================================================
-- 인덱스 생성 완료 확인
-- ============================================================================

-- 생성된 인덱스 목록 확인 쿼리
-- SELECT schemaname, tablename, indexname, indexdef 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;

-- 인덱스 사용 통계 확인 쿼리 (나중에 성능 분석 시 사용)
-- SELECT schemaname, tablename, attname, n_distinct, correlation
-- FROM pg_stats 
-- WHERE schemaname = 'public'
-- ORDER BY tablename, attname; 