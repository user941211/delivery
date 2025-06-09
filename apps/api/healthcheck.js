/**
 * Docker 헬스체크 스크립트
 * 
 * API 서버의 상태를 확인하여 컨테이너 헬스를 체크합니다.
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/health',
  method: 'GET',
  timeout: 2000
};

const request = http.request(options, (response) => {
  console.log(`Health check status: ${response.statusCode}`);
  
  if (response.statusCode === 200) {
    process.exit(0); // 정상
  } else {
    process.exit(1); // 비정상
  }
});

request.on('error', (error) => {
  console.error(`Health check failed: ${error.message}`);
  process.exit(1); // 비정상
});

request.on('timeout', () => {
  console.error('Health check timeout');
  request.abort();
  process.exit(1); // 비정상
});

request.end(); 