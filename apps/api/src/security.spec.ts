/**
 * API 보안 테스트
 * 
 * 인증/권한, 입력 검증, SQL 인젝션 방지, XSS 방지 등을 검증합니다.
 * 외부 API 키 없이 기본 보안 검증만 수행합니다.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('API Security Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * HTTP 헤더 보안 테스트
   */
  describe('HTTP Headers Security', () => {
    it('should not expose sensitive server information', async () => {
      // When
      const response = await request(app.getHttpServer())
        .get('/')
        .expect(200);

      // Then
      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.headers.server).toBeUndefined();
    });

    it('should handle malicious user-agent strings safely', async () => {
      // Given
      const maliciousUserAgent = '<script>alert("xss")</script>';

      // When
      const response = await request(app.getHttpServer())
        .get('/')
        .set('User-Agent', maliciousUserAgent)
        .expect(200);

      // Then
      expect(response.status).toBe(200);
      expect(JSON.stringify(response.body)).not.toContain('<script>');
    });

    it('should handle oversized headers safely', async () => {
      // Given
      const oversizedHeader = 'x'.repeat(10000);

      // When & Then
      await request(app.getHttpServer())
        .get('/')
        .set('X-Custom-Header', oversizedHeader)
        .expect((res) => {
          // 서버가 요청을 거부하거나 정상 처리해야 함
          expect([200, 400, 413, 431]).toContain(res.status);
        });
    });
  });

  /**
   * 입력 검증 보안 테스트
   */
  describe('Input Validation Security', () => {
    it('should handle SQL injection attempts in query parameters', async () => {
      // Given
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; DELETE FROM users WHERE '1'='1'; --",
        "' UNION SELECT * FROM users --"
      ];

      // When & Then
      for (const payload of sqlInjectionPayloads) {
        await request(app.getHttpServer())
          .get(`/?search=${encodeURIComponent(payload)}`)
          .expect((res) => {
            expect([200, 400, 404]).toContain(res.status);
            expect(JSON.stringify(res.body)).not.toContain('DROP TABLE');
            expect(JSON.stringify(res.body)).not.toContain('DELETE FROM');
            expect(JSON.stringify(res.body)).not.toContain('UNION SELECT');
          });
      }
    });

    it('should handle XSS attempts in query parameters', async () => {
      // Given
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("xss")',
        '<svg onload="alert(1)">'
      ];

      // When & Then
      for (const payload of xssPayloads) {
        const response = await request(app.getHttpServer())
          .get(`/?data=${encodeURIComponent(payload)}`)
          .expect((res) => {
            expect([200, 400, 404]).toContain(res.status);
          });

        // 응답에 스크립트 태그가 그대로 포함되지 않아야 함
        expect(JSON.stringify(response.body)).not.toContain('<script');
        expect(JSON.stringify(response.body)).not.toContain('javascript:');
        expect(JSON.stringify(response.body)).not.toContain('onerror=');
      }
    });

    it('should handle NoSQL injection attempts', async () => {
      // Given
      const noSqlPayloads = [
        '{"$ne": null}',
        '{"$gt": ""}',
        '{"$regex": ".*"}',
        '{"$where": "function() { return true; }"}'
      ];

      // When & Then
      for (const payload of noSqlPayloads) {
        await request(app.getHttpServer())
          .get(`/?filter=${encodeURIComponent(payload)}`)
          .expect((res) => {
            expect([200, 400, 404]).toContain(res.status);
            expect(JSON.stringify(res.body)).not.toContain('$ne');
            expect(JSON.stringify(res.body)).not.toContain('$gt');
            expect(JSON.stringify(res.body)).not.toContain('$where');
          });
      }
    });

    it('should handle path traversal attempts', async () => {
      // Given
      const pathTraversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2f',
        '....//....//....//etc/passwd'
      ];

      // When & Then
      for (const payload of pathTraversalPayloads) {
        await request(app.getHttpServer())
          .get(`/${encodeURIComponent(payload)}`)
          .expect((res) => {
            expect([404, 400, 403]).toContain(res.status);
          });
      }
    });
  });

  /**
   * HTTP 메서드 보안 테스트
   */
  describe('HTTP Method Security', () => {
    it('should reject dangerous HTTP methods', async () => {
      // Given
      const dangerousMethods = ['TRACE', 'TRACK', 'DEBUG'];

      // When & Then
      for (const method of dangerousMethods) {
        await request(app.getHttpServer())
          [method.toLowerCase()]('/')
          .expect((res) => {
            expect([404, 405, 501]).toContain(res.status);
          });
      }
    });

    it('should handle HTTP method override attempts', async () => {
      // When & Then
      await request(app.getHttpServer())
        .post('/')
        .set('X-HTTP-Method-Override', 'DELETE')
        .expect((res) => {
          expect([404, 405, 400]).toContain(res.status);
        });
    });
  });

  /**
   * 요청 크기 및 속도 제한 테스트
   */
  describe('Request Limits Security', () => {
    it('should handle large request bodies safely', async () => {
      // Given
      const largeBody = { data: 'x'.repeat(100000) };

      // When & Then
      await request(app.getHttpServer())
        .post('/')
        .send(largeBody)
        .expect((res) => {
          expect([404, 413, 400]).toContain(res.status);
        });
    });

    it('should handle rapid successive requests', async () => {
      // Given
      const requestCount = 20;
      const requests = [];

      // When
      for (let i = 0; i < requestCount; i++) {
        requests.push(
          request(app.getHttpServer())
            .get('/health')
            .then(res => res.status)
        );
      }

      const responses = await Promise.all(requests);

      // Then
      responses.forEach(status => {
        expect([200, 429]).toContain(status); // 200 OK 또는 429 Too Many Requests
      });
    });
  });

  /**
   * 정보 노출 방지 테스트
   */
  describe('Information Disclosure Prevention', () => {
    it('should not expose stack traces in error responses', async () => {
      // When
      const response = await request(app.getHttpServer())
        .get('/non-existent-endpoint')
        .expect(404);

      // Then
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toMatch(/at\s+.*\s+\(/); // Stack trace pattern
      expect(responseText).not.toContain('node_modules');
      expect(responseText).not.toContain(__dirname);
    });

    it('should handle malformed JSON safely', async () => {
      // When
      const response = await request(app.getHttpServer())
        .post('/')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect((res) => {
          expect([400, 404]).toContain(res.status);
        });

      // Then
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toMatch(/SyntaxError/);
      expect(responseText).not.toContain('Unexpected token');
    });
  });

  /**
   * MIME 타입 및 파일 업로드 보안 테스트
   */
  describe('MIME Type Security', () => {
    it('should validate content-type headers', async () => {
      // Given
      const maliciousMimeTypes = [
        'application/x-msdownload',
        'application/octet-stream',
        'text/html',
        'application/javascript'
      ];

      // When & Then
      for (const mimeType of maliciousMimeTypes) {
        await request(app.getHttpServer())
          .post('/')
          .set('Content-Type', mimeType)
          .send('malicious content')
          .expect((res) => {
            expect([400, 404, 415]).toContain(res.status);
          });
      }
    });
  });

  /**
   * 암호화 및 인코딩 보안 테스트
   */
  describe('Encoding Security', () => {
    it('should handle various encoding attacks', async () => {
      // Given
      const encodingPayloads = [
        '%2522%253E%253Cscript%253Ealert%2528%2522XSS%2522%2529%253C%252Fscript%253E',
        '%3Cscript%3Ealert(String.fromCharCode(88,83,83))%3C/script%3E',
        '\uFEFF<script>alert("BOM")</script>',
        '&#60;script&#62;alert(&#34;XSS&#34;)&#60;/script&#62;'
      ];

      // When & Then
      for (const payload of encodingPayloads) {
        const response = await request(app.getHttpServer())
          .get(`/?test=${payload}`)
          .expect((res) => {
            expect([200, 400, 404]).toContain(res.status);
          });

        expect(JSON.stringify(response.body)).not.toContain('alert');
      }
    });

    it('should handle Unicode normalization attacks', async () => {
      // Given
      const unicodePayloads = [
        'admin\u0000',
        'test\uFFFE',
        '\u202E\u0061\u0064\u0074\u0073\u0065\u0074\u202D', // Right-to-left override
        'café', // Combined characters
        'café' // Separate characters
      ];

      // When & Then
      for (const payload of unicodePayloads) {
        await request(app.getHttpServer())
          .get(`/?username=${encodeURIComponent(payload)}`)
          .expect((res) => {
            expect([200, 400, 404]).toContain(res.status);
          });
      }
    });
  });

  /**
   * CORS 보안 테스트
   */
  describe('CORS Security', () => {
    it('should handle malicious origin headers', async () => {
      // Given
      const maliciousOrigins = [
        'https://evil.com',
        'null',
        'https://subdomain.evil.com',
        'data:text/html,<script>alert(1)</script>'
      ];

      // When & Then
      for (const origin of maliciousOrigins) {
        const response = await request(app.getHttpServer())
          .get('/')
          .set('Origin', origin)
          .expect(200);

        // CORS 헤더가 적절히 설정되어야 함
        expect(response.headers['access-control-allow-origin']).not.toBe(origin);
      }
    });
  });

  /**
   * 캐시 보안 테스트
   */
  describe('Cache Security', () => {
    it('should set appropriate cache control headers for sensitive endpoints', async () => {
      // When
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      // Then
      const cacheControl = response.headers['cache-control'];
      if (cacheControl) {
        expect(cacheControl).toMatch(/no-cache|no-store|private/);
      }
    });
  });
}); 