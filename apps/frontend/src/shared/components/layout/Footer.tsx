import Link from 'next/link';

import { SyfityWordmark } from './SyfityWordmark';

const LINKS = [
  { label: '서비스 약관', href: '/terms' },
  { label: '개인정보처리방침', href: '/privacy' },
  { label: '도움말', href: '/help' },
];

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6">
        <SyfityWordmark textClassName="text-base" markClassName="size-5" />
        <p className="text-xs text-white/40">
          © {new Date().getFullYear()} Syfity. 음악으로 연결된 세상.
        </p>
        <nav className="flex items-center gap-5">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs text-white/45 transition-colors hover:text-white/70"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
