// src/config.ts
const getEnv = (key: string): string | undefined => {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value : undefined;
};

const port = getEnv('PORT') ?? '4000';

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port,
  clientUrl: getEnv('CLIENT_URL') ?? 'http://localhost:3000',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    accessExpiresIn: '1h',
    refreshExpiresIn: '30d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackUrl:
      getEnv('GOOGLE_CALLBACK_URL') ?? `http://localhost:${port}/api/v1/auth/google/callback`,
  },
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY!,
  },
  db: {
    url: process.env.DATABASE_URL!,
  },
};
