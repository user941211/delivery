/**
 * 정적 파일 최적화 미들웨어
 * 
 * 정적 파일의 캐싱 헤더 설정, CDN 리다이렉트, 
 * 파일 압축 등을 통해 로딩 성능을 개선합니다.
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as mime from 'mime-types';

/**
 * 캐시 설정 타입
 */
interface CacheConfig {
  maxAge: number;
  public: boolean;
  immutable?: boolean;
  staleWhileRevalidate?: number;
}

/**
 * CDN 설정
 */
interface CDNSettings {
  enabled: boolean;
  baseUrl: string;
  domains: string[];
  bypassLocal: boolean;
}

@Injectable()
export class StaticFileOptimizationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(StaticFileOptimizationMiddleware.name);
  private readonly cdnSettings: CDNSettings;

  // 파일 타입별 캐시 설정 (초 단위)
  private readonly cacheSettings: Record<string, CacheConfig> = {
    // 이미지 파일 - 긴 캐시 (1년)
    'image/jpeg': { maxAge: 365 * 24 * 3600, public: true, immutable: true },
    'image/png': { maxAge: 365 * 24 * 3600, public: true, immutable: true },
    'image/webp': { maxAge: 365 * 24 * 3600, public: true, immutable: true },
    'image/svg+xml': { maxAge: 365 * 24 * 3600, public: true, immutable: true },
    'image/gif': { maxAge: 365 * 24 * 3600, public: true, immutable: true },

    // CSS/JS 파일 - 중간 캐시 (1개월)
    'text/css': { maxAge: 30 * 24 * 3600, public: true, staleWhileRevalidate: 3600 },
    'application/javascript': { maxAge: 30 * 24 * 3600, public: true, staleWhileRevalidate: 3600 },
    'text/javascript': { maxAge: 30 * 24 * 3600, public: true, staleWhileRevalidate: 3600 },

    // 폰트 파일 - 긴 캐시 (1년)
    'font/woff': { maxAge: 365 * 24 * 3600, public: true, immutable: true },
    'font/woff2': { maxAge: 365 * 24 * 3600, public: true, immutable: true },
    'font/ttf': { maxAge: 365 * 24 * 3600, public: true, immutable: true },
    'font/otf': { maxAge: 365 * 24 * 3600, public: true, immutable: true },

    // 비디오/오디오 - 중간 캐시 (1주)
    'video/mp4': { maxAge: 7 * 24 * 3600, public: true },
    'video/webm': { maxAge: 7 * 24 * 3600, public: true },
    'audio/mpeg': { maxAge: 7 * 24 * 3600, public: true },
    'audio/ogg': { maxAge: 7 * 24 * 3600, public: true },

    // 문서 파일 - 짧은 캐시 (1시간)
    'application/pdf': { maxAge: 3600, public: true, staleWhileRevalidate: 1800 },
    'application/msword': { maxAge: 3600, public: true, staleWhileRevalidate: 1800 },

    // 기본값 - 매우 짧은 캐시 (5분)
    'default': { maxAge: 300, public: true, staleWhileRevalidate: 60 }
  };

  constructor(private readonly configService: ConfigService) {
    this.cdnSettings = {
      enabled: this.configService.get<boolean>('CDN_ENABLED', false),
      baseUrl: this.configService.get<string>('CDN_BASE_URL', ''),
      domains: this.configService.get<string>('CDN_DOMAINS', '').split(',').filter(Boolean),
      bypassLocal: this.configService.get<boolean>('CDN_BYPASS_LOCAL', true)
    };
  }

  use(req: Request, res: Response, next: NextFunction) {
    // 정적 파일 요청 확인
    if (!this.isStaticFileRequest(req)) {
      return next();
    }

    const filePath = req.path;
    const fileExtension = path.extname(filePath).toLowerCase();
    const mimeType = mime.lookup(fileExtension) || 'application/octet-stream';

    // CDN 리다이렉트 확인
    if (this.shouldRedirectToCDN(req, filePath)) {
      return this.redirectToCDN(req, res, filePath);
    }

    // 캐시 헤더 설정
    this.setCacheHeaders(res, mimeType);

    // 보안 헤더 설정
    this.setSecurityHeaders(res, mimeType);

    // 성능 헤더 설정
    this.setPerformanceHeaders(res, filePath);

    // WebP 지원 확인 및 변환
    if (this.supportsWebP(req) && this.isImageFile(mimeType)) {
      const webpPath = this.getWebPPath(filePath);
      if (this.fileExists(webpPath)) {
        req.url = webpPath;
        res.setHeader('Content-Type', 'image/webp');
        res.setHeader('Vary', 'Accept');
      }
    }

    // 압축 지원 헤더 설정
    this.setCompressionHeaders(res, mimeType);

    next();
  }

  /**
   * 정적 파일 요청 확인
   */
  private isStaticFileRequest(req: Request): boolean {
    const staticPaths = ['/images', '/assets', '/uploads', '/static', '/public'];
    const staticExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', 
                             '.css', '.js', '.woff', '.woff2', '.ttf', '.otf',
                             '.mp4', '.webm', '.mp3', '.ogg', '.pdf'];

    // 경로 기반 확인
    if (staticPaths.some(path => req.path.startsWith(path))) {
      return true;
    }

    // 확장자 기반 확인
    const extension = path.extname(req.path).toLowerCase();
    return staticExtensions.includes(extension);
  }

  /**
   * CDN 리다이렉트 여부 확인
   */
  private shouldRedirectToCDN(req: Request, filePath: string): boolean {
    if (!this.cdnSettings.enabled || !this.cdnSettings.baseUrl) {
      return false;
    }

    // 로컬 환경에서는 CDN 우회
    if (this.cdnSettings.bypassLocal && this.isLocalEnvironment()) {
      return false;
    }

    // 이미 CDN 도메인에서 온 요청은 리다이렉트하지 않음
    const host = req.get('host');
    if (host && this.cdnSettings.domains.includes(host)) {
      return false;
    }

    // 큰 정적 파일만 CDN으로 리다이렉트
    return this.isLargeStaticFile(filePath);
  }

  /**
   * CDN으로 리다이렉트
   */
  private redirectToCDN(req: Request, res: Response, filePath: string): void {
    const cdnUrl = `${this.cdnSettings.baseUrl}${filePath}`;
    
    // 302 리다이렉트 (임시)
    res.redirect(302, cdnUrl);
    
    this.logger.debug(`Redirected to CDN: ${filePath} -> ${cdnUrl}`);
  }

  /**
   * 캐시 헤더 설정
   */
  private setCacheHeaders(res: Response, mimeType: string): void {
    const cacheConfig = this.cacheSettings[mimeType] || this.cacheSettings['default'];
    
    // Cache-Control 헤더
    let cacheControl = `max-age=${cacheConfig.maxAge}`;
    
    if (cacheConfig.public) {
      cacheControl += ', public';
    } else {
      cacheControl += ', private';
    }

    if (cacheConfig.immutable) {
      cacheControl += ', immutable';
    }

    if (cacheConfig.staleWhileRevalidate) {
      cacheControl += `, stale-while-revalidate=${cacheConfig.staleWhileRevalidate}`;
    }

    res.setHeader('Cache-Control', cacheControl);

    // ETag 설정 (변경 감지용)
    res.setHeader('ETag', `"${Date.now()}"`);

    // Expires 헤더 (하위 호환성)
    const expiresDate = new Date(Date.now() + cacheConfig.maxAge * 1000);
    res.setHeader('Expires', expiresDate.toUTCString());

    // Last-Modified 헤더
    res.setHeader('Last-Modified', new Date().toUTCString());
  }

  /**
   * 보안 헤더 설정
   */
  private setSecurityHeaders(res: Response, mimeType: string): void {
    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // 이미지 파일의 경우 추가 보안 헤더
    if (mimeType.startsWith('image/')) {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'");
    }

    // CSS/JS 파일의 경우
    if (mimeType.includes('css') || mimeType.includes('javascript')) {
      res.setHeader('X-Frame-Options', 'DENY');
    }
  }

  /**
   * 성능 헤더 설정
   */
  private setPerformanceHeaders(res: Response, filePath: string): void {
    // 파일 크기 힌트 (HTTP/2 서버 푸시용)
    const fileSize = this.estimateFileSize(filePath);
    if (fileSize > 0) {
      res.setHeader('Content-Length-Hint', fileSize.toString());
    }

    // 리소스 힌트
    if (this.isCriticalResource(filePath)) {
      res.setHeader('Link', '</critical.css>; rel=preload; as=style');
    }

    // 서비스 워커 캐시 힌트
    res.setHeader('SW-Cache-Control', 'max-age=86400');
  }

  /**
   * WebP 지원 확인
   */
  private supportsWebP(req: Request): boolean {
    const acceptHeader = req.get('Accept') || '';
    return acceptHeader.includes('image/webp');
  }

  /**
   * 이미지 파일 확인
   */
  private isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/') && !mimeType.includes('svg');
  }

  /**
   * WebP 경로 생성
   */
  private getWebPPath(originalPath: string): string {
    const extension = path.extname(originalPath);
    return originalPath.replace(extension, '.webp');
  }

  /**
   * 파일 존재 확인 (동기)
   */
  private fileExists(filePath: string): boolean {
    try {
      // 실제 구현에서는 파일 시스템 확인
      return false; // 임시로 false 반환
    } catch {
      return false;
    }
  }

  /**
   * 압축 헤더 설정
   */
  private setCompressionHeaders(res: Response, mimeType: string): void {
    // 압축 가능한 파일 타입
    const compressibleTypes = [
      'text/',
      'application/javascript',
      'application/json',
      'application/xml',
      'image/svg+xml'
    ];

    const isCompressible = compressibleTypes.some(type => mimeType.startsWith(type));
    
    if (isCompressible) {
      res.setHeader('Vary', 'Accept-Encoding');
    }
  }

  /**
   * 로컬 환경 확인
   */
  private isLocalEnvironment(): boolean {
    const env = this.configService.get<string>('NODE_ENV', 'development');
    return env === 'development' || env === 'test';
  }

  /**
   * 큰 정적 파일 확인
   */
  private isLargeStaticFile(filePath: string): boolean {
    const largeFileExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.webm', '.pdf'];
    const extension = path.extname(filePath).toLowerCase();
    return largeFileExtensions.includes(extension);
  }

  /**
   * 파일 크기 추정
   */
  private estimateFileSize(filePath: string): number {
    // 실제 구현에서는 파일 시스템에서 크기 조회
    const extension = path.extname(filePath).toLowerCase();
    
    // 확장자별 평균 크기 추정
    const averageSizes: Record<string, number> = {
      '.jpg': 150000,  // 150KB
      '.png': 200000,  // 200KB
      '.css': 50000,   // 50KB
      '.js': 100000,   // 100KB
      '.woff2': 30000, // 30KB
    };

    return averageSizes[extension] || 0;
  }

  /**
   * 중요한 리소스 확인
   */
  private isCriticalResource(filePath: string): boolean {
    const criticalPaths = ['/css/critical.css', '/js/critical.js', '/fonts/'];
    return criticalPaths.some(path => filePath.includes(path));
  }
}

