// 간단한 HTTP 서버 테스트
const http = require('http');

const server = http.createServer((req: any, res: any) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    message: '배달 플랫폼 API 서버가 정상 작동 중입니다.',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  }));
});

const port = process.env.API_PORT || 4000;
server.listen(port, () => {
  console.log(`
🚀 배달 플랫폼 API 서버가 시작되었습니다!

📍 서버 주소: http://localhost:${port}
⚙️  환경: ${process.env.NODE_ENV || 'development'}
  `);
});

export {}; 