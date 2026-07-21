import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { PropsWithChildren } from 'react';

import { getBaseUrl, REAUTH_PATH } from '@/shared/lib/api/apiClient';
import { isMockingEnabled } from '@/shared/lib/env';

export default async function ProtectedLayout({ children }: PropsWithChildren) {
  // 이 세션 체크는 서버(Node.js)에서 직접 실제 백엔드로 fetch하므로 브라우저의
  // MSW(mock)가 절대 가로챌 수 없다. mock 모드에서는 이 체크 자체를 건너뛴다.
  if (isMockingEnabled()) {
    return <>{children}</>;
  }

  const cookieHeader = (await cookies()).toString();

  const response = await fetch(`${getBaseUrl()}/me`, {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  });

  if (response.ok || response.status >= 500) {
    return <>{children}</>;
  }

  const code = await response
    .json()
    .then((body: { error?: { code?: string } }) => body?.error?.code)
    .catch(() => undefined);
  if (response.status === 401 && code === 'AUTH_TOKEN_EXPIRED') {
    return <>{children}</>;
  }

  redirect(REAUTH_PATH);
}
