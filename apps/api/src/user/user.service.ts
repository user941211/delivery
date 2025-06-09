/**
 * 사용자 프로필 서비스
 * 
 * 사용자 프로필 관련 비즈니스 로직을 처리하는 서비스입니다.
 */

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BaseUser } from '@delivery-platform/shared/src/types/user';
import { UpdateProfileDto, ChangePasswordDto } from './dto/profile.dto';

@Injectable()
export class UserService {
  private readonly supabase: SupabaseClient;

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
   * 사용자 프로필 조회
   */
  async getProfile(userId: string): Promise<BaseUser> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }

      return {
        id: data.id,
        email: data.email,
        username: data.username,
        fullName: data.full_name,
        phone: data.phone,
        role: data.role,
        status: data.status,
        isEmailVerified: data.is_email_verified || false,
        isPhoneVerified: data.is_phone_verified || false,
        profileImageUrl: data.profile_image_url,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        lastLoginAt: data.last_login_at ? new Date(data.last_login_at) : undefined,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('프로필 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 사용자 프로필 업데이트
   */
  async updateProfile(userId: string, updateData: UpdateProfileDto): Promise<BaseUser> {
    try {
      // 사용자명 중복 검사 (변경하는 경우)
      if (updateData.username) {
        await this.checkUsernameExists(updateData.username, userId);
      }

      // 전화번호 중복 검사 (변경하는 경우)
      if (updateData.phone) {
        await this.checkPhoneExists(updateData.phone, userId);
      }

      // 업데이트할 데이터 준비
      const updatePayload: any = {
        updated_at: new Date().toISOString(),
      };

      if (updateData.username) updatePayload.username = updateData.username;
      if (updateData.fullName) updatePayload.full_name = updateData.fullName;
      if (updateData.phone) updatePayload.phone = updateData.phone;
      if (updateData.profileImageUrl) updatePayload.profile_image_url = updateData.profileImageUrl;

      const { data, error } = await this.supabase
        .from('users')
        .update(updatePayload)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`프로필 업데이트에 실패했습니다: ${error.message}`);
      }

      return {
        id: data.id,
        email: data.email,
        username: data.username,
        fullName: data.full_name,
        phone: data.phone,
        role: data.role,
        status: data.status,
        isEmailVerified: data.is_email_verified || false,
        isPhoneVerified: data.is_phone_verified || false,
        profileImageUrl: data.profile_image_url,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        lastLoginAt: data.last_login_at ? new Date(data.last_login_at) : undefined,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('프로필 업데이트 중 오류가 발생했습니다.');
    }
  }

  /**
   * 비밀번호 변경
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;

    try {
      // 현재 비밀번호 확인
      const { data: user, error } = await this.supabase
        .from('users')
        .select('password_hash')
        .eq('id', userId)
        .single();

      if (error || !user) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }

      // 현재 비밀번호 검증 (임시로 단순 비교 - 추후 bcrypt로 개선 예정)
      if (currentPassword !== user.password_hash) {
        throw new BadRequestException('현재 비밀번호가 올바르지 않습니다.');
      }

      // 새 비밀번호 설정 (임시로 단순 처리 - 추후 bcrypt로 개선 예정)
      const hashedNewPassword = newPassword;

      // 비밀번호 업데이트
      const { error: updateError } = await this.supabase
        .from('users')
        .update({
          password_hash: hashedNewPassword,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        throw new BadRequestException(`비밀번호 변경에 실패했습니다: ${updateError.message}`);
      }

      return { message: '비밀번호가 성공적으로 변경되었습니다.' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('비밀번호 변경 중 오류가 발생했습니다.');
    }
  }

  /**
   * 계정 비활성화
   */
  async deactivateAccount(userId: string): Promise<{ message: string }> {
    try {
      const { error } = await this.supabase
        .from('users')
        .update({
          status: 'inactive',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        throw new BadRequestException(`계정 비활성화에 실패했습니다: ${error.message}`);
      }

      return { message: '계정이 비활성화되었습니다.' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('계정 비활성화 중 오류가 발생했습니다.');
    }
  }

  /**
   * 사용자명 중복 검사 (자신 제외)
   */
  private async checkUsernameExists(username: string, excludeUserId?: string): Promise<void> {
    let query = this.supabase
      .from('users')
      .select('id')
      .eq('username', username);

    if (excludeUserId) {
      query = query.neq('id', excludeUserId);
    }

    const { data } = await query.single();

    if (data) {
      throw new BadRequestException('이미 사용 중인 사용자명입니다.');
    }
  }

  /**
   * 전화번호 중복 검사 (자신 제외)
   */
  private async checkPhoneExists(phone: string, excludeUserId?: string): Promise<void> {
    let query = this.supabase
      .from('users')
      .select('id')
      .eq('phone', phone);

    if (excludeUserId) {
      query = query.neq('id', excludeUserId);
    }

    const { data } = await query.single();

    if (data) {
      throw new BadRequestException('이미 사용 중인 전화번호입니다.');
    }
  }
} 