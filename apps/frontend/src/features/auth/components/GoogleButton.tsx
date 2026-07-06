'use client';

import { useState } from 'react';

import { cn } from '@/shared/lib/utils';

import { authApi } from '@/features/auth/api/authApi';

// 공식 signin-assets 번들의 표준 컬러 "G" 로고 (모노크롬 금지, 색·비율 변경 금지).
function GoogleLogo() {
  return (
    <svg className="size-4.5 shrink-0" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

interface GoogleButtonProps {
  returnUrl?: string;
  className?: string;
}

export function GoogleButton({ returnUrl, className }: GoogleButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    setIsLoading(true);
    authApi.loginWithGoogle(returnUrl);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-busy={isLoading}
      className={cn(
        // Google 다크 규격(불변): 배경 #131314 / 테두리 #8E918F 1px / 글자 #E3E3E3, 14/20, medium weight.
        // 라벨이 한글이라 Roboto(라틴 전용, 한글 글리프 없음) 대신 앱 폰트 Pretendard를 상속해 사용한다.
        // Google은 텍스트 현지화를 허용하므로 규격 위반 아님. 색·테두리·컬러 G 로고는 고정.
        'flex w-full cursor-pointer items-center justify-center rounded-2xl border border-[#8E918F] bg-[#131314] py-3.5 text-sm leading-5 font-medium text-[#E3E3E3] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.2)] transition-colors outline-none hover:bg-gray-800/40 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70',
        // 패딩: 로고 앞 12 / 로고 뒤 10(gap) / 텍스트 뒤 12
        'gap-2.5 px-3',
        className,
      )}
    >
      {isLoading ? (
        <svg className="size-4.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        <GoogleLogo />
      )}
      구글로 계속하기
    </button>
  );
}
