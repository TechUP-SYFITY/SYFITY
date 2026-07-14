import { Loader2 } from 'lucide-react';

export function RoomLoadingState() {
  return (
    <main className="flex h-dvh items-center justify-center bg-background px-6 text-foreground">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
        <p className="text-sm font-semibold text-white/70" aria-live="polite">
          Room 입장 중
        </p>
      </div>
    </main>
  );
}
