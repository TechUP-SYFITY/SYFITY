'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { Toast as ToastPrimitive } from 'radix-ui';
import { createContext, useContext, useRef, useState } from 'react';

import { cn } from '@/shared/lib/utils';

export function ToastViewport({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      className={cn(
        `fixed bottom-0 left-1/2 z-100 flex w-full max-w-md -translate-x-1/2 flex-col gap-2 p-4 outline-none`,
        className,
      )}
      {...props}
    />
  );
}

const toastVariants = cva(
  `
    pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3
    shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl
    **:data-toast-icon:flex **:data-toast-icon:size-7
    **:data-toast-icon:shrink-0 **:data-toast-icon:items-center
    **:data-toast-icon:justify-center **:data-toast-icon:rounded-xl
    data-[state=closed]:animate-out data-[state=closed]:fade-out-0
    data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-2
    [&_[data-toast-icon]_svg]:size-3.5
  `,
  {
    variants: {
      variant: {
        success: `
          border-primary/20 bg-primary/10 text-primary
          **:data-toast-icon:bg-primary/10
        `,
        error: `
            border-destructive/20 bg-destructive/10 text-destructive
            **:data-toast-icon:bg-destructive/10
          `,
        info: `
          border-accent/20 bg-accent/10 text-accent
          **:data-toast-icon:bg-accent/10
        `,
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
        `shrink-0 cursor-pointer rounded-md text-white/40 transition-colors outline-none hover:text-white/70 focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5`,
        className,
      )}
      {...props}
    />
  );
}

interface ToastOptions {
  id?: string;
  title: React.ReactNode;
  icon?: React.ReactNode;
  variant?: ToastProps['variant'];
  duration?: number;
  closeLabel?: string;
  onDismiss?: () => void;
}

interface ToastItem extends ToastOptions {
  id: string;
  instance: number;
}

interface ToastContextValue {
  pushToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
}

interface ToastProviderProps {
  children: React.ReactNode;
  viewportClassName?: string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children, viewportClassName }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const sequence = useRef(0);
  const activeInstances = useRef(new Map<string, number>());
  const [toastApi] = useState<ToastContextValue>(() => ({
    pushToast: (options) => {
      const id = options.id ?? `toast-${sequence.current + 1}`;
      sequence.current += 1;
      const nextToast = { ...options, id, instance: sequence.current };

      activeInstances.current.set(id, nextToast.instance);
      setToasts((current) => [...current.filter((toast) => toast.id !== id), nextToast]);
      return id;
    },
    dismissToast: (id) => {
      activeInstances.current.delete(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    },
  }));

  return (
    <ToastContext.Provider value={toastApi}>
      <ToastPrimitive.Provider swipeDirection="down">
        {children}
        {toasts.map((toast) => (
          <Toast
            key={`${toast.id}-${toast.instance}`}
            className="mx-auto w-full max-w-sm"
            duration={toast.duration}
            open
            variant={toast.variant}
            onOpenChange={(open) => {
              if (open || activeInstances.current.get(toast.id) !== toast.instance) {
                return;
              }

              toast.onDismiss?.();
              toastApi.dismissToast(toast.id);
            }}
          >
            {toast.icon ? <ToastIcon>{toast.icon}</ToastIcon> : null}
            <ToastTitle>{toast.title}</ToastTitle>
            <ToastClose aria-label={toast.closeLabel ?? '알림 닫기'}>
              <X aria-hidden />
            </ToastClose>
          </Toast>
        ))}
        <ToastViewport className={viewportClassName} />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider.');
  }

  return context;
}

export type { ToastOptions, ToastProps };
