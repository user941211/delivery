/**
 * 장바구니 세션 관리 서비스
 * 
 * 세션 기반 임시 저장과 사용자별 영구 저장을 관리합니다.
 */

import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface CartSessionData {
  id: string;
  restaurantId?: string;
  items: CartSessionItem[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  userId?: string;
}

interface CartSessionItem {
  id: string;
  menuItemId: string;
  quantity: number;
  selectedOptions: any[];
  specialInstructions?: string;
  addedAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CartSessionService {
  private readonly logger = new Logger(CartSessionService.name);
  private readonly supabase: SupabaseClient;
  private readonly sessionStore = new Map<string, CartSessionData>();
  private readonly SESSION_EXPIRY_HOURS = 24; // 24시간 후 만료
  private readonly ANONYMOUS_SESSION_EXPIRY_HOURS = 2; // 익명 사용자는 2시간

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  /**
   * 세션 생성 또는 조회
   */
  async getOrCreateSession(sessionId: string, userId?: string): Promise<CartSessionData> {
    try {
      // 기존 세션 조회
      let session = this.sessionStore.get(sessionId);
      
      if (session) {
        // 세션 만료 확인
        if (this.isSessionExpired(session)) {
          this.sessionStore.delete(sessionId);
          session = null;
        } else {
          // 사용자 ID 업데이트 (로그인 상태 변경 시)
          if (userId && session.userId !== userId) {
            session.userId = userId;
            session.updatedAt = new Date();
            await this.syncSessionToDatabase(session);
          }
          return session;
        }
      }

      // 로그인 사용자인 경우 데이터베이스에서 기존 장바구니 조회
      if (userId) {
        const dbCart = await this.loadUserCartFromDatabase(userId);
        if (dbCart) {
          // 데이터베이스 장바구니를 세션으로 변환
          session = this.convertDbCartToSession(dbCart, sessionId, userId);
          this.sessionStore.set(sessionId, session);
          return session;
        }
      }

      // 새 세션 생성
      session = this.createNewSession(sessionId, userId);
      this.sessionStore.set(sessionId, session);
      
      return session;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`세션 생성/조회 중 오류: ${errorMessage}`, errorStack);
      throw new InternalServerErrorException('세션 처리 중 오류가 발생했습니다.');
    }
  }

  /**
   * 세션 업데이트
   */
  async updateSession(sessionId: string, sessionData: Partial<CartSessionData>): Promise<void> {
    try {
      const session = this.sessionStore.get(sessionId);
      if (!session) {
        throw new Error('세션을 찾을 수 없습니다.');
      }

      // 세션 데이터 업데이트
      Object.assign(session, sessionData, { updatedAt: new Date() });
      
      // 로그인 사용자인 경우 데이터베이스 동기화
      if (session.userId) {
        await this.syncSessionToDatabase(session);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`세션 업데이트 중 오류: ${errorMessage}`, errorStack);
      throw new InternalServerErrorException('세션 업데이트 중 오류가 발생했습니다.');
    }
  }

  /**
   * 세션 삭제
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const session = this.sessionStore.get(sessionId);
      
      // 세션 스토어에서 삭제
      this.sessionStore.delete(sessionId);

      // 로그인 사용자인 경우 데이터베이스에서도 삭제
      if (session?.userId) {
        await this.deactivateUserCart(session.userId);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`세션 삭제 중 오류: ${errorMessage}`, errorStack);
    }
  }

  /**
   * 익명 사용자를 로그인 사용자로 이전
   * 로그인 시 기존 세션 데이터를 사용자 계정으로 이전합니다.
   */
  async migrateAnonymousToUser(sessionId: string, userId: string): Promise<void> {
    try {
      const session = this.sessionStore.get(sessionId);
      if (!session || session.items.length === 0) {
        // 빈 세션이거나 없는 경우, 사용자의 기존 장바구니 로드
        await this.loadUserCartToSession(sessionId, userId);
        return;
      }

      // 기존 사용자 장바구니 조회
      const existingUserCart = await this.loadUserCartFromDatabase(userId);
      
      if (existingUserCart && existingUserCart.items.length > 0) {
        // 기존 사용자 장바구니가 있는 경우 병합 정책 적용
        await this.mergeCartsStrategy(session, existingUserCart, userId);
      } else {
        // 기존 장바구니가 없으면 현재 세션을 사용자 장바구니로 설정
        session.userId = userId;
        session.updatedAt = new Date();
        await this.syncSessionToDatabase(session);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`사용자 이전 중 오류: ${errorMessage}`, errorStack);
      throw new InternalServerErrorException('장바구니 이전 중 오류가 발생했습니다.');
    }
  }

  /**
   * 사용자 로그아웃 시 세션 처리
   */
  async handleUserLogout(sessionId: string): Promise<void> {
    try {
      const session = this.sessionStore.get(sessionId);
      if (session) {
        // 사용자 ID 제거하고 익명 세션으로 전환
        session.userId = undefined;
        session.expiresAt = new Date(Date.now() + this.ANONYMOUS_SESSION_EXPIRY_HOURS * 60 * 60 * 1000);
        session.updatedAt = new Date();
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`로그아웃 처리 중 오류: ${errorMessage}`, errorStack);
    }
  }

  /**
   * 세션을 데이터베이스와 동기화
   */
  private async syncSessionToDatabase(session: CartSessionData): Promise<void> {
    if (!session.userId) return;

    try {
      // 기존 활성 장바구니 비활성화
      await this.deactivateUserCart(session.userId);

      // 새 장바구니 생성
      const { data: cart, error: cartError } = await this.supabase
        .from('user_carts')
        .insert({
          user_id: session.userId,
          restaurant_id: session.restaurantId,
          session_id: session.id,
          is_active: true,
          expires_at: session.expiresAt.toISOString(),
          created_at: session.createdAt.toISOString(),
          updated_at: session.updatedAt.toISOString()
        })
        .select()
        .single();

      if (cartError) {
        throw new Error(`장바구니 생성 실패: ${cartError.message}`);
      }

      // 장바구니 아이템 저장
      if (session.items.length > 0) {
        const cartItems = session.items.map(item => ({
          cart_id: cart.id,
          menu_item_id: item.menuItemId,
          quantity: item.quantity,
          selected_options: item.selectedOptions,
          special_instructions: item.specialInstructions,
          added_at: item.addedAt.toISOString(),
          updated_at: item.updatedAt.toISOString()
        }));

        const { error: itemsError } = await this.supabase
          .from('cart_items')
          .insert(cartItems);

        if (itemsError) {
          throw new Error(`장바구니 아이템 저장 실패: ${itemsError.message}`);
        }
      }

      this.logger.log(`사용자 ${session.userId}의 장바구니가 데이터베이스에 동기화되었습니다.`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`데이터베이스 동기화 실패: ${errorMessage}`, errorStack);
      // 동기화 실패해도 세션은 유지
    }
  }

  /**
   * 데이터베이스에서 사용자 장바구니 로드
   */
  private async loadUserCartFromDatabase(userId: string): Promise<any> {
    try {
      const { data: cart, error } = await this.supabase
        .from('user_carts')
        .select(`
          *,
          cart_items(
            *
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`사용자 장바구니 조회 실패: ${error.message}`);
      }

      return cart;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`사용자 장바구니 로드 실패: ${errorMessage}`, errorStack);
      return null;
    }
  }

  /**
   * 사용자 장바구니를 세션으로 로드
   */
  private async loadUserCartToSession(sessionId: string, userId: string): Promise<void> {
    const dbCart = await this.loadUserCartFromDatabase(userId);
    if (dbCart) {
      const session = this.convertDbCartToSession(dbCart, sessionId, userId);
      this.sessionStore.set(sessionId, session);
    }
  }

  /**
   * 데이터베이스 장바구니를 세션 형식으로 변환
   */
  private convertDbCartToSession(dbCart: any, sessionId: string, userId: string): CartSessionData {
    const items: CartSessionItem[] = (dbCart.cart_items || []).map(item => ({
      id: item.id,
      menuItemId: item.menu_item_id,
      quantity: item.quantity,
      selectedOptions: item.selected_options || [],
      specialInstructions: item.special_instructions,
      addedAt: new Date(item.added_at),
      updatedAt: new Date(item.updated_at)
    }));

    return {
      id: sessionId,
      restaurantId: dbCart.restaurant_id,
      items,
      createdAt: new Date(dbCart.created_at),
      updatedAt: new Date(dbCart.updated_at),
      expiresAt: new Date(dbCart.expires_at),
      userId
    };
  }

  /**
   * 새 세션 생성
   */
  private createNewSession(sessionId: string, userId?: string): CartSessionData {
    const now = new Date();
    const expiryHours = userId ? this.SESSION_EXPIRY_HOURS : this.ANONYMOUS_SESSION_EXPIRY_HOURS;
    const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);

    return {
      id: sessionId,
      items: [],
      createdAt: now,
      updatedAt: now,
      expiresAt,
      userId
    };
  }

  /**
   * 세션 만료 확인
   */
  private isSessionExpired(session: CartSessionData): boolean {
    return new Date() > session.expiresAt;
  }

  /**
   * 사용자 장바구니 비활성화
   */
  private async deactivateUserCart(userId: string): Promise<void> {
    try {
      await this.supabase
        .from('user_carts')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`사용자 장바구니 비활성화 실패: ${errorMessage}`, errorStack);
    }
  }

  /**
   * 장바구니 병합 전략
   * 기존 사용자 장바구니와 익명 세션 장바구니를 병합합니다.
   */
  private async mergeCartsStrategy(
    anonymousSession: CartSessionData,
    userCart: any,
    userId: string
  ): Promise<void> {
    try {
      // 병합 정책: 같은 레스토랑인 경우 병합, 다른 레스토랑인 경우 사용자에게 선택권 제공
      if (anonymousSession.restaurantId === userCart.restaurant_id) {
        // 같은 레스토랑: 아이템 병합
        const existingItems = new Map(userCart.cart_items.map((item: any) => [
          `${item.menu_item_id}_${JSON.stringify(item.selected_options)}`,
          item
        ]));

        // 익명 세션의 아이템들을 기존 장바구니에 병합
        for (const sessionItem of anonymousSession.items) {
          const key = `${sessionItem.menuItemId}_${JSON.stringify(sessionItem.selectedOptions)}`;
          const existingItem = existingItems.get(key) as any;

          if (existingItem) {
            // 기존 아이템이 있으면 수량 증가
            existingItem.quantity += sessionItem.quantity;
          } else {
            // 새 아이템 추가
            userCart.cart_items.push({
              menu_item_id: sessionItem.menuItemId,
              quantity: sessionItem.quantity,
              selected_options: sessionItem.selectedOptions,
              special_instructions: sessionItem.specialInstructions
            });
          }
        }

        // 병합된 장바구니를 세션에 반영
        anonymousSession.userId = userId;
        anonymousSession.restaurantId = userCart.restaurant_id;
        anonymousSession.items = userCart.cart_items.map((item: any) => ({
          id: item.id || this.generateItemId(),
          menuItemId: item.menu_item_id,
          quantity: item.quantity,
          selectedOptions: item.selected_options || [],
          specialInstructions: item.special_instructions,
          addedAt: new Date(item.added_at || Date.now()),
          updatedAt: new Date(item.updated_at || Date.now())
        }));

      } else {
        // 다른 레스토랑: 익명 세션을 우선 (최근 선택을 존중)
        // 기존 사용자 장바구니는 비활성화하고 익명 세션을 새 장바구니로 설정
        await this.deactivateUserCart(userId);
        anonymousSession.userId = userId;
      }

      anonymousSession.updatedAt = new Date();
      await this.syncSessionToDatabase(anonymousSession);

      this.logger.log(`사용자 ${userId}의 장바구니가 병합되었습니다.`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`장바구니 병합 실패: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  /**
   * 아이템 ID 생성
   */
  private generateItemId(): string {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 만료된 세션 정리
   * 정기적으로 호출하여 만료된 세션을 정리합니다.
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const now = new Date();
      let cleanedCount = 0;

      // 메모리에서 만료된 세션 제거
      for (const [sessionId, session] of this.sessionStore.entries()) {
        if (this.isSessionExpired(session)) {
          this.sessionStore.delete(sessionId);
          cleanedCount++;
        }
      }

      // 데이터베이스에서 만료된 장바구니 비활성화
      const { error } = await this.supabase
        .from('user_carts')
        .update({ is_active: false })
        .eq('is_active', true)
        .lt('expires_at', now.toISOString());

      if (error) {
        this.logger.error(`만료된 DB 장바구니 정리 실패: ${error.message}`);
      }

      if (cleanedCount > 0) {
        this.logger.log(`${cleanedCount}개의 만료된 세션이 정리되었습니다.`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`세션 정리 작업 실패: ${errorMessage}`, errorStack);
    }
  }

  /**
   * 세션 통계 조회
   */
  async getSessionStats(): Promise<{
    totalActiveSessions: number;
    anonymousSessions: number;
    userSessions: number;
    averageItemsPerCart: number;
  }> {
    const totalActiveSessions = this.sessionStore.size;
    let anonymousSessions = 0;
    let userSessions = 0;
    let totalItems = 0;

    for (const session of this.sessionStore.values()) {
      if (session.userId) {
        userSessions++;
      } else {
        anonymousSessions++;
      }
      totalItems += session.items.length;
    }

    return {
      totalActiveSessions,
      anonymousSessions,
      userSessions,
      averageItemsPerCart: totalActiveSessions > 0 ? totalItems / totalActiveSessions : 0
    };
  }
} 