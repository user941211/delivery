import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createSupabaseServerClient } from '../../../../packages/database/src/supabase';

/**
 * 관리자 서비스
 * 플랫폼 전체를 관리하는 관리자 기능의 핵심 비즈니스 로직을 담당
 */
@Injectable()
export class AdminService {
  private readonly supabase = createSupabaseServerClient();

  /**
   * 대시보드 개요 통계 조회
   */
  async getDashboardOverview() {
    try {
      const [
        userStats,
        restaurantStats,
        orderStats,
        revenueStats
      ] = await Promise.all([
        this.getUserStatistics(),
        this.getRestaurantStatistics(),
        this.getOrderStatistics(),
        this.getRevenueStatistics()
      ]);

      return {
        timestamp: new Date().toISOString(),
        users: userStats,
        restaurants: restaurantStats,
        orders: orderStats,
        revenue: revenueStats,
        summary: {
          totalUsers: userStats.total,
          activeRestaurants: restaurantStats.active,
          todayOrders: orderStats.today,
          monthlyRevenue: revenueStats.thisMonth
        }
      };
    } catch (error) {
      throw new BadRequestException('대시보드 통계 조회에 실패했습니다.');
    }
  }

  /**
   * 사용자 통계 조회
   */
  private async getUserStatistics() {
    const { data: users, error } = await this.supabase
      .from('users')
      .select('role, created_at, is_active');

    if (error) throw error;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      total: users.length,
      active: users.filter(u => u.is_active).length,
      inactive: users.filter(u => !u.is_active).length,
      today: users.filter(u => new Date(u.created_at) >= today).length,
      thisWeek: users.filter(u => new Date(u.created_at) >= thisWeek).length,
      thisMonth: users.filter(u => new Date(u.created_at) >= thisMonth).length,
      byRole: {
        customers: users.filter(u => u.role === 'customer').length,
        drivers: users.filter(u => u.role === 'driver').length,
        restaurant_owners: users.filter(u => u.role === 'restaurant_owner').length,
        admins: users.filter(u => u.role === 'admin').length
      }
    };

