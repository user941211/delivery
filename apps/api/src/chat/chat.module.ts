/**
 * 채팅 모듈
 * 
 * 채팅 시스템의 모든 구성 요소를 통합하는 모듈입니다.
 */

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// 서비스
import { ChatRoomService, MessageService } from './services';

// 컨트롤러
import { ChatController } from './controllers';

// 게이트웨이
import { ChatGateway } from './gateways';

// 외부 모듈
import { RealtimeModule } from '../realtime/realtime.module';

/**
 * 채팅 모듈 클래스
 */
@Module({
  imports: [
    ConfigModule,
    // Realtime 모듈과의 상호 의존성 해결을 위해 forwardRef 사용
    forwardRef(() => RealtimeModule),
  ],
  controllers: [
    ChatController,
  ],
  providers: [
    // 서비스
    ChatRoomService,
    MessageService,
    
    // 게이트웨이
    ChatGateway,
  ],
  exports: [
    // 다른 모듈에서 사용할 수 있도록 서비스들을 export
    ChatRoomService,
    MessageService,
    ChatGateway,
  ],
})
export class ChatModule {
  constructor() {
    // 모듈 초기화 로그
    console.log('📢 ChatModule initialized - Real-time chat system ready');
  }
} 