import Link from 'next/link';

import { buttonVariants } from '@/shared/components/ui/Button';

import { LOGIN_ROUTE } from '../landingData';

export function LandingNav() {
  return (
    <nav className="flex items-center gap-2 sm:gap-3">
      <Link href={LOGIN_ROUTE} className={buttonVariants({ size: 'md' })}>
        시작하기
      </Link>
    </nav>
  );
}