/**
 * 정적 파일 압축 최적화 함수
 */
export class StaticFileOptimizer {
  private static readonly logger = new Logger(StaticFileOptimizer.name);

  /**
   * 정적 파일 압축 설정
   */
  static createCompressionOptions() {
    return {
      // 압축 레벨 (1-9)
      level: 6,
      
      // 압축할 최소 크기
      threshold: 1024,
      
      // 압축할 파일 타입
      filter: (req: any, res: any) => {
        const contentType = res.getHeader('content-type') as string;
        
        if (!contentType) return false;

        // 압축 가능한 타입
        const compressibleTypes = [
          'text/html',
          'text/css',
          'text/javascript',
          'application/javascript',
          'application/json',
          'application/xml',
          'text/xml',
          'image/svg+xml'
        ];

        return compressibleTypes.some(type => contentType.includes(type));
      }
    };
  }

  /**
   * 브라우저별 최적화 설정
   */
  static getBrowserOptimizations(userAgent: string): {
    supportsWebP: boolean;
    supportsAVIF: boolean;
    supportsBrotli: boolean;
    isModernBrowser: boolean;
  } {
    const ua = userAgent.toLowerCase();

    return {
      supportsWebP: ua.includes('chrome') || ua.includes('firefox') || ua.includes('edge'),
      supportsAVIF: ua.includes('chrome/') && this.chromeVersionSupportsAVIF(ua),
      supportsBrotli: ua.includes('chrome') || ua.includes('firefox') || ua.includes('safari'),
      isModernBrowser: !ua.includes('ie') && !ua.includes('trident')
    };
  }

