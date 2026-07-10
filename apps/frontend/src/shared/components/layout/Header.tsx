import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

import { SyfityWordmark } from './SyfityWordmark';

export type HeaderVariant = 'landing' | 'app';

interface HeaderProps {
  /**
   * 헤더 변형 타입 (디자인 및 레이아웃 설정)
   * - 'landing': absolute 배치, 투명 배경, max-w-6xl
   * - 'app': sticky 배치, 흐림 효과(backdrop-blur) 있는 어두운 배경, 하단 테두리, 전체 너비 (양쪽 여백 모바일 20px, PC 32px)
   */
  variant?: HeaderVariant;
  actions?: ReactNode;
  logoHref?: string | null;
  className?: string;
  containerClassName?: string;
}

export function Header({
  variant = 'landing',
  actions,
  logoHref,
  className,
  containerClassName,
}: HeaderProps) {
  // 1. 헤더 전체 스타일 결정
  const headerClass = cn(
    variant === 'landing' && 'absolute inset-x-0 top-0 z-20',
    variant === 'app' &&
      'sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl',
    className,
  );

  // 2. 내부 레이아웃 컨테이너 스타일 결정
  const containerClass = cn(
    'flex h-16 w-full items-center justify-between',
    variant === 'landing' ? 'mx-auto max-w-6xl px-4 sm:px-6' : 'px-5 sm:px-8',
    containerClassName,
  );

  const resolvedLogoHref = logoHref ?? (variant === 'landing' ? '/' : '/home');

  return (
    <header className={headerClass}>
      <div className={containerClass}>
        <Link href={resolvedLogoHref} aria-label="Syfity 홈">
          <SyfityWordmark />
        </Link>
        {actions}
      </div>
    </header>
  );
}
