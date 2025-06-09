/**
 * 이미지 최적화 서비스
 * 
 * 이미지 압축, 포맷 변환, 썸네일 생성, CDN 연동 등을 통해
 * 이미지 로딩 성능을 개선합니다.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * 이미지 포맷 타입
 */
export enum ImageFormat {
  JPEG = 'jpeg',
  PNG = 'png',
  WEBP = 'webp',
  AVIF = 'avif'
}

/**
 * 이미지 크기 사전 정의
 */
export enum ImageSize {
  THUMBNAIL = 'thumbnail',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  ORIGINAL = 'original'
}

/**
 * 이미지 최적화 옵션
 */
export interface ImageOptimizationOptions {
  format?: ImageFormat;
  quality?: number;
  width?: number;
  height?: number;
  fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
  progressive?: boolean;
  stripMetadata?: boolean;
  watermark?: {
    text?: string;
    image?: string;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity?: number;
  };
}

/**
 * 이미지 처리 결과
 */
export interface ImageProcessingResult {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  format: string;
  width: number;
  height: number;
  url: string;
  path: string;
  variants?: {
    [key in ImageSize]?: {
      url: string;
      path: string;
      size: number;
      width: number;
      height: number;
    };
  };
}

/**
 * CDN 설정
 */
export interface CDNConfig {
  provider: 'cloudflare' | 'aws' | 'gcp' | 'azure' | 'custom';
  baseUrl: string;
  apiKey?: string;
  secretKey?: string;
  bucket?: string;
  region?: string;
}

/**
 * 이미지 메타데이터 인터페이스 (Sharp 대체)
 */
export interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  hasAlpha?: boolean;
  size?: number;
}

@Injectable()
export class ImageOptimizationService {
  private readonly logger = new Logger(ImageOptimizationService.name);
  private readonly uploadDir: string;
  private readonly cdnConfig: CDNConfig;
  
  // 사전 정의된 크기 설정
  private readonly sizePresets = {
    [ImageSize.THUMBNAIL]: { width: 150, height: 150, fit: 'cover' as const },
    [ImageSize.SMALL]: { width: 300, height: 300, fit: 'inside' as const },
    [ImageSize.MEDIUM]: { width: 600, height: 600, fit: 'inside' as const },
    [ImageSize.LARGE]: { width: 1200, height: 1200, fit: 'inside' as const }
  };

  // 포맷별 품질 설정
  private readonly qualityPresets = {
    [ImageFormat.JPEG]: 85,
    [ImageFormat.PNG]: 90,
    [ImageFormat.WEBP]: 80,
    [ImageFormat.AVIF]: 75
  };

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
    this.cdnConfig = {
      provider: this.configService.get<string>('CDN_PROVIDER', 'custom') as CDNConfig['provider'],
      baseUrl: this.configService.get<string>('CDN_BASE_URL', ''),
      apiKey: this.configService.get<string>('CDN_API_KEY'),
      secretKey: this.configService.get<string>('CDN_SECRET_KEY'),
      bucket: this.configService.get<string>('CDN_BUCKET'),
      region: this.configService.get<string>('CDN_REGION', 'us-east-1')
    };

