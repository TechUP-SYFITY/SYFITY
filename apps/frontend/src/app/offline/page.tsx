'use client';

import { House, WifiOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { ErrorPageShell, ErrorState } from '@/shared/components/ui';

export default function OfflinePage() {
  const router = useRouter();

  useEffect(() => {
    const handleOnline = () => {
      if (window.history.length > 1) {
        router.back();
      } else {
        router.replace('/home');
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [router]);

  return (
    <ErrorPageShell>
      <ErrorState
        icon={<WifiOff className="size-16 stroke-1 text-primary" />}
        code="오프라인"
        title="인터넷 연결이 필요해요"
        description="Room 감상·채팅·재생은 온라인 상태에서만 이용할 수 있어요. 연결이 복구되면 자동으로 이전 화면으로 돌아가요."
        action={{ label: '홈으로', href: '/home', icon: <House className="size-4" /> }}
      />
    </ErrorPageShell>
  );
}
