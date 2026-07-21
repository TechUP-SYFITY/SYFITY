import type { ReactNode } from 'react';

import { Header } from '@/shared/components/layout';
import { cn } from '@/shared/lib/utils';

interface ErrorPageShellProps {
  children: ReactNode;
  glowClassName?: string;
}

export function ErrorPageShell({ children, glowClassName = 'bg-primary/5' }: ErrorPageShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div
        aria-hidden
        className={cn(
          `pointer-events-none absolute -top-32 left-1/4 size-125 rounded-full blur-[120px]`,
          glowClassName,
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-1/4 -bottom-24 size-100 animate-blob rounded-full bg-accent/5 blur-[120px]"
      />

      <Header variant="app" />

      <main className="relative flex flex-1 items-center justify-center py-12">{children}</main>
    </div>
  );
}
