import { UserMenu } from '@/features/auth/components/UserMenu';
export default function HomePage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-2xl font-semibold">Syfity Home</h1>
      <p className="text-sm text-muted-foreground">로그인 성공 · Home 화면은 추후 확장됩니다.</p>
      <UserMenu />
    </main>
  );
}
