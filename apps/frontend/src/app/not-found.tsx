import { Compass, House } from 'lucide-react';

import { ErrorPageShell } from '@/features/error/components/ErrorPageShell';
import { ErrorState } from '@/features/error/components/ErrorState';

export default function NotFound() {
  return (
    <ErrorPageShell>
      <ErrorState
        icon={<Compass className="size-16 stroke-1 text-primary" />}
        code="404"
        title="페이지를 찾을 수 없어요"
        description="요청하신 페이지가 없어요."
        action={{ label: '홈으로', href: '/home', icon: <House className="size-4" /> }}
      />
    </ErrorPageShell>
  );
}
