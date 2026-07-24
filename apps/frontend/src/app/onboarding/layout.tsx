import { redirect } from 'next/navigation';
import type { PropsWithChildren } from 'react';

import { checkServerSession } from '@/shared/lib/auth/session.server';

export default async function OnboardingLayout({ children }: PropsWithChildren) {
  const result = await checkServerSession();
  if (result.kind === 'redirect') redirect(result.to);
  return <>{children}</>;
}
