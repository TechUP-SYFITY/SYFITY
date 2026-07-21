import type { Metadata, Viewport } from 'next';

import { ToastProvider } from '@/shared/components/ui';
import { pretendard } from '@/shared/lib/fonts';
import { QueryProvider } from '@/shared/lib/query/QueryProvider';
import { MockingProvider } from '@/shared/mocks/MockingProvider';

import { PwaProvider } from '@/widgets/pwa/PwaProvider';

import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://syfity.site';
const SITE_NAME = 'Syfity';
const SITE_DESCRIPTION = '하나의 Room에서 같은 음악을 실시간으로 함께 듣는 소셜 리스닝 플랫폼';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Syfity — 함께 듣는 순간, 음악이 더 가까워진다',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#09090B',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={` ${pretendard.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ToastProvider viewportClassName="bottom-16 sm:bottom-20 lg:right-0 lg:left-auto lg:max-w-sm lg:translate-x-0 lg:p-6">
          <MockingProvider>
            <QueryProvider>
              <PwaProvider />
              {children}
            </QueryProvider>
          </MockingProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
