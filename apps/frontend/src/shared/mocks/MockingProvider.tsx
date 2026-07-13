'use client';

import { useEffect, useState, type PropsWithChildren } from 'react';

import { isMockingEnabled } from '@/shared/lib/env';

import { PresenceMockPanel } from './PresenceMockPanel';

export function MockingProvider({ children }: PropsWithChildren) {
  const [isWorkerReady, setIsWorkerReady] = useState(!isMockingEnabled());

  useEffect(() => {
    if (!isMockingEnabled()) {
      return undefined;
    }

    let isMounted = true;

    void import('./browser').then(({ worker }) =>
      worker.start({ onUnhandledRequest: 'bypass' }).then(() => {
        if (isMounted) {
          setIsWorkerReady(true);
        }
      }),
    );

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isWorkerReady) {
    return null;
  }

  return (
    <>
      {children}
      <PresenceMockPanel />
    </>
  );
}
