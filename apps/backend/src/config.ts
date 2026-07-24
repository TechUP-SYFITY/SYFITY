// src/config.ts
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`필수 환경변수 ${name}가 설정되지 않았습니다.`);
  }

  return value;
}

const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:3000';

function getCookieDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    if (!hostname) {
      throw new Error('hostname is empty');
    }

    return hostname;
  } catch {
    throw new Error('CLIENT_URL이 올바른 URL 형식이 아닙니다.');
  }
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: process.env.PORT ?? '4000',
  clientUrl,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
  vercelPreviewOriginPattern: process.env.VERCEL_PREVIEW_ORIGIN_PATTERN,
  // FE/BE가 서로 다른 서브도메인인 운영 환경에서 인증 쿠키를 공유하기 위한 Domain.
  // 별도 환경변수 없이 CLIENT_URL의 hostname을 재사용한다 (예: https://syfity.site → syfity.site).
  // Domain 속성은 leading dot 없이도 해당 도메인과 모든 서브도메인에 적용된다.
  cookieDomain: getCookieDomain(clientUrl),
  jwt: {
    accessSecret: requireEnv('JWT_ACCESS_SECRET'),
    refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    accessExpiresIn: '1h',
    accessExpiresInMs: 60 * 60 * 1000,
    refreshExpiresIn: '30d',
    refreshExpiresInMs: 30 * 24 * 60 * 60 * 1000,
  },
  google: {
    clientId: requireEnv('GOOGLE_CLIENT_ID'),
    clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
    callbackUrl: requireEnv('GOOGLE_CALLBACK_URL'),
  },
  youtube: {
    apiKey: requireEnv('YOUTUBE_API_KEY'),
  },
  // Playwright E2E에서 YouTube 호출을 스텁으로 대체하는 스위치.
  // 실제 적용 여부는 createYouTubeClient가 판단하며, 운영에서는 무시된다.
  e2eMode: process.env.E2E_MODE === 'true',
  db: {
    url: requireEnv('DATABASE_URL'),
  },
  cron: {
    secret: requireEnv('CRON_SECRET'),
  },
  healthchecks: {
    roomLifecycleUrl: process.env.HEALTHCHECKS_ROOM_LIFECYCLE_URL,
    metadataRefreshUrl: process.env.HEALTHCHECKS_METADATA_REFRESH_URL,
  },
  supabase: {
    url: requireEnv('SUPABASE_URL'),
    secretKey: requireEnv('SUPABASE_SECRET_KEY'),
    profileImageBucket: process.env.SUPABASE_PROFILE_IMAGE_BUCKET ?? 'profile-images',
  },
};
