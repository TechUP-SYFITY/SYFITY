import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/shared/lib/utils';

const badgeVariants = cva(
  `
    inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs
    font-semibold whitespace-nowrap
    [&_svg]:size-2.5
  `,
  {
    variants: {
      variant: {
        muted: 'border-white/10 bg-white/5 text-white/60',
        primary: 'border-primary/25 bg-primary/15 text-primary',
        accent: 'border-accent/25 bg-accent/15 text-accent',
        warning: 'border-warning/25 bg-warning/15 text-warning',
        live: 'border-destructive/25 bg-destructive/15 text-destructive',
      },
    },
    defaultVariants: { variant: 'muted' },
  },
);

interface BadgeProps extends React.ComponentProps<'span'>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current opacity-60" aria-hidden />}
      {children}
    </span>
  );
}

export type { BadgeProps };
