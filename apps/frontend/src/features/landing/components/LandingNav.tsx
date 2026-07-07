import Link from 'next/link';

import { buttonVariants } from '@/shared/components/ui/Button';

import { LOGIN_ROUTE } from '../landingData';

export function LandingNav() {
  return (
    <nav className="flex items-center gap-2 sm:gap-3">
      <Link
        href={LOGIN_ROUTE}
        className="rounded-lg px-2 py-1.5 text-sm font-semibold text-white/70 transition-colors hover:text-white"
      >
        로그인
      </Link>
      <Link href={LOGIN_ROUTE} className={buttonVariants({ size: 'sm' })}>
        회원가입
      </Link>
    </nav>
  );
}
