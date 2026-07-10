import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { PropsWithChildren } from 'react';

import { getBaseUrl, REAUTH_PATH } from '@/shared/lib/api/apiClient';
import { isDevAuthBypassEnabled } from '@/shared/lib/env';

export default async function ProtectedLayout({ children }: PropsWithChildren) {
  if (isDevAuthBypassEnabled()) {
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