  /**
   * Chrome AVIF 지원 버전 확인
   */
  private static chromeVersionSupportsAVIF(userAgent: string): boolean {
    const chromeMatch = userAgent.match(/chrome\/(\d+)/);
    if (!chromeMatch) return false;
    
    const version = parseInt(chromeMatch[1]);
    return version >= 85; // Chrome 85부터 AVIF 지원
  }

  /**
   * 레이지 로딩 스크립트 생성
   */
  static generateLazyLoadingScript(): string {
    return `
      <script>
        // 이미지 레이지 로딩
        if ('IntersectionObserver' in window) {
          const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
              }
            });
          });

          document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
          });
        }

        // WebP 지원 확인 및 적용
        function supportsWebP() {
          return new Promise(resolve => {
            const webP = new Image();
            webP.onload = webP.onerror = () => resolve(webP.height === 2);
            webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
          });
        }

        supportsWebP().then(supported => {
          if (supported) {
            document.documentElement.classList.add('webp');
          }
        });
      </script>
    `;
  }

  /**
   * 반응형 이미지 HTML 생성
   */
  static generateResponsiveImageHTML(
    basePath: string,
    alt: string,
    sizes: string = '(max-width: 768px) 100vw, 50vw'
  ): string {
    return `
      <picture>
        <source 
          srcset="${basePath}_small.webp 300w, ${basePath}_medium.webp 600w, ${basePath}_large.webp 1200w"
          type="image/webp"
          sizes="${sizes}">
        <source 
          srcset="${basePath}_small.jpg 300w, ${basePath}_medium.jpg 600w, ${basePath}_large.jpg 1200w"
          type="image/jpeg"
          sizes="${sizes}">
        <img 
          src="${basePath}_medium.jpg" 
          alt="${alt}"
          loading="lazy"
          class="responsive-image">
      </picture>
    `;
  }

  /**
   * 성능 통계 수집
   */
  static collectPerformanceMetrics(req: any, res: any, responseTime: number): void {
    const metrics = {
      timestamp: new Date().toISOString(),
      path: req.path,
      fileType: path.extname(req.path),
      responseTime,
      cacheHit: res.getHeader('x-cache') === 'HIT',
      compressionRatio: this.calculateCompressionRatio(res),
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer')
    };

    // 실제 환경에서는 모니터링 시스템으로 전송
    this.logger.debug('Static file metrics', metrics);
  }

  /**
   * 압축률 계산
   */
  private static calculateCompressionRatio(res: any): number {
    const originalSize = res.getHeader('x-original-size');
    const compressedSize = res.getHeader('content-length');
    
    if (!originalSize || !compressedSize) return 0;
    
    return Math.round(((originalSize - compressedSize) / originalSize) * 100);
  }
} 