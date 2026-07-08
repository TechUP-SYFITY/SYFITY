import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { PropsWithChildren } from 'react';

import { getBaseUrl } from '@/shared/lib/api/apiClient';

export default async function ProtectedLayout({ children }: PropsWithChildren) {
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

  redirect('/login?reauth=1');
}
