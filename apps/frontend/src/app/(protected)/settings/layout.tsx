import type { PropsWithChildren } from 'react';

import { Header } from '@/shared/components/layout';

import { UserMenu } from '@/features/auth/components/UserMenu';

export default function SettingsLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-background">
      <Header variant="app" actions={<UserMenu />} />
      {children}
    </div>
  );
}
