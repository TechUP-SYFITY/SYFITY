'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { useId, useState } from 'react';

import { cn } from '@/shared/lib/utils';

const inputVariants = cva(
  'w-full rounded-lg border bg-input px-4 text-foreground outline-none transition-colors placeholder:text-white/50 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      state: {
        default: 'border-border focus-visible:border-ring/50 focus-visible:ring-ring',
        error: 'border-destructive focus-visible:ring-destructive',
      },
      size: {
        md: 'h-11 text-sm',
        lg: 'h-14 text-base',
      },
    },
    defaultVariants: { state: 'default', size: 'md' },
  },
);

interface InputProps
  extends
    Omit<React.ComponentProps<'input'>, 'size'>,
    Omit<VariantProps<typeof inputVariants>, 'state'> {
  error?: boolean | string;
  leadingIcon?: React.ReactNode;
  helperText?: string;
  showCount?: boolean;
}

export function Input({
  className,
  size,
  error,
  leadingIcon,
  helperText,
  showCount = false,
  maxLength,
  id,
  value,
  defaultValue,
  onChange,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hasError = Boolean(error);
  const errorMessage = typeof error === 'string' ? error : undefined;

  const isControlled = value !== undefined;
  const [internalCount, setInternalCount] = useState(String(defaultValue ?? '').length);
  const count = isControlled ? String(value ?? '').length : internalCount;

  const bottomText = errorMessage ?? helperText;
  const hasBottom = Boolean(bottomText) || showCount;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        {leadingIcon && (
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-white/50 [&_svg]:size-4">
            {leadingIcon}
          </span>
        )}
        <input
          id={inputId}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          aria-invalid={hasError || undefined}
          aria-describedby={hasBottom ? `${inputId}-desc` : undefined}
          className={cn(
            inputVariants({ state: hasError ? 'error' : 'default', size }),
            leadingIcon && 'pl-10',
            className,
          )}
          onChange={(e) => {
            if (!isControlled) setInternalCount(e.target.value.length);
            onChange?.(e);
          }}
          {...props}
        />
      </div>

      {hasBottom && (
        <div id={`${inputId}-desc`} className="flex items-center justify-between gap-2 px-1">
          <span className={cn('text-xs', hasError ? 'text-destructive' : 'text-muted-foreground')}>
            {bottomText}
          </span>
          {showCount && (
            <span className="text-xs text-white/35">
              {count}
              {maxLength ? ` / ${maxLength}` : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export type { InputProps };
