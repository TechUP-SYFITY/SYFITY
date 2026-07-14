'use client';

import { RotateCcw, TriangleAlert } from 'lucide-react';
import { useEffect } from 'react';

import { ErrorPageShell, ErrorState } from '@/shared/components/ui';
import { pretendard } from '@/shared/lib/fonts';
import './globals.css';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// global-error는 루트 layout.tsx 자체(Provider 초기화 등)의 에러를 잡으므로
// 자체 <html>/<body>와 폰트·전역 스타일을 직접 포함해야 함.
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // eslint-disable-next-line no-console -- 루트 레이아웃 장애 원인을 진단 로그로 남겨야 함
    console.error(error);
  }, [error]);

  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ErrorPageShell glowClassName="bg-destructive/5">
          <ErrorState
            icon={<TriangleAlert className="size-16 stroke-1 text-destructive" />}
            code="500"
            title="문제가 발생했어요"
            description="예상치 못한 오류로 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요."
            action={{ label: '다시 시도', onClick: reset, icon: <RotateCcw className="size-4" /> }}
          />
        </ErrorPageShell>
      </body>
    </html>
  );
}
