import { AudioLines } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

interface SyfityWordmarkProps {
  className?: string;
  markClassName?: string;
  textClassName?: string;
}

export function SyfityWordmark({ className, markClassName, textClassName }: SyfityWordmarkProps) {
  return (
    <span className={cn('flex items-center gap-2 text-white', className)}>
      <AudioLines className={cn('size-6 text-primary', markClassName)} aria-hidden />
      <span className={cn('text-lg font-bold tracking-[-0.02em]', textClassName)}>Syfity</span>
    </span>
  );
}
