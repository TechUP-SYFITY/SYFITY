import { SyfityWordmark } from './SyfityWordmark';

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6">
        <SyfityWordmark textClassName="text-base" markClassName="size-5" />
        <p className="text-xs text-white/40">
          © {new Date().getFullYear()} Syfity. 음악으로 연결된 세상.
        </p>
        <div className="flex gap-3 text-xs text-white/55">
          <a href="/terms">이용약관</a>
          <a href="/privacy">개인정보처리방침</a>
        </div>
      </div>
    </footer>
  );
}
