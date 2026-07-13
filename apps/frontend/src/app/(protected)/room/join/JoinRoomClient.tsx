'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { JoinRoomDialog } from '@/features/room/components/JoinRoomDialog';

export function JoinRoomClient({ initialCode }: { initialCode?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      router.push('/home');
    }
  };

  return <JoinRoomDialog open={open} onOpenChange={handleOpenChange} initialCode={initialCode} />;
}
