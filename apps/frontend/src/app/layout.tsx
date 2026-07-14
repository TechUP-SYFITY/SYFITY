import type { Metadata, Viewport } from 'next';

import { ToastProvider } from '@/shared/components/ui';
import { pretendard } from '@/shared/lib/fonts';
import { QueryProvider } from '@/shared/lib/query/QueryProvider';
import { MockingProvider } from '@/shared/mocks/MockingProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Syfity',
  description: '하나의 Room에서 같은 음악을 실시간으로 함께 듣는 소셜 리스닝 플랫폼',
};

// viewport-fit=cover가 있어야 iOS Safari 등에서 env(safe-area-inset-*)가 0이 아닌
// 실제 값을 반환한다. 하단 고정 UI가 홈 인디케이터 영역을 침범하는 문제 대응.
export const viewport: Viewport = {
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ToastProvider viewportClassName="bottom-16 sm:bottom-20 lg:right-0 lg:left-auto lg:max-w-sm lg:translate-x-0 lg:p-6">
          <MockingProvider>
            <QueryProvider>{children}</QueryProvider>
          </MockingProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
