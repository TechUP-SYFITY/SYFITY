import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import type { PropsWithChildren } from 'react';

import { Header } from '@/shared/components/layout';

export default function RoomJoinLayout({ children }: PropsWithChildren) {
  return (
    <div className="relative flex min-h-full flex-col overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/4 size-125 rounded-full bg-primary/5 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 right-1/4 size-105 rounded-full bg-accent/5 blur-[120px]"
      />

      <Header
        variant="app"
        actions={
          <Link
            href="/home"
            className="flex items-center gap-1 text-sm text-white/55 transition-colors hover:text-white"
          >
            <ChevronLeft className="size-4" />
            홈으로
          </Link>
        }
      />
      <main className="relative flex flex-1 items-center justify-center">{children}</main>
    </div>
  );
}
