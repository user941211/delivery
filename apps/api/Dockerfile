# 멀티스테이지 빌드를 위한 API 서버 Dockerfile
# Stage 1: Build stage
FROM node:18-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# 루트 패키지 파일 복사
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# 워크스페이스 구조 복사
COPY apps/api/package.json ./apps/api/
COPY packages ./packages

# 의존성 설치 (개발 의존성 포함)
RUN yarn install --frozen-lockfile

# 소스 코드 복사
COPY apps/api ./apps/api
COPY packages ./packages

# TypeScript 컴파일 및 빌드
WORKDIR /app/apps/api
RUN yarn build

# Stage 2: Production stage
FROM node:18-alpine AS production

# 보안을 위한 non-root 사용자 생성
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# 필요한 시스템 패키지 설치
RUN apk add --no-cache dumb-init

# 작업 디렉토리 설정
WORKDIR /app

# 루트 패키지 파일 복사
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# 프로덕션 의존성만 복사
COPY apps/api/package.json ./apps/api/
COPY packages ./packages

# 프로덕션 의존성만 설치
RUN yarn workspaces focus @delivery-platform/api --production && yarn cache clean

# 빌드된 파일 복사
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages

# 환경 변수 설정
ENV NODE_ENV=production
ENV PORT=3000

# 포트 노출
EXPOSE 3000

# 사용자 변경
USER nestjs

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# 애플리케이션 시작 (dumb-init 사용으로 신호 처리 개선)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/api/dist/main.js"] 