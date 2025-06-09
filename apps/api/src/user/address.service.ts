/**
 * 주소 관리 서비스
 * 
 * 사용자 배달 주소 관련 비즈니스 로직을 처리하는 서비스입니다.
 */

import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CreateAddressDto, UpdateAddressDto, AddressResponse } from './dto/address.dto';

@Injectable()
export class AddressService {
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
   * 사용자의 모든 주소 조회
   */
  async getUserAddresses(userId: string): Promise<AddressResponse[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) {
        throw new BadRequestException(`주소 조회에 실패했습니다: ${error.message}`);
      }

      return data.map(address => this.mapToAddressResponse(address));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('주소 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 특정 주소 조회
   */
  async getAddress(userId: string, addressId: string): Promise<AddressResponse> {
    try {
      const { data, error } = await this.supabase
        .from('user_addresses')
        .select('*')
        .eq('id', addressId)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        throw new NotFoundException('주소를 찾을 수 없습니다.');
      }

      return this.mapToAddressResponse(data);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('주소 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 기본 주소 조회
   */
  async getDefaultAddress(userId: string): Promise<AddressResponse | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapToAddressResponse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * 새 주소 생성
   */
  async createAddress(userId: string, createAddressDto: CreateAddressDto): Promise<AddressResponse> {
    try {
      // 기본 주소로 설정하는 경우 기존 기본 주소 해제
      if (createAddressDto.isDefault) {
        await this.clearDefaultAddress(userId);
      }

      // 주소 생성
      const { data, error } = await this.supabase
        .from('user_addresses')
        .insert([
          {
            user_id: userId,
            name: createAddressDto.name,
            address: createAddressDto.address,
            detail_address: createAddressDto.detailAddress,
            zip_code: createAddressDto.zipCode,
            latitude: createAddressDto.latitude,
            longitude: createAddressDto.longitude,
            is_default: createAddressDto.isDefault || false,
            delivery_instructions: createAddressDto.deliveryInstructions,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`주소 생성에 실패했습니다: ${error.message}`);
      }

      return this.mapToAddressResponse(data);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('주소 생성 중 오류가 발생했습니다.');
    }
  }

  /**
   * 주소 업데이트
   */
  async updateAddress(userId: string, addressId: string, updateAddressDto: UpdateAddressDto): Promise<AddressResponse> {
    try {
      // 주소 존재 확인
      await this.getAddress(userId, addressId);

      // 업데이트할 데이터 준비
      const updatePayload: any = {
        updated_at: new Date().toISOString(),
      };

      if (updateAddressDto.name !== undefined) updatePayload.name = updateAddressDto.name;
      if (updateAddressDto.address !== undefined) updatePayload.address = updateAddressDto.address;
      if (updateAddressDto.detailAddress !== undefined) updatePayload.detail_address = updateAddressDto.detailAddress;
      if (updateAddressDto.zipCode !== undefined) updatePayload.zip_code = updateAddressDto.zipCode;
      if (updateAddressDto.latitude !== undefined) updatePayload.latitude = updateAddressDto.latitude;
      if (updateAddressDto.longitude !== undefined) updatePayload.longitude = updateAddressDto.longitude;
      if (updateAddressDto.deliveryInstructions !== undefined) updatePayload.delivery_instructions = updateAddressDto.deliveryInstructions;

      const { data, error } = await this.supabase
        .from('user_addresses')
        .update(updatePayload)
        .eq('id', addressId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`주소 업데이트에 실패했습니다: ${error.message}`);
      }

      return this.mapToAddressResponse(data);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('주소 업데이트 중 오류가 발생했습니다.');
    }
  }

  /**
   * 주소 삭제
   */
  async deleteAddress(userId: string, addressId: string): Promise<{ message: string }> {
    try {
      // 주소 존재 확인
      const address = await this.getAddress(userId, addressId);

      // 기본 주소는 삭제 불가 (다른 주소가 있는 경우)
      if (address.isDefault) {
        const allAddresses = await this.getUserAddresses(userId);
        if (allAddresses.length > 1) {
          throw new BadRequestException('기본 주소는 다른 주소를 기본 주소로 설정한 후 삭제할 수 있습니다.');
        }
      }

      const { error } = await this.supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', userId);

      if (error) {
        throw new BadRequestException(`주소 삭제에 실패했습니다: ${error.message}`);
      }

      return { message: '주소가 성공적으로 삭제되었습니다.' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('주소 삭제 중 오류가 발생했습니다.');
    }
  }

  /**
   * 기본 주소 설정
   */
  async setDefaultAddress(userId: string, addressId: string): Promise<AddressResponse> {
    try {
      // 주소 존재 확인
      await this.getAddress(userId, addressId);

      // 기존 기본 주소 해제
      await this.clearDefaultAddress(userId);

      // 새 기본 주소 설정
      const { data, error } = await this.supabase
        .from('user_addresses')
        .update({
          is_default: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', addressId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`기본 주소 설정에 실패했습니다: ${error.message}`);
      }

      return this.mapToAddressResponse(data);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('기본 주소 설정 중 오류가 발생했습니다.');
    }
  }

  /**
   * 배달 가능 지역 확인 (추후 구현)
   */
  async isDeliveryAvailable(latitude: number, longitude: number): Promise<boolean> {
    // TODO: 실제 배달 가능 지역 로직 구현
    // 현재는 모든 지역을 배달 가능으로 처리
    return true;
  }

  /**
   * 기존 기본 주소 해제 (내부 헬퍼 메서드)
   */
  private async clearDefaultAddress(userId: string): Promise<void> {
    await this.supabase
      .from('user_addresses')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('is_default', true);
  }

  /**
   * 데이터베이스 레코드를 AddressResponse로 변환 (내부 헬퍼 메서드)
   */
  private mapToAddressResponse(data: any): AddressResponse {
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      address: data.address,
      detailAddress: data.detail_address,
      zipCode: data.zip_code,
      latitude: data.latitude,
      longitude: data.longitude,
      isDefault: data.is_default,
      deliveryInstructions: data.delivery_instructions,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
} 