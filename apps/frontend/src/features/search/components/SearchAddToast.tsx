'use client';

import { Check, CircleAlert, X } from 'lucide-react';

import {
  Toast,
  ToastClose,
  ToastIcon,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/shared/components/ui';

export interface SearchAddToastFeedback {
  id: number;
  message: string;
  variant: 'success' | 'error';
}

interface SearchAddToastProps {
  feedback: SearchAddToastFeedback | null;
  onClose: () => void;
}

export function SearchAddToast({ feedback, onClose }: SearchAddToastProps) {
  if (!feedback) {
    return null;
  }

  const isError = feedback.variant === 'error';

  return (
    <ToastProvider swipeDirection="down">
      <Toast
        key={feedback.id}
        duration={4000}
        open
        role={isError ? 'alert' : 'status'}
        variant={feedback.variant}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <ToastIcon>{isError ? <CircleAlert aria-hidden /> : <Check aria-hidden />}</ToastIcon>
        <ToastTitle>{feedback.message}</ToastTitle>
        <ToastClose aria-label="닫기">
          <X aria-hidden />
        </ToastClose>
      </Toast>
      <ToastViewport className="pb-[max(1rem,env(safe-area-inset-bottom))] lg:pb-6" />
    </ToastProvider>
  );
}
