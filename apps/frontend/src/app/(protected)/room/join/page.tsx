'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { JoinRoomDialog } from '@/features/room/components/JoinRoomDialog';

function RoomJoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') ?? undefined;
  const [open, setOpen] = useState(true);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      router.push('/home');
    }
  };

  return <JoinRoomDialog open={open} onOpenChange={handleOpenChange} initialCode={initialCode} />;
}

export default function RoomJoinPage() {
  return (
    <Suspense fallback={null}>
      <RoomJoinContent />
    </Suspense>
  );
}
