import { cookies } from 'next/headers';

import { getBaseUrl, REAUTH_PATH } from '@/shared/lib/api/apiClient';
import { isMockingEnabled } from '@/shared/lib/env';

export type ServerSessionResult =
  | { kind: 'allow'; onboardedAt: string | null }
  | { kind: 'allow-unknown' }
  | { kind: 'redirect'; to: string };

export async function checkServerSession(): Promise<ServerSessionResult> {
  if (isMockingEnabled()) return { kind: 'allow-unknown' };
  const response = await fetch(`${getBaseUrl()}/me`, {
    headers: { cookie: (await cookies()).toString() },
    cache: 'no-store',
  });
  if (response.ok) {
    const body = (await response.json()) as { data?: { onboardedAt?: string | null } };
    return { kind: 'allow', onboardedAt: body.data?.onboardedAt ?? null };
  }
  if (response.status >= 500) return { kind: 'allow-unknown' };
  const code = await response
    .json()
    .then((body: { error?: { code?: string } }) => body.error?.code)
    .catch(() => undefined);
  if (response.status === 401 && code === 'AUTH_TOKEN_EXPIRED') return { kind: 'allow-unknown' };
  return { kind: 'redirect', to: REAUTH_PATH };
}
