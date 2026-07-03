'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { Toast as ToastPrimitive } from 'radix-ui';

import { cn } from '@/shared/lib/utils';

export function ToastProvider({
  swipeDirection = 'down',
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Provider>) {
  return <ToastPrimitive.Provider swipeDirection={swipeDirection} {...props} />;
}

export function ToastViewport({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      className={cn(
        'fixed bottom-0 left-1/2 z-100 flex w-full max-w-md -translate-x-1/2 flex-col gap-2 p-4 outline-none',
        className,
      )}
      {...props}
    />
  );
}

const toastVariants = cva(
  'pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:slide-in-from-bottom-2 [&_[data-toast-icon]]:flex [&_[data-toast-icon]]:size-7 [&_[data-toast-icon]]:shrink-0 [&_[data-toast-icon]]:items-center [&_[data-toast-icon]]:justify-center [&_[data-toast-icon]]:rounded-xl [&_[data-toast-icon]_svg]:size-3.5',
  {
    variants: {
      variant: {
        success: 'border-primary/20 bg-primary/10 text-primary [&_[data-toast-icon]]:bg-primary/10',
        error:
          'border-destructive/20 bg-destructive/10 text-destructive [&_[data-toast-icon]]:bg-destructive/10',
        info: 'border-accent/20 bg-accent/10 text-accent [&_[data-toast-icon]]:bg-accent/10',
      },
    },
    defaultVariants: { variant: 'success' },
  },
);

interface ToastProps
  extends React.ComponentProps<typeof ToastPrimitive.Root>, VariantProps<typeof toastVariants> {}

export function Toast({ className, variant, ...props }: ToastProps) {
  return <ToastPrimitive.Root className={cn(toastVariants({ variant }), className)} {...props} />;
}

export function ToastIcon({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-toast-icon className={className} {...props} />;
}

export function ToastTitle({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Title>) {
  return (
    <ToastPrimitive.Title
      className={cn('flex-1 text-xs font-semibold text-white/85', className)}
      {...props}
    />
  );
}

export function ToastClose({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Close>) {
  return (
    <ToastPrimitive.Close
      className={cn(
        'shrink-0 cursor-pointer rounded-md text-white/40 transition-colors outline-none hover:text-white/70 focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5',
        className,
      )}
      {...props}
    />
  );
}

export type { ToastProps };
