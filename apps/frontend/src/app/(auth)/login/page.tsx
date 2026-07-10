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
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_30%,rgba(114,244,164,0.10),transparent_70%)]"
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
