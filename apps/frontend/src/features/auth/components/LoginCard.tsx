import Link from 'next/link';

import { SyfityWordmark } from '@/shared/components/layout';

import { GoogleButton } from './GoogleButton';
import { LoginErrorBanner } from './LoginErrorBanner';
interface LoginCardProps {
  returnUrl?: string;
  hasError?: boolean;
}

export function LoginCard({ returnUrl, hasError = false }: LoginCardProps) {
  return (
    <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-surface/76 shadow-[0px_40px_100px_0px_rgba(0,0,0,0.65),0px_0px_80px_0px_rgba(114,244,164,0.05),inset_0px_0px_0px_1px_rgba(255,255,255,0.04)] backdrop-blur">
      {hasError && <LoginErrorBanner />}

      <div className="flex flex-col gap-7 px-9 pt-9 pb-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Link href="/" className="flex items-center gap-2">
            <SyfityWordmark markClassName="size-8" textClassName="text-2xl" />
          </Link>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl leading-6 font-bold tracking-[-0.5px] text-white">
              Syfity 시작하기
            </h1>
            <p className="text-sm leading-6 text-white/48">Google 계정으로 계속하세요</p>
          </div>
        </div>

        <GoogleButton returnUrl={returnUrl} />
      </div>
    </div>
  );
}
