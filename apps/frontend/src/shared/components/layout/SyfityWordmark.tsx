import { cn } from '@/shared/lib/utils';

import { SyfityMark } from './SyfityMark';

interface SyfityWordmarkProps {
  className?: string;
  markClassName?: string;
  textClassName?: string;
}

export function SyfityWordmark({ className, markClassName, textClassName }: SyfityWordmarkProps) {
  return (
    <span className={cn('flex items-center gap-2 text-white', className)}>
      <SyfityMark className={cn('text-primary', markClassName)} />
      <span className={cn('text-lg font-bold tracking-[-0.02em]', textClassName)}>Syfity</span>
    </span>
  );
}