    return stats;
  }

  /**
   * 레스토랑 통계 조회
   */
  private async getRestaurantStatistics() {
    const { data: restaurants, error } = await this.supabase
      .from('restaurants')
      .select('is_verified, is_open, created_at, rating');

    if (error) throw error;

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      total: restaurants.length,
      verified: restaurants.filter(r => r.is_verified).length,
      pending: restaurants.filter(r => !r.is_verified).length,
      active: restaurants.filter(r => r.is_open).length,
      inactive: restaurants.filter(r => !r.is_open).length,
      thisMonth: restaurants.filter(r => new Date(r.created_at) >= thisMonth).length,
      averageRating: restaurants.length > 0 
        ? restaurants.reduce((sum, r) => sum + r.rating, 0) / restaurants.length 
        : 0
    };
  }

  /**
   * 주문 통계 조회
   */
  private async getOrderStatistics() {
    const { data: orders, error } = await this.supabase
      .from('orders')
      .select('status, created_at, total_amount');

    if (error) throw error;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      total: orders.length,
      today: orders.filter(o => new Date(o.created_at) >= today).length,
      thisWeek: orders.filter(o => new Date(o.created_at) >= thisWeek).length,
      thisMonth: orders.filter(o => new Date(o.created_at) >= thisMonth).length,
      byStatus: {
        pending: orders.filter(o => o.status === 'pending').length,
        confirmed: orders.filter(o => o.status === 'confirmed').length,
        preparing: orders.filter(o => o.status === 'preparing').length,
        ready: orders.filter(o => o.status === 'ready').length,
        picked_up: orders.filter(o => o.status === 'picked_up').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length
      },
      averageOrderValue: orders.length > 0 
        ? orders.reduce((sum, o) => sum + o.total_amount, 0) / orders.length 
        : 0
    };
  }

  /**
   * 매출 통계 조회
   */
  private async getRevenueStatistics() {
    const { data: orders, error } = await this.supabase
      .from('orders')
      .select('total_amount, delivery_fee, created_at, status')
      .in('status', ['delivered']);

    if (error) throw error;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    const todayOrders = deliveredOrders.filter(o => new Date(o.created_at) >= today);
    const weekOrders = deliveredOrders.filter(o => new Date(o.created_at) >= thisWeek);
    const monthOrders = deliveredOrders.filter(o => new Date(o.created_at) >= thisMonth);

    // 플랫폼 수수료 계산 (배달비의 20% + 주문금액의 3% 가정)
    const calculateCommission = (orders: any[]) => {
      return orders.reduce((total, order) => {
        const deliveryCommission = order.delivery_fee * 0.2;
        const orderCommission = order.total_amount * 0.03;
        return total + deliveryCommission + orderCommission;
      }, 0);
    };

    return {
      total: deliveredOrders.reduce((sum, o) => sum + o.total_amount, 0),
      today: todayOrders.reduce((sum, o) => sum + o.total_amount, 0),
      thisWeek: weekOrders.reduce((sum, o) => sum + o.total_amount, 0),
      thisMonth: monthOrders.reduce((sum, o) => sum + o.total_amount, 0),
      commission: {
        total: calculateCommission(deliveredOrders),
        today: calculateCommission(todayOrders),
        thisWeek: calculateCommission(weekOrders),
        thisMonth: calculateCommission(monthOrders)
      }
    };
  }

  /**
   * 사용자 목록 조회 (관리자용)
   */
  async getUsers(page: number = 1, limit: number = 20, role?: string, status?: string) {
    let query = this.supabase
      .from('users')
      .select('*', { count: 'exact' });

    if (role) {
      query = query.eq('role', role as any);
    }

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    query = query.order('created_at', { ascending: false });

    const { data: users, error, count } = await query;

    if (error) {
      throw new BadRequestException('사용자 목록 조회에 실패했습니다.');
    }

    return {
      users,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
  }

  /**
   * 사용자 상태 변경 (활성화/비활성화)
   */
  async updateUserStatus(userId: string, isActive: boolean) {
    const { data: user, error } = await this.supabase
      .from('users')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error || !user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  /**
   * 레스토랑 목록 조회 (관리자용)
   */
  async getRestaurants(page: number = 1, limit: number = 20, status?: string) {
    let query = this.supabase
      .from('restaurants')
      .select(`
        *,
        owner:users!owner_id(id, full_name, email)
      `, { count: 'exact' });

    if (status === 'verified') {
      query = query.eq('is_verified', true);
    } else if (status === 'pending') {
      query = query.eq('is_verified', false);
    } else if (status === 'active') {
      query = query.eq('is_open', true);
    } else if (status === 'inactive') {
      query = query.eq('is_open', false);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    query = query.order('created_at', { ascending: false });

    const { data: restaurants, error, count } = await query;

    if (error) {
      throw new BadRequestException('레스토랑 목록 조회에 실패했습니다.');
    }

    return {
      restaurants,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
  }

  /**
   * 레스토랑 승인/거부
   */
  async updateRestaurantVerification(restaurantId: string, isVerified: boolean) {
    const { data: restaurant, error } = await this.supabase
      .from('restaurants')
      .update({ 
        is_verified: isVerified, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', restaurantId)
      .select(`
        *,
        owner:users!owner_id(id, full_name, email)
      `)
      .single();

    if (error || !restaurant) {
      throw new NotFoundException('레스토랑을 찾을 수 없습니다.');
    }

    return restaurant;
  }

  /**
   * 주문 목록 조회 (관리자용)
   */
  async getOrders(page: number = 1, limit: number = 20, status?: string, dateFrom?: string, dateTo?: string) {
    let query = this.supabase
      .from('orders')
      .select(`
        *,
        customer:users!customer_id(id, full_name, email),
        restaurant:restaurants!restaurant_id(id, name),
        driver:users!driver_id(id, full_name, email)
      `, { count: 'exact' });

    if (status) {
      query = query.eq('status', status as any);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    query = query.order('created_at', { ascending: false });

    const { data: orders, error, count } = await query;

    if (error) {
      throw new BadRequestException('주문 목록 조회에 실패했습니다.');
    }

    return {
      orders,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
  }

  /**
   * 리뷰 목록 조회 (관리자용)
   */
  async getReviews(page: number = 1, limit: number = 20, minRating?: number, maxRating?: number) {
    let query = this.supabase
      .from('reviews')
      .select(`
        *,
        customer:users!customer_id(id, full_name),
        restaurant:restaurants!restaurant_id(id, name),
        responses:review_responses(
          *,
          responder:users!responder_id(id, full_name)
        )
      `, { count: 'exact' });

    if (minRating) {
      query = query.gte('overall_rating', minRating);
    }

    if (maxRating) {
      query = query.lte('overall_rating', maxRating);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    query = query.order('created_at', { ascending: false });

    const { data: reviews, error, count } = await query;

    if (error) {
      throw new BadRequestException('리뷰 목록 조회에 실패했습니다.');
    }

    return {
      reviews,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
  }

  /**
   * 리뷰 표시/숨김 처리
   */
  async updateReviewVisibility(reviewId: string, isVisible: boolean) {
    const { data: review, error } = await this.supabase
      .from('reviews')
      .update({ 
        is_visible: isVisible, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', reviewId)
      .select(`
        *,
        customer:users!customer_id(id, full_name),
        restaurant:restaurants!restaurant_id(id, name)
      `)
      .single();

    if (error || !review) {
      throw new NotFoundException('리뷰를 찾을 수 없습니다.');
    }

    return review;
  }

  /**
   * 월별 매출 차트 데이터
   */
  async getMonthlyRevenueChart(year: number) {
    const { data: orders, error } = await this.supabase
      .from('orders')
      .select('total_amount, delivery_fee, created_at')
      .eq('status', 'delivered')
      .gte('created_at', `${year}-01-01`)
      .lt('created_at', `${year + 1}-01-01`);

    if (error) {
      throw new BadRequestException('매출 데이터 조회에 실패했습니다.');
    }

    const monthlyData = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      revenue: 0,
      commission: 0,
      orderCount: 0
    }));

    orders.forEach(order => {
      const month = new Date(order.created_at).getMonth();
      monthlyData[month].revenue += order.total_amount;
      monthlyData[month].commission += (order.delivery_fee * 0.2) + (order.total_amount * 0.03);
      monthlyData[month].orderCount += 1;
    });

    return monthlyData;
  }

  /**
   * 시스템 활동 로그 조회
   */
  async getSystemActivity(page: number = 1, limit: number = 50) {
    // 실제로는 별도의 로그 테이블에서 조회하거나 로깅 시스템과 연동
    // 여기서는 최근 주문, 사용자 가입, 레스토랑 등록 등의 활동을 조회
    const offset = (page - 1) * limit;

    const [recentOrders, recentUsers, recentRestaurants] = await Promise.all([
      this.supabase
        .from('orders')
        .select('id, status, created_at, customer:users!customer_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(20),
      
      this.supabase
        .from('users')
        .select('id, full_name, role, created_at')
        .order('created_at', { ascending: false })
        .limit(15),
      
      this.supabase
        .from('restaurants')
        .select('id, name, is_verified, created_at')
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    const activities: any[] = [];

    // 주문 활동
    recentOrders.data?.forEach(order => {
      activities.push({
        type: 'order',
        action: `주문 ${order.status}`,
        description: `${order.customer?.full_name}님이 주문을 ${order.status === 'pending' ? '생성했습니다' : `${order.status} 상태로 변경했습니다`}`,
        timestamp: order.created_at,
        entityId: order.id
      });
    });

    // 사용자 활동
    recentUsers.data?.forEach(user => {
      activities.push({
        type: 'user',
        action: '사용자 가입',
        description: `${user.full_name}님이 ${user.role} 역할로 가입했습니다`,
        timestamp: user.created_at,
        entityId: user.id
      });
    });

    // 레스토랑 활동
    recentRestaurants.data?.forEach(restaurant => {
      activities.push({
        type: 'restaurant',
        action: restaurant.is_verified ? '레스토랑 승인' : '레스토랑 등록',
        description: `${restaurant.name}이 ${restaurant.is_verified ? '승인되었습니다' : '등록되었습니다'}`,
        timestamp: restaurant.created_at,
        entityId: restaurant.id
      });
    });

    // 시간순 정렬
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      activities: activities.slice(offset, offset + limit),
      pagination: {
        page,
        limit,
        total: activities.length,
        totalPages: Math.ceil(activities.length / limit)
      }
    };
  }
} 