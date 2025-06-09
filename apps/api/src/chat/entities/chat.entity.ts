/**
 * 채팅 시스템 엔티티
 * 
 * 채팅방, 메시지, 참가자 데이터를 저장하기 위한 Supabase 테이블 인터페이스를 정의합니다.
 */

import { 
  ChatRoomType, 
  ChatRoomStatus, 
  MessageType, 
  MessageStatus, 
  ParticipantRole 
} from '../dto/chat.dto';

/**
 * 채팅방 엔티티
 */
export interface ChatRoomEntity {
  id: string;
  type: ChatRoomType;
  title: string;
  status: ChatRoomStatus;
  order_id?: string;
  restaurant_id?: string;
  created_by: string;
  participant_count: number;
  last_message_id?: string;
  last_message_content?: string;
  last_message_time?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

/**
 * 메시지 엔티티
 */
export interface MessageEntity {
  id: string;
  chat_room_id: string;
  sender_id: string;
  type: MessageType;
  content?: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_size?: number;
  latitude?: number;
  longitude?: number;
  reply_to_message_id?: string;
  status: MessageStatus;
  sent_at: string;
  delivered_at?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

/**
 * 채팅방 참가자 엔티티
 */
export interface ChatParticipantEntity {
  id: string;
  chat_room_id: string;
  user_id: string;
  role: ParticipantRole;
  last_read_message_id?: string;
  last_active_at: string;
  joined_at: string;
  left_at?: string;
  is_muted: boolean;
  notification_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 메시지 읽음 상태 엔티티
 */
export interface MessageReadStatusEntity {
  id: string;
  message_id: string;
  user_id: string;
  chat_room_id: string;
  read_at: string;
  created_at: string;
}

/**
 * 채팅방 설정 엔티티
 */
export interface ChatRoomSettingsEntity {
  id: string;
  chat_room_id: string;
  user_id: string;
  notifications_enabled: boolean;
  auto_reply_enabled: boolean;
  auto_reply_message?: string;
  quick_reply_options?: any;
  settings_data?: any;
  created_at: string;
  updated_at: string;
}

/**
 * 채팅 첨부파일 엔티티
 */
export interface ChatAttachmentEntity {
  id: string;
  message_id: string;
  chat_room_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  thumbnail_url?: string;
  uploaded_by: string;
  upload_status: 'uploading' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

/**
 * 채팅 블록/차단 엔티티
 */
export interface ChatBlockEntity {
  id: string;
  blocker_id: string;
  blocked_id: string;
  chat_room_id?: string;
  reason?: string;
  blocked_at: string;
  unblocked_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 채팅 템플릿 엔티티 (자주 사용하는 메시지)
 */
export interface ChatTemplateEntity {
  id: string;
  user_id: string;
  template_name: string;
  template_content: string;
  category: string;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 채팅 알림 설정 엔티티
 */
export interface ChatNotificationEntity {
  id: string;
  user_id: string;
  chat_room_id: string;
  notification_type: 'message' | 'mention' | 'system';
  is_enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Supabase Database 타입 정의
 */
export interface ChatDatabase {
  public: {
    Tables: {
      chat_rooms: {
        Row: ChatRoomEntity;
        Insert: Omit<ChatRoomEntity, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ChatRoomEntity, 'id' | 'created_at'>>;
      };
      messages: {
        Row: MessageEntity;
        Insert: Omit<MessageEntity, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<MessageEntity, 'id' | 'created_at'>>;
      };
      chat_participants: {
        Row: ChatParticipantEntity;
        Insert: Omit<ChatParticipantEntity, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ChatParticipantEntity, 'id' | 'created_at'>>;
      };
      message_read_status: {
        Row: MessageReadStatusEntity;
        Insert: Omit<MessageReadStatusEntity, 'id' | 'created_at'>;
        Update: Partial<Omit<MessageReadStatusEntity, 'id' | 'created_at'>>;
      };
      chat_room_settings: {
        Row: ChatRoomSettingsEntity;
        Insert: Omit<ChatRoomSettingsEntity, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ChatRoomSettingsEntity, 'id' | 'created_at'>>;
      };
      chat_attachments: {
        Row: ChatAttachmentEntity;
        Insert: Omit<ChatAttachmentEntity, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ChatAttachmentEntity, 'id' | 'created_at'>>;
      };
      chat_blocks: {
        Row: ChatBlockEntity;
        Insert: Omit<ChatBlockEntity, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ChatBlockEntity, 'id' | 'created_at'>>;
      };
      chat_templates: {
        Row: ChatTemplateEntity;
        Insert: Omit<ChatTemplateEntity, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ChatTemplateEntity, 'id' | 'created_at'>>;
      };
      chat_notifications: {
        Row: ChatNotificationEntity;
        Insert: Omit<ChatNotificationEntity, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ChatNotificationEntity, 'id' | 'created_at'>>;
      };
    };
    Views: {
      // 채팅방 상세 뷰 (참가자 정보 포함)
      chat_room_details: {
        Row: ChatRoomEntity & {
          participants: ChatParticipantEntity[];
          unread_count: number;
        };
      };
      // 메시지 상세 뷰 (발신자 정보 포함)
      message_details: {
        Row: MessageEntity & {
          sender_name: string;
          sender_role: ParticipantRole;
          read_count: number;
          reply_to_content?: string;
        };
      };
    };
    Functions: {
      // 읽지 않은 메시지 수 계산
      get_unread_message_count: {
        Args: {
          p_user_id: string;
          p_chat_room_id: string;
        };
        Returns: number;
      };
      // 채팅방 검색
      search_chat_rooms: {
        Args: {
          p_user_id: string;
          p_search_term: string;
          p_room_type?: ChatRoomType;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: ChatRoomEntity[];
      };
      // 메시지 검색
      search_messages: {
        Args: {
          p_chat_room_id: string;
          p_search_term: string;
          p_message_type?: MessageType;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: MessageEntity[];
      };
      // 채팅방 참가자 온라인 상태 확인
      get_participants_online_status: {
        Args: {
          p_chat_room_id: string;
        };
        Returns: {
          user_id: string;
          is_online: boolean;
          last_seen: string;
        }[];
      };
    };
  };
}

/**
 * 채팅 관련 뷰 타입들
 */
export type ChatRoomDetailView = ChatDatabase['public']['Views']['chat_room_details']['Row'];
export type MessageDetailView = ChatDatabase['public']['Views']['message_details']['Row'];

/**
 * 페이지네이션 결과 인터페이스
 */
export interface PaginatedChatResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * 채팅 통계 인터페이스
 */
export interface ChatAnalytics {
  totalChatRooms: number;
  activeChatRooms: number;
  totalMessages: number;
  totalParticipants: number;
  messagesByType: Record<MessageType, number>;
  roomsByType: Record<ChatRoomType, number>;
  dailyMessageCounts: { date: string; count: number }[];
  averageResponseTime: number; // 평균 응답 시간 (분)
  peakActiveHours: { hour: number; count: number }[];
} 