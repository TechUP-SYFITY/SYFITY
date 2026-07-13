'use client';

import { RotateCcw, TriangleAlert } from 'lucide-react';
import { useEffect } from 'react';

import { ErrorPageShell } from '@/features/error/components/ErrorPageShell';
import { ErrorState } from '@/features/error/components/ErrorState';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // eslint-disable-next-line no-console -- 에러 바운더리에 걸린 원인을 진단 로그로 남겨야 함
    console.error(error);
  }, [error]);

  return (
    <ErrorPageShell glowClassName="bg-destructive/5">
      <ErrorState
        icon={<TriangleAlert className="size-16 stroke-1 text-destructive" />}
        code="500"
        title="문제가 발생했어요"
        description="예상치 못한 오류로 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요."
        action={{ label: '다시 시도', onClick: reset, icon: <RotateCcw className="size-4" /> }}
      />
    </ErrorPageShell>
  );
}
