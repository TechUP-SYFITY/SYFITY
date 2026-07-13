import type { Metadata } from 'next';

import { ToastProvider } from '@/shared/components/ui';
import { pretendard } from '@/shared/lib/fonts';
import { QueryProvider } from '@/shared/lib/query/QueryProvider';
import { MockingProvider } from '@/shared/mocks/MockingProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Syfity',
  description: '하나의 Room에서 같은 음악을 실시간으로 함께 듣는 소셜 리스닝 플랫폼',
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
