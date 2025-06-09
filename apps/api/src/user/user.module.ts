/**
 * 사용자 프로필 모듈
 * 
 * 사용자 프로필 관리 기능을 제공하는 모듈입니다.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserService } from './user.service';
import { AddressService } from './address.service';
import { FileUploadService } from './file-upload.service';
import { UserController } from './user.controller';

@Module({
  imports: [ConfigModule],
  controllers: [UserController],
  providers: [UserService, AddressService, FileUploadService],
  exports: [UserService, AddressService, FileUploadService],
})
export class UserModule {} 