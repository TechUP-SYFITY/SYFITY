'use client';

import { QueryProvider } from '@/shared/lib/query/QueryProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
