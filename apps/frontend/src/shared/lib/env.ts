import { z } from 'zod';

const LOCAL_API_URL = 'http://localhost:4000/api/v1';
const LOCAL_SOCKET_URL = 'http://localhost:4000';

const apiUrlSchema = z
  .string()
  .trim()
  .min(1, 'NEXT_PUBLIC_API_URL이 빈 문자열입니다. 값을 채우거나 변수 자체를 제거하세요.')
  .url('NEXT_PUBLIC_API_URL은 올바른 URL 형식이어야 합니다.')
  .refine(
    (value) => value.replace(/\/$/, '').endsWith('/api/v1'),
    'NEXT_PUBLIC_API_URL은 /api/v1로 끝나야 합니다. (예: http://localhost:4000/api/v1)',
  )
  .default(LOCAL_API_URL);

const socketUrlSchema = z
  .string()
  .trim()
  .min(1, 'NEXT_PUBLIC_SOCKET_URL이 빈 문자열입니다. 값을 채우거나 변수 자체를 제거하세요.')
  .url('NEXT_PUBLIC_SOCKET_URL은 올바른 URL 형식이어야 합니다.')
  .default(LOCAL_SOCKET_URL);

const apiMockingSchema = z
  .preprocess((value) => (value === '' ? undefined : value), z.enum(['enabled', 'disabled']))
  .default('disabled');

const envSchema = z.object({
  NEXT_PUBLIC_API_MOCKING: apiMockingSchema,
  NEXT_PUBLIC_API_URL: apiUrlSchema,
  NEXT_PUBLIC_SOCKET_URL: socketUrlSchema,
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
});

if (!parsed.success) {
  // eslint-disable-next-line no-console -- 부팅 실패 원인을 즉시 알려야 함
  console.error(z.flattenError(parsed.error).fieldErrors);
  throw new Error(
    '환경변수 형식이 올바르지 않습니다. apps/frontend/.env.local을 .env.example과 비교해 확인하세요.',
  );
}

export const env = parsed.data;

export const isMockingEnabled = () => env.NEXT_PUBLIC_API_MOCKING === 'enabled';
