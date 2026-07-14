'use client';

import { Check, CircleAlert } from 'lucide-react';
import { useEffect } from 'react';

import { useToast } from '@/shared/components/ui';

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
  const { pushToast } = useToast();

  useEffect(() => {
    if (!feedback) return;

    pushToast({
      id: `search-add-${feedback.id}`,
      title: feedback.message,
      icon: feedback.variant === 'error' ? <CircleAlert aria-hidden /> : <Check aria-hidden />,
      variant: feedback.variant,
      duration: 4000,
      onDismiss: onClose,
    });
  }, [feedback, onClose, pushToast]);

  return null;
}
