# 멀티스테이지 빌드를 위한 Next.js 웹 앱 Dockerfile
# Stage 1: Dependencies
FROM node:18-alpine AS deps

# 보안 및 최적화를 위한 패키지 설치
RUN apk add --no-cache libc6-compat

# 작업 디렉토리 설정
WORKDIR /app

# 루트 패키지 파일 복사
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# 워크스페이스 구조 복사
COPY apps/web/package.json ./apps/web/
COPY packages ./packages

# 의존성 설치
RUN yarn install --frozen-lockfile

# Stage 2: Builder
FROM node:18-alpine AS builder

WORKDIR /app

# 의존성 복사
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/.yarn ./.yarn
COPY --from=deps /app/packages ./packages

# 애플리케이션 소스 복사
COPY apps/web ./apps/web
COPY package.json yarn.lock .yarnrc.yml ./

# Next.js 애플리케이션 빌드
WORKDIR /app/apps/web
ENV NEXT_TELEMETRY_DISABLED 1

# 프로덕션 빌드
RUN yarn build

# Stage 3: Production runner
FROM node:18-alpine AS runner

# 보안을 위한 non-root 사용자 생성
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

# 필요한 파일들 복사
COPY --from=builder /app/apps/web/next.config.js ./
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/package.json ./package.json

# Next.js 빌드 결과물 복사
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

# 환경 변수 설정
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3001

# 포트 노출
EXPOSE 3001

# 사용자 변경
USER nextjs

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# 애플리케이션 시작
CMD ["node", "server.js"] 