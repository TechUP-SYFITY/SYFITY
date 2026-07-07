import { cn } from '@/shared/lib/utils';

import type { LandingFeature } from '../landingData';

interface FeatureCardProps extends LandingFeature {
  delayMs?: number;
}

export function FeatureCard({
  icon: Icon,
  tone,
  title,
  description,
  delayMs = 0,
}: FeatureCardProps) {
  return (
    <div
      style={{ animationDelay: `${delayMs}ms` }}
      className="animate-rise rounded-2xl border border-white/8 bg-white/3 p-6 transition duration-200 hover:-translate-y-1 hover:border-white/15 hover:bg-white/5"
    >
      <span
        className={cn(
          'flex size-12 items-center justify-center rounded-xl',
          tone === 'primary' ? 'bg-primary/12 text-primary' : 'bg-accent/12 text-accent',
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <h3 className="mt-5 text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/50">{description}</p>
    </div>
  );
}
