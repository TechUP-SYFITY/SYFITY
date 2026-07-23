// Home 화면 레이아웃: 공통 헤더 + 앰비언트 배경 + 본문 영역.
import type { PropsWithChildren } from 'react';

import { Footer, Header } from '@/shared/components/layout';

import { UserMenu } from '@/features/auth/components/UserMenu';

export default function HomeLayout({ children }: PropsWithChildren) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/4 size-125 rounded-full bg-primary/5 blur-[120px]"
      />

      <Header variant="app" actions={<UserMenu />} />
      <main className="relative flex flex-1">{children}</main>
      <Footer />
    </div>
  );
}
