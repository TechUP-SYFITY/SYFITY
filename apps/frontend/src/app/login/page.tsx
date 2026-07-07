// 로그인 랜딩: 다크 풀스크린 위 LoginCard + 푸터.
import { LoginCard } from '@/features/auth/components/LoginCard';

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
    returnUrl?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, returnUrl } = await searchParams;

  return (
    <main className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-background px-6 pt-16 pb-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 30%, rgba(114,244,164,0.10), transparent 70%)',
        }}
      />

      <div className="relative flex flex-1 items-center justify-center">
        <LoginCard returnUrl={returnUrl} hasError={error === 'auth_failed'} />
      </div>

      <footer className="relative text-center text-xs text-muted-foreground/50">
        © 2026 Syfity · 음악으로 연결된 세상.
      </footer>
    </main>
  );
}
