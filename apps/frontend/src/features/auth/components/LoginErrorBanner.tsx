import { AlertCircle } from 'lucide-react';

export function LoginErrorBanner() {
  return (
    <div
      role="alert"
      className="flex w-full items-center gap-3 border-b border-destructive/18 bg-destructive/10 px-5 py-3.5 text-sm/5 text-destructive"
    >
      <AlertCircle className="size-4 shrink-0" aria-hidden />
      로그인에 실패했어요. 다시 시도해주세요.
    </div>
  );
}
