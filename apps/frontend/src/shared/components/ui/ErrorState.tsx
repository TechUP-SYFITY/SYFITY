'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/shared/components/ui';
import { cn } from '@/shared/lib/utils';

type ErrorStateAction = { label: string; icon?: ReactNode } & (
  { href: string; onClick?: never } | { href?: never; onClick: () => void }
);

interface ErrorStateProps {
  icon: ReactNode;
  code?: string;
  title: string;
  description?: ReactNode;
  action?: ErrorStateAction;
  className?: string;
}

export function ErrorState({ icon, code, title, description, action, className }: ErrorStateProps) {
  return (
    <div className={cn(`flex w-full max-w-120 flex-col items-center px-4 text-center`, className)}>
      <div
        aria-hidden
        className="flex size-24 items-center justify-center rounded-full border border-white/10 bg-surface/70 shadow-[0_0_32px_rgba(114,244,164,0.13)]"
      >
        {icon}
      </div>

      {code ? (
        <span className="mt-3 rounded-full border border-white/8 bg-white/6 px-2.5 py-1 font-mono text-xs font-bold tracking-widest text-white/35 uppercase">
          {code}
        </span>
      ) : null}

      <h1 className="mt-3 text-2xl/tight font-bold tracking-[-0.02em] text-white">{title}</h1>

      {description ? <p className="mt-4 text-sm/relaxed text-white/65">{description}</p> : null}

      {action ? (
        <div className="mt-8">
          {action.href ? (
            <Button asChild size="lg">
              <Link href={action.href}>
                {action.icon}
                {action.label}
              </Link>
            </Button>
          ) : (
            <Button size="lg" onClick={action.onClick}>
              {action.icon}
              {action.label}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export type { ErrorStateProps, ErrorStateAction };
