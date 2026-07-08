// config.ts가 부팅 시점에 필수 env를 검증하므로, 테스트 환경에서도 기본값이 있어야 한다.
// 개별 테스트가 vi.stubEnv로 특정 값을 덮어써도, vi.unstubAllEnvs()는 이 raw 할당을
// 되돌리지 않아 다음 테스트에서도 기본값이 유지된다.
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
process.env.GOOGLE_CLIENT_ID ??= 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET ??= 'test-google-client-secret';
process.env.GOOGLE_CALLBACK_URL ??= 'http://localhost:4000/api/v1/auth/google/callback';
process.env.YOUTUBE_API_KEY ??= 'test-youtube-api-key';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
