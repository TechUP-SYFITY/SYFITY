import { redirect } from 'next/navigation';
import type { PropsWithChildren } from 'react';

import { checkServerSession } from '@/shared/lib/auth/session.server';

export default async function ProtectedLayout({ children }: PropsWithChildren) {
  const result = await checkServerSession();
  if (result.kind === 'redirect') redirect(result.to);
  if (result.kind === 'allow' && !result.onboardedAt) redirect('/onboarding');
  return <>{children}</>;
}
