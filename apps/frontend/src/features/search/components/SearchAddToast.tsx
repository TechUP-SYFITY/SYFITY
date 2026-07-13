'use client';

import { Check, CircleAlert, X } from 'lucide-react';
import { Toast as ToastPrimitive } from 'radix-ui';
import { useState } from 'react';

import { Toast, ToastClose, ToastIcon, ToastTitle, ToastViewport } from '@/shared/components/ui';

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
  const [announcerContainer, setAnnouncerContainer] = useState<HTMLDivElement | null>(null);

  const toast =
    feedback && announcerContainer ? (
      <ToastPrimitive.Provider
        announcerContainer={announcerContainer}
        label="알림"
        swipeDirection="down"
      >
        <Toast
          key={feedback.id}
          duration={4000}
          open
          type={feedback.variant === 'error' ? 'foreground' : 'background'}
          variant={feedback.variant}
          onOpenChange={(open) => {
            if (!open) onClose();
          }}
        >
          <ToastIcon>
            {feedback.variant === 'error' ? <CircleAlert aria-hidden /> : <Check aria-hidden />}
          </ToastIcon>
          <ToastTitle>{feedback.message}</ToastTitle>
          <ToastClose aria-label="닫기">
            <X aria-hidden />
          </ToastClose>
        </Toast>
        <ToastViewport
          label="알림 ({hotkey})"
          className="pb-[max(1rem,env(safe-area-inset-bottom))] lg:right-0 lg:left-auto lg:max-w-sm lg:translate-x-0 lg:p-6"
        />
      </ToastPrimitive.Provider>
    ) : null;

  return (
    <>
      <div ref={setAnnouncerContainer} data-search-add-toast-announcer />
      {toast}
    </>
  );
}