    this.ensureUploadDirectory();
  }

  /**
   * 이미지 최적화 (단일 이미지)
   */
  async optimizeImage(
    inputPath: string,
    outputPath: string,
    options: ImageOptimizationOptions = {}
  ): Promise<ImageProcessingResult> {
    try {
      const startTime = Date.now();
      
      // 원본 파일 정보
      const originalStats = await fs.stat(inputPath);
      const originalSize = originalStats.size;

      // Sharp 인스턴스 생성
      let image = sharp(inputPath);
      const metadata = await image.metadata();

      // 리사이징
      if (options.width || options.height) {
        image = image.resize({
          width: options.width,
          height: options.height,
          fit: options.fit || 'inside',
          withoutEnlargement: true
        });
      }

      // 메타데이터 제거 (개인정보 보호)
      if (options.stripMetadata !== false) {
        image = image.removeProfile();
      }

      // 워터마크 추가
      if (options.watermark) {
        image = await this.addWatermark(image, options.watermark);
      }

      // 포맷 변환 및 품질 설정
      const format = options.format || this.getBestFormat(inputPath);
      const quality = options.quality || this.qualityPresets[format];

      switch (format) {
        case ImageFormat.JPEG:
          image = image.jpeg({
            quality,
            progressive: options.progressive !== false,
            mozjpeg: true
          });
          break;
        case ImageFormat.PNG:
          image = image.png({
            quality,
            progressive: options.progressive !== false,
            compressionLevel: 9
          });
          break;
        case ImageFormat.WEBP:
          image = image.webp({
            quality,
            effort: 6
          });
          break;
        case ImageFormat.AVIF:
          image = image.avif({
            quality,
            effort: 4
          });
          break;
      }

      // 이미지 저장
      await image.toFile(outputPath);

      // 최적화된 파일 정보
      const optimizedStats = await fs.stat(outputPath);
      const optimizedSize = optimizedStats.size;
      const compressionRatio = Math.round(((originalSize - optimizedSize) / originalSize) * 100);

      // 최종 메타데이터 조회
      const finalMetadata = await sharp(outputPath).metadata();

      const processingTime = Date.now() - startTime;
      this.logger.log(`Image optimized: ${path.basename(inputPath)} -> ${compressionRatio}% reduction in ${processingTime}ms`);

      return {
        originalSize,
        optimizedSize,
        compressionRatio,
        format,
        width: finalMetadata.width!,
        height: finalMetadata.height!,
        url: await this.generateCDNUrl(outputPath),
        path: outputPath
      };
    } catch (error) {
      this.logger.error(`Image optimization failed: ${error.message}`, error);
      throw new Error(`Failed to optimize image: ${error.message}`);
    }
  }

  /**
   * 다중 크기 이미지 생성 (반응형 이미지)
   */
  async generateResponsiveImages(
    inputPath: string,
    baseOutputPath: string,
    options: ImageOptimizationOptions = {}
  ): Promise<ImageProcessingResult> {
    try {
      const startTime = Date.now();
      const variants: ImageProcessingResult['variants'] = {};

      // 원본 이미지 최적화
      const originalResult = await this.optimizeImage(inputPath, baseOutputPath, options);

      // 각 크기별 변형 생성
      for (const [sizeName, sizeConfig] of Object.entries(this.sizePresets)) {
        const size = sizeName as ImageSize;
        const variantPath = this.generateVariantPath(baseOutputPath, size);
        
        const variantOptions: ImageOptimizationOptions = {
          ...options,
          ...sizeConfig
        };

        const variantResult = await this.optimizeImage(inputPath, variantPath, variantOptions);
        
        variants[size] = {
          url: variantResult.url,
          path: variantResult.path,
          size: variantResult.optimizedSize,
          width: variantResult.width,
          height: variantResult.height
        };
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(`Responsive images generated in ${processingTime}ms`);

      return {
        ...originalResult,
        variants
      };
    } catch (error) {
      this.logger.error(`Responsive image generation failed: ${error.message}`, error);
      throw new Error(`Failed to generate responsive images: ${error.message}`);
    }
  }

  /**
   * WebP 변환 (브라우저 호환성)
   */
  async convertToWebP(inputPath: string, outputPath?: string): Promise<ImageProcessingResult> {
    const webpPath = outputPath || this.generateWebPPath(inputPath);
    
    return this.optimizeImage(inputPath, webpPath, {
      format: ImageFormat.WEBP,
      stripMetadata: true
    });
  }

  /**
   * 배치 이미지 최적화
   */
  async optimizeBatch(
    inputPaths: string[],
    outputDir: string,
    options: ImageOptimizationOptions = {},
    concurrency: number = 3
  ): Promise<ImageProcessingResult[]> {
    this.logger.log(`Starting batch optimization of ${inputPaths.length} images`);
    
    const results: ImageProcessingResult[] = [];
    const semaphore = new Array(concurrency).fill(null);

    const processImage = async (inputPath: string): Promise<ImageProcessingResult> => {
      const filename = path.basename(inputPath);
      const outputPath = path.join(outputDir, filename);
      
      return this.optimizeImage(inputPath, outputPath, options);
    };

    // 병렬 처리로 성능 개선
    await Promise.all(
      semaphore.map(async () => {
        while (inputPaths.length > 0) {
          const inputPath = inputPaths.shift();
          if (inputPath) {
            try {
              const result = await processImage(inputPath);
              results.push(result);
            } catch (error) {
              this.logger.error(`Failed to process ${inputPath}: ${error.message}`);
            }
          }
        }
      })
    );

    this.logger.log(`Batch optimization completed: ${results.length} images processed`);
    return results;
  }

  /**
   * 이미지 메타데이터 분석
   */
  async analyzeImage(imagePath: string): Promise<{
    metadata: sharp.Metadata;
    fileSize: number;
    estimatedOptimization: {
      webp: { estimatedSize: number; reduction: number };
      avif: { estimatedSize: number; reduction: number };
    };
    recommendations: string[];
  }> {
    try {
      const metadata = await sharp(imagePath).metadata();
      const stats = await fs.stat(imagePath);
      const fileSize = stats.size;

      const recommendations: string[] = [];

      // 최적화 제안
      if (fileSize > 1024 * 1024) { // 1MB 이상
        recommendations.push('파일 크기가 큽니다. 압축을 권장합니다.');
      }

      if (metadata.width && metadata.width > 1920) {
        recommendations.push('이미지가 너무 큽니다. 리사이징을 권장합니다.');
      }

      if (metadata.format === 'png' && !metadata.hasAlpha) {
        recommendations.push('투명도가 없는 PNG입니다. JPEG로 변환을 권장합니다.');
      }

      // WebP/AVIF 압축률 추정
      const estimatedWebPSize = Math.round(fileSize * 0.7); // 대략 30% 압축
      const estimatedAvifSize = Math.round(fileSize * 0.5); // 대략 50% 압축

      return {
        metadata,
        fileSize,
        estimatedOptimization: {
          webp: {
            estimatedSize: estimatedWebPSize,
            reduction: Math.round(((fileSize - estimatedWebPSize) / fileSize) * 100)
          },
          avif: {
            estimatedSize: estimatedAvifSize,
            reduction: Math.round(((fileSize - estimatedAvifSize) / fileSize) * 100)
          }
        },
        recommendations
      };
    } catch (error) {
      this.logger.error(`Image analysis failed: ${error.message}`, error);
      throw new Error(`Failed to analyze image: ${error.message}`);
    }
  }

  /**
   * 이미지 캐시 무효화
   */
  async invalidateImageCache(imagePath: string): Promise<void> {
    try {
      // CDN 캐시 무효화 (실제 구현 시 CDN 제공업체 API 사용)
      if (this.cdnConfig.provider && this.cdnConfig.baseUrl) {
        this.logger.log(`Invalidating CDN cache for: ${imagePath}`);
        // TODO: 실제 CDN API 호출 구현
      }

      // 로컬 캐시 무효화
      const cacheKey = this.generateCacheKey(imagePath);
      // TODO: 캐시 서비스와 연동
      
      this.logger.debug(`Cache invalidated for: ${imagePath}`);
    } catch (error) {
      this.logger.error(`Cache invalidation failed: ${error.message}`, error);
    }
  }

  /**
   * 워터마크 추가
   */
  private async addWatermark(
    image: sharp.Sharp,
    watermark: NonNullable<ImageOptimizationOptions['watermark']>
  ): Promise<sharp.Sharp> {
    if (watermark.text) {
      // 텍스트 워터마크
      const textSvg = this.generateTextWatermarkSVG(watermark.text, watermark.opacity || 0.5);
      return image.composite([{
        input: Buffer.from(textSvg),
        gravity: this.getGravityFromPosition(watermark.position || 'bottom-right')
      }]);
    } else if (watermark.image) {
      // 이미지 워터마크
      return image.composite([{
        input: watermark.image,
        gravity: this.getGravityFromPosition(watermark.position || 'bottom-right'),
        blend: 'over'
      }]);
    }

    return image;
  }

  /**
   * 텍스트 워터마크 SVG 생성
   */
  private generateTextWatermarkSVG(text: string, opacity: number): string {
    return `
      <svg width="200" height="50">
        <text x="10" y="30" 
              font-family="Arial" 
              font-size="16" 
              fill="white" 
              fill-opacity="${opacity}">
          ${text}
        </text>
      </svg>
    `;
  }

  /**
   * 위치를 Sharp gravity로 변환
   */
  private getGravityFromPosition(position: string): string {
    const positionMap: Record<string, string> = {
      'top-left': 'northwest',
      'top-right': 'northeast',
      'bottom-left': 'southwest',
      'bottom-right': 'southeast',
      'center': 'center'
    };

    return positionMap[position] || 'southeast';
  }

  /**
   * 최적 포맷 결정
   */
  private getBestFormat(filePath: string): ImageFormat {
    const ext = path.extname(filePath).toLowerCase();
    
    // 브라우저 지원도와 압축률을 고려한 포맷 선택
    switch (ext) {
      case '.png':
        return ImageFormat.WEBP; // PNG -> WebP로 변환하면 큰 압축률
      case '.jpg':
      case '.jpeg':
        return ImageFormat.WEBP; // JPEG -> WebP로 변환
      default:
        return ImageFormat.WEBP; // 기본값은 WebP
    }
  }

  /**
   * 변형 이미지 경로 생성
   */
  private generateVariantPath(basePath: string, size: ImageSize): string {
    const dir = path.dirname(basePath);
    const name = path.basename(basePath, path.extname(basePath));
    const ext = path.extname(basePath);
    
    return path.join(dir, `${name}_${size}${ext}`);
  }

  /**
   * WebP 경로 생성
   */
  private generateWebPPath(inputPath: string): string {
    const dir = path.dirname(inputPath);
    const name = path.basename(inputPath, path.extname(inputPath));
    
    return path.join(dir, `${name}.webp`);
  }

  /**
   * CDN URL 생성
   */
  private async generateCDNUrl(filePath: string): Promise<string> {
    if (!this.cdnConfig.baseUrl) {
      return filePath; // CDN 미설정 시 로컬 경로 반환
    }

    const relativePath = path.relative(this.uploadDir, filePath);
    return `${this.cdnConfig.baseUrl}/${relativePath}`;
  }

  /**
   * 캐시 키 생성
   */
  private generateCacheKey(imagePath: string): string {
    return `image:${Buffer.from(imagePath).toString('base64')}`;
  }

  /**
   * 업로드 디렉토리 확인/생성
   */
  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  /**
   * 이미지 포맷 지원 여부 확인
   */
  isFormatSupported(format: string): boolean {
    return Object.values(ImageFormat).includes(format as ImageFormat);
  }

  /**
   * 최적화 통계 조회
   */
  async getOptimizationStats(): Promise<{
    totalImages: number;
    totalOriginalSize: number;
    totalOptimizedSize: number;
    averageCompression: number;
    formatDistribution: Record<string, number>;
  }> {
    // 실제 구현 시 데이터베이스 또는 파일 시스템에서 통계 수집
    return {
      totalImages: 0,
      totalOriginalSize: 0,
      totalOptimizedSize: 0,
      averageCompression: 0,
      formatDistribution: {}
    };
  }
} 