/**
 * 채팅 컨트롤러
 * 
 * 채팅방과 메시지 관련 REST API 엔드포인트를 제공합니다.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { ChatRoomService } from '../services/chat-room.service';
import { MessageService } from '../services/message.service';
import { PaginatedResult } from '../interfaces/common.interface';

import {
  CreateChatRoomDto,
  UpdateChatRoomDto,
  AddParticipantDto,
  SendMessageDto,
  MarkMessageAsReadDto,
  GetChatRoomsQueryDto,
  GetMessagesQueryDto,
  ChatRoomResponseDto,
  ParticipantResponseDto,
  MessageResponseDto,
  ChatStatsDto,
  ChatRoomSettingsDto
} from '../dto';

/**
 * 임시 요청 인터페이스 (실제로는 JWT에서 추출)
 */
interface AuthenticatedRequest {
  user: {
    id: string;
    name: string;
    role: string;
  };
}

/**
 * 채팅 컨트롤러 클래스
 */
@ApiTags('Chat')
@Controller('chat')
// @ApiBearerAuth() // JWT 인증이 구현되면 활성화
export class ChatController {
  constructor(
    private readonly chatRoomService: ChatRoomService,
    private readonly messageService: MessageService
  ) {}

  /**
   * 채팅방 생성
   */
  @Post('rooms')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '채팅방 생성' })
  @ApiResponse({
    status: 201,
    description: '채팅방이 성공적으로 생성되었습니다.',
    type: ChatRoomResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 요청입니다.' })
  @ApiResponse({ status: 409, description: '이미 존재하는 채팅방입니다.' })
  async createChatRoom(
    @Body() createChatRoomDto: CreateChatRoomDto,
    @Req() req: AuthenticatedRequest
  ): Promise<ChatRoomResponseDto> {
    // 실제로는 JWT에서 사용자 ID 추출
    const userId = req.user?.id || 'temp-user-id';
    return this.chatRoomService.createChatRoom(userId, createChatRoomDto);
  }

  /**
   * 채팅방 목록 조회
   */
  @Get('rooms')
  @ApiOperation({ summary: '채팅방 목록 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: ['order_support', 'delivery_coordination', 'pickup_coordination', 'customer_service', 'group_chat'] })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive', 'archived', 'blocked'] })
  @ApiQuery({ name: 'orderId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: '채팅방 목록이 성공적으로 조회되었습니다.',
    type: [ChatRoomResponseDto],
  })
  async getChatRooms(
    @Query() query: GetChatRoomsQueryDto,
    @Req() req: AuthenticatedRequest
  ): Promise<PaginatedResult<ChatRoomResponseDto>> {
    const userId = req.user?.id || 'temp-user-id';
    return this.chatRoomService.getChatRooms(userId, query);
  }

  /**
   * 채팅방 상세 조회
   */
  @Get('rooms/:roomId')
  @ApiOperation({ summary: '채팅방 상세 조회' })
  @ApiParam({ name: 'roomId', description: '채팅방 ID' })
  @ApiResponse({
    status: 200,
    description: '채팅방 정보가 성공적으로 조회되었습니다.',
    type: ChatRoomResponseDto,
  })
  @ApiResponse({ status: 404, description: '채팅방을 찾을 수 없습니다.' })
  @ApiResponse({ status: 403, description: '접근 권한이 없습니다.' })
  async getChatRoom(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Req() req: AuthenticatedRequest
  ): Promise<ChatRoomResponseDto> {
    const userId = req.user?.id || 'temp-user-id';
    return this.chatRoomService.getChatRoom(roomId, userId);
  }

  /**
   * 채팅방 수정
   */
  @Put('rooms/:roomId')
  @ApiOperation({ summary: '채팅방 수정' })
  @ApiParam({ name: 'roomId', description: '채팅방 ID' })
  @ApiResponse({
    status: 200,
    description: '채팅방이 성공적으로 수정되었습니다.',
    type: ChatRoomResponseDto,
  })
  @ApiResponse({ status: 404, description: '채팅방을 찾을 수 없습니다.' })
  @ApiResponse({ status: 403, description: '수정 권한이 없습니다.' })
  async updateChatRoom(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() updateChatRoomDto: UpdateChatRoomDto,
    @Req() req: AuthenticatedRequest
  ): Promise<ChatRoomResponseDto> {
    const userId = req.user?.id || 'temp-user-id';
    return this.chatRoomService.updateChatRoom(roomId, userId, updateChatRoomDto);
  }

  /**
   * 채팅방 참가자 목록 조회
   */
  @Get('rooms/:roomId/participants')
  @ApiOperation({ summary: '채팅방 참가자 목록 조회' })
  @ApiParam({ name: 'roomId', description: '채팅방 ID' })
  @ApiResponse({
    status: 200,
    description: '참가자 목록이 성공적으로 조회되었습니다.',
    type: [ParticipantResponseDto],
  })
  async getChatRoomParticipants(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Req() req: AuthenticatedRequest
  ): Promise<ParticipantResponseDto[]> {
    const userId = req.user?.id || 'temp-user-id';
    return this.chatRoomService.getChatRoomParticipants(roomId, userId);
  }

  /**
   * 채팅방 참가자 추가
   */
  @Post('rooms/:roomId/participants')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '채팅방 참가자 추가' })
  @ApiParam({ name: 'roomId', description: '채팅방 ID' })
  @ApiResponse({
    status: 201,
    description: '참가자가 성공적으로 추가되었습니다.',
    type: ParticipantResponseDto,
  })
  @ApiResponse({ status: 400, description: '이미 참가한 사용자입니다.' })
  @ApiResponse({ status: 403, description: '참가자 추가 권한이 없습니다.' })
  async addParticipant(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() addParticipantDto: Omit<AddParticipantDto, 'chatRoomId'>,
    @Req() req: AuthenticatedRequest
  ): Promise<ParticipantResponseDto> {
    const userId = req.user?.id || 'temp-user-id';
    const fullDto: AddParticipantDto = {
      chatRoomId: roomId,
      ...addParticipantDto
    };
    return this.chatRoomService.addParticipant(fullDto, userId);
  }

  /**
   * 채팅방 나가기
   */
  @Delete('rooms/:roomId/participants/:participantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '채팅방 나가기' })
  @ApiParam({ name: 'roomId', description: '채팅방 ID' })
  @ApiParam({ name: 'participantId', description: '참가자 사용자 ID' })
  @ApiResponse({ status: 204, description: '성공적으로 채팅방을 나갔습니다.' })
  @ApiResponse({ status: 404, description: '참가자를 찾을 수 없습니다.' })
  async removeParticipant(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('participantId', ParseUUIDPipe) participantId: string,
    @Req() req: AuthenticatedRequest
  ): Promise<void> {
    const userId = req.user?.id || 'temp-user-id';
    return this.chatRoomService.removeParticipant(roomId, participantId, userId);
  }

  /**
   * 채팅방 설정 수정
   */
  @Put('rooms/:roomId/settings')
  @ApiOperation({ summary: '채팅방 설정 수정' })
  @ApiParam({ name: 'roomId', description: '채팅방 ID' })
  @ApiResponse({ status: 200, description: '설정이 성공적으로 수정되었습니다.' })
  async updateChatRoomSettings(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() settings: ChatRoomSettingsDto,
    @Req() req: AuthenticatedRequest
  ): Promise<any> {
    const userId = req.user?.id || 'temp-user-id';
    return this.chatRoomService.updateChatRoomSettings(roomId, userId, settings);
  }

  /**
   * 메시지 목록 조회
   */
  @Get('rooms/:roomId/messages')
  @ApiOperation({ summary: '메시지 목록 조회' })
  @ApiParam({ name: 'roomId', description: '채팅방 ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'beforeMessageId', required: false, type: String })
  @ApiQuery({ name: 'messageType', required: false, enum: ['text', 'image', 'file', 'location', 'system', 'order_info', 'quick_reply'] })
  @ApiResponse({
    status: 200,
    description: '메시지 목록이 성공적으로 조회되었습니다.',
    type: [MessageResponseDto],
  })
  async getMessages(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: Omit<GetMessagesQueryDto, 'chatRoomId'>,
    @Req() req: AuthenticatedRequest
  ): Promise<PaginatedResult<MessageResponseDto>> {
    const userId = req.user?.id || 'temp-user-id';
    const fullQuery: GetMessagesQueryDto = {
      chatRoomId: roomId,
      ...query
    };
    return this.messageService.getMessages(userId, fullQuery);
  }

  /**
   * 메시지 전송 (HTTP 방식 - 파일 업로드 등에 사용)
   */
  @Post('rooms/:roomId/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '메시지 전송 (HTTP)' })
  @ApiParam({ name: 'roomId', description: '채팅방 ID' })
  @ApiResponse({
    status: 201,
    description: '메시지가 성공적으로 전송되었습니다.',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 403, description: '메시지 전송 권한이 없습니다.' })
  async sendMessage(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() sendMessageDto: Omit<SendMessageDto, 'chatRoomId'>,
    @Req() req: AuthenticatedRequest
  ): Promise<MessageResponseDto> {
    const userId = req.user?.id || 'temp-user-id';
    const fullDto: SendMessageDto = {
      chatRoomId: roomId,
      ...sendMessageDto
    };
    const result = await this.messageService.sendMessage(userId, fullDto);
    return result.message;
  }

  /**
   * 메시지 상세 조회
   */
  @Get('messages/:messageId')
  @ApiOperation({ summary: '메시지 상세 조회' })
  @ApiParam({ name: 'messageId', description: '메시지 ID' })
  @ApiResponse({
    status: 200,
    description: '메시지가 성공적으로 조회되었습니다.',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 404, description: '메시지를 찾을 수 없습니다.' })
  async getMessage(
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Req() req: AuthenticatedRequest
  ): Promise<MessageResponseDto> {
    const userId = req.user?.id || 'temp-user-id';
    return this.messageService.getMessage(messageId, userId);
  }

  /**
   * 메시지 읽음 처리
   */
  @Post('rooms/:roomId/messages/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '메시지 읽음 처리' })
  @ApiParam({ name: 'roomId', description: '채팅방 ID' })
  @ApiResponse({ status: 204, description: '메시지가 성공적으로 읽음 처리되었습니다.' })
  async markMessagesAsRead(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() markReadDto: Omit<MarkMessageAsReadDto, 'chatRoomId'>,
    @Req() req: AuthenticatedRequest
  ): Promise<void> {
    const userId = req.user?.id || 'temp-user-id';
    const fullDto: MarkMessageAsReadDto = {
      chatRoomId: roomId,
      ...markReadDto
    };
    return this.messageService.markMessagesAsRead(userId, fullDto);
  }

  /**
   * 메시지 검색
   */
  @Get('rooms/:roomId/messages/search')
  @ApiOperation({ summary: '메시지 검색' })
  @ApiParam({ name: 'roomId', description: '채팅방 ID' })
  @ApiQuery({ name: 'q', description: '검색어' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: '메시지 검색이 성공적으로 완료되었습니다.',
    type: [MessageResponseDto],
  })
  async searchMessages(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query('q') searchTerm: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Req() req: AuthenticatedRequest
  ): Promise<PaginatedResult<MessageResponseDto>> {
    const userId = req.user?.id || 'temp-user-id';
    return this.messageService.searchMessages(userId, roomId, searchTerm, page, limit);
  }

  /**
   * 읽지 않은 메시지 수 조회
   */
  @Get('rooms/:roomId/unread-count')
  @ApiOperation({ summary: '읽지 않은 메시지 수 조회' })
  @ApiParam({ name: 'roomId', description: '채팅방 ID' })
  @ApiResponse({
    status: 200,
    description: '읽지 않은 메시지 수가 성공적으로 조회되었습니다.',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' }
      }
    }
  })
  async getUnreadMessageCount(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Req() req: AuthenticatedRequest
  ): Promise<{ count: number }> {
    const userId = req.user?.id || 'temp-user-id';
    const count = await this.messageService.getUnreadMessageCount(roomId, userId);
    return { count };
  }

  /**
   * 채팅 통계 조회
   */
  @Get('stats')
  @ApiOperation({ summary: '채팅 통계 조회' })
  @ApiResponse({
    status: 200,
    description: '채팅 통계가 성공적으로 조회되었습니다.',
    type: ChatStatsDto,
  })
  async getChatStats(
    @Req() req: AuthenticatedRequest
  ): Promise<ChatStatsDto> {
    const userId = req.user?.id || 'temp-user-id';
    return this.chatRoomService.getChatStats(userId);
  }

  /**
   * 시스템 메시지 전송 (관리자 전용)
   */
  @Post('rooms/:roomId/system-message')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '시스템 메시지 전송 (관리자 전용)' })
  @ApiParam({ name: 'roomId', description: '채팅방 ID' })
  @ApiResponse({
    status: 201,
    description: '시스템 메시지가 성공적으로 전송되었습니다.',
    type: MessageResponseDto,
  })
  async sendSystemMessage(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() body: { content: string; metadata?: any },
    @Req() req: AuthenticatedRequest
  ): Promise<MessageResponseDto> {
    // 실제로는 관리자 권한 확인 필요
    return this.messageService.sendSystemMessage(roomId, body.content, body.metadata);
  }
} 