/**
 * 영업시간 관리 서비스
 * 
 * 레스토랑의 영업시간 설정, 특별 영업일 관리, 영업 상태 확인 등을 처리하는 서비스입니다.
 */

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BusinessHours } from '@delivery-platform/shared/src/types/base';
import { 
  UpdateBusinessHoursDto, 
  SpecialBusinessHoursDto, 
  BusinessStatusResponse, 
  WeeklyBusinessHoursResponse 
} from '../dto/business-hours.dto';

@Injectable()
export class BusinessHoursService {
  private readonly supabase: SupabaseClient;
  private readonly dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

  constructor(private readonly configService: ConfigService) {
    // Supabase 클라이언트 초기화
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is missing');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * 영업시간 업데이트
   */
  async updateBusinessHours(restaurantId: string, ownerId: string, updateDto: UpdateBusinessHoursDto): Promise<BusinessHours[]> {
    try {
      // 레스토랑 소유권 확인
      await this.verifyRestaurantOwnership(restaurantId, ownerId);

      // 영업시간 검증
      this.validateBusinessHours(updateDto.businessHours);

      // 영업시간 업데이트
      const businessHours = updateDto.businessHours.map(hours => ({
        day_of_week: hours.dayOfWeek,
        open_time: hours.openTime,
        close_time: hours.closeTime,
        is_closed: hours.isClosed || false,
      }));

      const { data, error } = await this.supabase
        .from('restaurants')
        .update({
          business_hours: businessHours,
          updated_at: new Date().toISOString(),
        })
        .eq('id', restaurantId)
        .eq('owner_id', ownerId)
        .select('business_hours')
        .single();

      if (error) {
        throw new BadRequestException(`영업시간 업데이트에 실패했습니다: ${error.message}`);
      }

      return this.mapToBusinessHours(data.business_hours);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('영업시간 업데이트 중 오류가 발생했습니다.');
    }
  }

  /**
   * 영업시간 조회
   */
  async getBusinessHours(restaurantId: string): Promise<WeeklyBusinessHoursResponse> {
    try {
      const { data, error } = await this.supabase
        .from('restaurants')
        .select('business_hours')
        .eq('id', restaurantId)
        .single();

      if (error || !data) {
        throw new NotFoundException('레스토랑을 찾을 수 없습니다.');
      }

      // 특별 영업일 조회
      const specialHours = await this.getSpecialBusinessHours(restaurantId);

      const weeklyHours = (data.business_hours || []).map((hours: any) => ({
        dayOfWeek: hours.day_of_week,
        dayName: this.dayNames[hours.day_of_week],
        openTime: hours.open_time,
        closeTime: hours.close_time,
        isClosed: hours.is_closed || false,
      }));

      return {
        weeklyHours,
        specialHours,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('영업시간 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 현재 영업 상태 확인
   */
  async getBusinessStatus(restaurantId: string): Promise<BusinessStatusResponse> {
    try {
      const { data, error } = await this.supabase
        .from('restaurants')
        .select('business_hours, status')
        .eq('id', restaurantId)
        .single();

      if (error || !data) {
        throw new NotFoundException('레스토랑을 찾을 수 없습니다.');
      }

      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:mm 형식
      const dayOfWeek = now.getDay();
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD 형식

      // 레스토랑 상태 확인
      if (data.status !== 'active') {
        return {
          isOpen: false,
          currentTime,
          todayHours: undefined,
          nextOpenTime: undefined,
        };
      }

      // 특별 영업일 확인
      const specialHours = await this.getTodaySpecialHours(restaurantId, today);
      if (specialHours) {
        const isOpen = specialHours.isClosed ? false : 
          (specialHours.openTime && specialHours.closeTime) ?
            currentTime >= specialHours.openTime && currentTime <= specialHours.closeTime :
            false;

        return {
          isOpen,
          currentTime,
          specialHours,
        };
      }

      // 일반 영업시간 확인
      const todayHours = (data.business_hours || []).find((hours: any) => hours.day_of_week === dayOfWeek);
      
      if (!todayHours || todayHours.is_closed) {
        const nextOpenTime = this.getNextOpenTime(data.business_hours, dayOfWeek);
        return {
          isOpen: false,
          currentTime,
          todayHours: todayHours ? {
            openTime: todayHours.open_time,
            closeTime: todayHours.close_time,
            isClosed: todayHours.is_closed,
          } : undefined,
          nextOpenTime,
        };
      }

      const isOpen = currentTime >= todayHours.open_time && currentTime <= todayHours.close_time;

      return {
        isOpen,
        currentTime,
        todayHours: {
          openTime: todayHours.open_time,
          closeTime: todayHours.close_time,
          isClosed: todayHours.is_closed,
        },
        nextOpenTime: isOpen ? undefined : this.getNextOpenTime(data.business_hours, dayOfWeek),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('영업 상태 확인 중 오류가 발생했습니다.');
    }
  }

  /**
   * 특별 영업일 설정
   */
  async setSpecialBusinessHours(restaurantId: string, ownerId: string, specialHoursDto: SpecialBusinessHoursDto): Promise<{ message: string }> {
    try {
      // 레스토랑 소유권 확인
      await this.verifyRestaurantOwnership(restaurantId, ownerId);

      // 특별 영업일 데이터 생성/업데이트
      const { error } = await this.supabase
        .from('special_business_hours')
        .upsert([
          {
            restaurant_id: restaurantId,
            date: specialHoursDto.date,
            open_time: specialHoursDto.openTime,
            close_time: specialHoursDto.closeTime,
            is_closed: specialHoursDto.isClosed || false,
            description: specialHoursDto.description,
            updated_at: new Date().toISOString(),
          },
        ]);

      if (error) {
        throw new BadRequestException(`특별 영업일 설정에 실패했습니다: ${error.message}`);
      }

      return { message: '특별 영업일이 성공적으로 설정되었습니다.' };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('특별 영업일 설정 중 오류가 발생했습니다.');
    }
  }

  /**
   * 특별 영업일 삭제
   */
  async deleteSpecialBusinessHours(restaurantId: string, ownerId: string, date: string): Promise<{ message: string }> {
    try {
      // 레스토랑 소유권 확인
      await this.verifyRestaurantOwnership(restaurantId, ownerId);

      const { error } = await this.supabase
        .from('special_business_hours')
        .delete()
        .eq('restaurant_id', restaurantId)
        .eq('date', date);

      if (error) {
        throw new BadRequestException(`특별 영업일 삭제에 실패했습니다: ${error.message}`);
      }

      return { message: '특별 영업일이 성공적으로 삭제되었습니다.' };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('특별 영업일 삭제 중 오류가 발생했습니다.');
    }
  }

  /**
   * 영업시간 검증
   */
  private validateBusinessHours(businessHours: any[]): void {
    for (const hours of businessHours) {
      if (!hours.isClosed && hours.openTime >= hours.closeTime) {
        throw new BadRequestException(`${this.dayNames[hours.dayOfWeek]}의 개점 시간이 폐점 시간보다 늦습니다.`);
      }
    }
  }

  /**
   * 다음 영업 시작 시간 계산
   */
  private getNextOpenTime(businessHours: any[], currentDay: number): string | undefined {
    // 오늘부터 7일 후까지 확인
    for (let i = 1; i <= 7; i++) {
      const nextDay = (currentDay + i) % 7;
      const nextDayHours = businessHours.find((hours: any) => hours.day_of_week === nextDay);
      
      if (nextDayHours && !nextDayHours.is_closed) {
        const dayName = this.dayNames[nextDay];
        return `${dayName} ${nextDayHours.open_time}`;
      }
    }
    
    return undefined;
  }

  /**
   * 특별 영업일 목록 조회
   */
  private async getSpecialBusinessHours(restaurantId: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('special_business_hours')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true });

    return (data || []).map(item => ({
      date: item.date,
      openTime: item.open_time,
      closeTime: item.close_time,
      isClosed: item.is_closed,
      description: item.description,
    }));
  }

  /**
   * 오늘의 특별 영업일 조회
   */
  private async getTodaySpecialHours(restaurantId: string, date: string): Promise<any | null> {
    const { data } = await this.supabase
      .from('special_business_hours')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('date', date)
      .single();

    if (!data) return null;

    return {
      date: data.date,
      openTime: data.open_time,
      closeTime: data.close_time,
      isClosed: data.is_closed,
      description: data.description,
    };
  }

  /**
   * 레스토랑 소유권 확인
   */
  private async verifyRestaurantOwnership(restaurantId: string, ownerId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('restaurants')
      .select('id')
      .eq('id', restaurantId)
      .eq('owner_id', ownerId)
      .single();

    if (error || !data) {
      throw new ForbiddenException('해당 레스토랑에 대한 권한이 없습니다.');
    }
  }

  /**
   * 데이터베이스 레코드를 BusinessHours 배열로 변환
   */
  private mapToBusinessHours(businessHours: any[]): BusinessHours[] {
    return (businessHours || []).map(hours => ({
      dayOfWeek: hours.day_of_week,
      openTime: hours.open_time,
      closeTime: hours.close_time,
      isClosed: hours.is_closed || false,
    }));
  }
} 