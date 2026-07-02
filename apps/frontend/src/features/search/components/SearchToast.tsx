'use client';

import { AlertCircleIcon, CheckIcon, CloseIcon } from './SearchIcons';

export type SearchToastType = 'error' | 'success';

export interface SearchToastMessage {
  type: SearchToastType;
  message: string;
}

interface SearchToastProps {
  toast: SearchToastMessage | null;
  onDismiss: () => void;
  className?: string;
}

export function SearchToast({ toast, onDismiss, className = '' }: SearchToastProps) {
  if (!toast) {
    return null;
  }

  const isError = toast.type === 'error';
  const toneClassName = isError
    ? 'w-[min(calc(100vw-32px),388px)] border-[#f43f5e]/[0.22] bg-[#f43f5e]/10'
    : 'w-fit max-w-[calc(100vw-32px)] border-[#72f4a4]/[0.22] bg-[#72f4a4]/10';
  const iconClassName = isError
    ? 'bg-[#fda4af]/[0.09] text-[#fda4af]'
    : 'bg-[#72f4a4]/[0.09] text-[#72f4a4]';
  const Icon = isError ? AlertCircleIcon : CheckIcon;

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className={`pointer-events-auto flex min-h-[53px] items-center gap-3 rounded-2xl border px-[16.615px] py-[12.615px] shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl ${toneClassName} ${className}`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
      >
        <Icon className="h-[15px] w-[15px]" />
      </span>
      <span className="min-w-0 flex-1 truncate text-xs font-semibold leading-4 text-white/85">
        {toast.message}
      </span>
      <button
        type="button"
        aria-label="토스트 닫기"
        onClick={onDismiss}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white/35 transition hover:bg-white/10 hover:text-white/70"
      >
        <CloseIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
