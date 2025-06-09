import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { EnvConfigUtil } from './common/utils/env-config.util';

/**
 * 배달 플랫폼 API 서버 부트스트랩
 * 
 * 주요 설정:
 * - 환경 설정 로드 및 검증
 * - CORS 설정
 * - 보안 헤더 (Helmet)
 * - 글로벌 검증 파이프
 * - Swagger API 문서화
 * - 환경별 포트 설정
 */
async function bootstrap() {
  // 환경 설정 로드 및 검증
  const envConfig = EnvConfigUtil.getInstance();
  
  try {
    envConfig.loadEnvironmentConfig();
    envConfig.logEnvironmentInfo();
    envConfig.validateSecuritySettings();
  } catch (error) {
    console.error('❌ 환경 설정 오류:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);
  
  // 설정 서비스 가져오기
  const configService = app.get(ConfigService);
  
  // 글로벌 API 접두사 설정
  app.setGlobalPrefix('api/v1');
  
  // CORS 설정 (환경별 도메인 허용)
  const corsOrigins = envConfig.getArray('CORS_ORIGINS', ',', [
    'http://localhost:3000', // Next.js 웹 앱
    'http://localhost:19006', // Expo 개발 서버
    configService.get('FRONTEND_URL', 'http://localhost:3000'),
  ]);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // 보안 헤더 설정 (환경별 적용)
  if (envConfig.getBoolean('ENABLE_HELMET', true)) {
    app.use(helmet({
      crossOriginEmbedderPolicy: false, // Swagger UI 호환성을 위해
    }));
  }

  // 글로벌 검증 파이프 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 속성 제거
      forbidNonWhitelisted: true, // 정의되지 않은 속성 전송 시 에러
      transform: true, // 타입 자동 변환
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger API 문서 설정 (프로덕션에서는 비활성화 가능)
  if (!envConfig.isProduction() || envConfig.getBoolean('ENABLE_SWAGGER', false)) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('배달 플랫폼 API')
      .setDescription(`
        고객, 배달 기사, 점주를 연결하는 종합적인 배달 플랫폼 API

        주요 기능:
        - 사용자 인증 및 권한 관리
        - 음식점 정보 관리
        - 메뉴 및 주문 처리
        - 실시간 배달 추적
        - 결제 시스템 연동
      `)
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'JWT 토큰을 입력하세요',
          in: 'header',
        },
        'JWT-auth', // 참조 이름
      )
      .addTag('App', '기본 애플리케이션 정보')
      .addTag('Auth', '인증 및 권한 관리')
      .addTag('Users', '사용자 관리')
      .addTag('Restaurants', '음식점 관리')
      .addTag('Orders', '주문 관리')
      .addTag('Health', '서버 상태 확인')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true, // 인증 정보 유지
        docExpansion: 'none', // 기본적으로 축소 상태
        filter: true, // 검색 필터 활성화
        showRequestDuration: true, // 요청 시간 표시
      },
      customSiteTitle: '배달 플랫폼 API 문서',
    });
  }

  // 서버 시작
  const port = envConfig.getNumber('API_PORT', 4000);
  await app.listen(port);

  console.log(`
🚀 배달 플랫폼 API 서버가 시작되었습니다!

📍 서버 주소: http://localhost:${port}
📚 API 문서: http://localhost:${port}/api/docs
🔍 헬스 체크: http://localhost:${port}/api/v1/health
⚙️  환경: ${envConfig.get('NODE_ENV', 'development')}
🔒 보안 모드: ${envConfig.isProduction() ? '프로덕션' : '개발'}
  `);
}

// 에러 핸들링
bootstrap().catch((error) => {
  console.error('❌ 서버 시작 중 오류 발생:', error instanceof Error ? error.message : error);
  process.exit(1);
});
