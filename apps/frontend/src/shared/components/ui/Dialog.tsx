'use client';

import { Dialog as DialogPrimitive } from 'radix-ui';

import { cn } from '@/shared/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

// 접근성: children에 반드시 DialogTitle을 포함해야 함(없으면 Radix가 콘솔 경고).
// 제목이 시각적으로 불필요하면 <DialogTitle className="sr-only">로 감춰서 넣는다.
export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={cn(
          // 모바일: 좌우 여백(계산폭) + 세로 넘칠 때 스크롤
          'fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-card/82 text-foreground shadow-[0_40px_100px_rgba(0,0,0,0.7),0_0_80px_rgba(114,244,164,0.06)] backdrop-blur-xl outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

// 범용 헤더 컨테이너. 닫기 버튼은 강제하지 않고, 필요 시 DialogCloseButton을 자식으로 조합한다.
export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 border-b border-border px-5 pt-5 pb-4',
        className,
      )}
      {...props}
    />
  );
}

// 스타일된 닫기(X) 버튼 — 헤더 등에 배치해서 사용
export function DialogCloseButton({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return (
    <DialogPrimitive.Close
      className={cn(
        'flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-xl text-white/55 transition-colors outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4',
        className,
      )}
      {...props}
    >
      <XIcon />
      <span className="sr-only">닫기</span>
    </DialogPrimitive.Close>
  );
}

export function DialogIconBadge({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-primary to-accent text-black drop-shadow-[0_0_8px_rgba(114,244,164,0.3)] [&_svg]:size-4',
        className,
      )}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title className={cn('text-sm font-bold text-white', className)} {...props} />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description className={cn('text-xs text-white/45', className)} {...props} />
  );
}

export function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5 p-5', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex gap-2.5 px-5 pb-5', className)} {...props} />;
}
