import type { Metadata } from 'next';

import { pretendard } from '@/shared/lib/fonts';

import { Providers } from './providers';
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
