'use client';

import { useEffect, useState, type PropsWithChildren } from 'react';

import { isMockingEnabled } from '@/shared/lib/env';

export function MockingProvider({ children }: PropsWithChildren) {
  const [isWorkerReady, setIsWorkerReady] = useState(!isMockingEnabled());

  useEffect(() => {
    if (!isMockingEnabled()) {
      return undefined;
    }

    let isMounted = true;

    void import('./browser')
      .then(({ worker }) => worker.start({ onUnhandledRequest: 'bypass' }))
      .catch((error: unknown) => {
        // worker 등록 실패를 그냥 두면 isWorkerReady가 영원히 false로 남아 화면이
        // 아무 에러 표시 없이 계속 빈 채로 남는다. mock 없이라도 렌더링되게 fail-open한다.
        // eslint-disable-next-line no-console -- 개발자가 원인을 알 수 있는 유일한 경로
        console.error('[MockingProvider] MSW worker 등록 실패, mock 없이 렌더링합니다.', error);
      })
      .finally(() => {
        if (isMounted) {
          setIsWorkerReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isWorkerReady) {
    return null;
  }

  return <>{children}</>;
}
