import Link from 'next/link';
import type { ReactNode } from 'react';

import { SyfityWordmark } from './SyfityWordmark';

interface HeaderProps {
  actions?: ReactNode;
  logoHref?: string;
}

export function Header({ actions, logoHref = '/' }: HeaderProps) {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={logoHref} aria-label="Syfity 홈">
          <SyfityWordmark />
        </Link>
        {actions}
      </div>
    </header>
  );
}
