import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/shared/lib/utils';

export const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-bold whitespace-nowrap transition-[background,box-shadow,filter,opacity] outline-none focus-visible:ring-2 focus-visible:ring-ring active:brightness-95 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-[0_0_16px_rgba(114,244,164,0.25)] hover:brightness-105',
        gradient:
          'bg-[linear-gradient(160deg,var(--accent)_0%,var(--primary)_100%)] text-white shadow-[0_0_12px_rgba(136,92,246,0.35)] hover:brightness-105',
        ghost: 'border border-white/10 bg-white/5 text-white hover:bg-white/10',
        'primary-soft': 'border border-primary/25 bg-primary/10 text-primary hover:bg-primary/15',
        'accent-soft': 'border border-accent/30 bg-accent/10 text-accent hover:bg-accent/15',
        destructive: 'bg-destructive text-primary-foreground hover:brightness-105',
      },
      size: {
        sm: 'px-3 py-1.5 text-xs [&_svg]:size-3',
        md: 'px-4 py-2.5 text-sm [&_svg]:size-4',
        lg: 'px-6 py-3.5 text-sm [&_svg]:size-4',
        icon: 'size-10 p-0 [&_svg]:size-4',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

interface ButtonProps extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

function Spinner() {
  return (
    <svg className="animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function Button({
  className,
  variant,
  size,
  type = 'button',
  asChild = false,
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);
  const isDisabled = Boolean(disabled) || isLoading;
  const content = [
    isLoading && <Spinner key="spinner" />,
    <Slot.Slottable key="label">{children}</Slot.Slottable>,
  ];

  if (asChild) {
    return (
      <Slot.Root
        {...props}
        className={classes}
        aria-busy={isLoading}
        aria-disabled={isDisabled}
        data-disabled={isDisabled || undefined}
        tabIndex={isDisabled ? -1 : props.tabIndex}
        onClick={(e) => {
          if (isDisabled) {
            e.preventDefault();
            return;
          }
          props.onClick?.(e as React.MouseEvent<HTMLButtonElement>);
        }}
        onKeyDown={(e) => {
          if (isDisabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            return;
          }
          props.onKeyDown?.(e as React.KeyboardEvent<HTMLButtonElement>);
        }}
      >
        {content}
      </Slot.Root>
    );
  }

  return (
    <button type={type} className={classes} disabled={isDisabled} aria-busy={isLoading} {...props}>
      {content}
    </button>
  );
}

export type { ButtonProps };
