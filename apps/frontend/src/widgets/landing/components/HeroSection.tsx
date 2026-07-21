import { Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Badge } from '@/shared/components/ui/Badge';
import { buttonVariants } from '@/shared/components/ui/Button';

import heroPreview from '../assets/hero-preview.png';
import { LOGIN_ROUTE } from '../landingData';

export function HeroSection() {
  return (
    <section className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-4 pt-32 pb-20 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:pt-40 lg:pb-28">
      <div className="max-w-xl">
        <Badge variant="primary" dot className="animate-rise">
          음악으로 연결되는 실시간 커뮤니티
        </Badge>

        <h1
          className="mt-6 animate-rise text-4xl/tight font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
          style={{ animationDelay: `120ms` }}
        >
          함께 듣는 순간,
          <br />
          음악이{' '}
          <span className="relative inline-block text-primary-400">
            더 가까워진다
            <span className="absolute -bottom-1 left-0 h-0.5 w-full rounded-full bg-linear-to-r from-primary to-accent" />
          </span>
        </h1>

        <p
          className="mt-6 animate-rise text-base/relaxed text-white/55 sm:text-lg"
          style={{ animationDelay: `240ms` }}
        >
          실시간으로 음악을 공유하고 채팅하며
          <br className="hidden sm:block" /> 특별한 시간을 만들어보세요.
        </p>

        <div className="mt-8 animate-rise" style={{ animationDelay: `360ms` }}>
          <Link href={LOGIN_ROUTE} className={buttonVariants({ size: 'lg' })}>
            <Play className="fill-current" />
            시작하기
          </Link>
        </div>
      </div>

      <div className="flex justify-center lg:justify-end">
        <Image
          src={heroPreview}
          alt="Syfity 실시간 플레이어 미리보기 — 친구들과 함께 듣는 화면"
          priority
          className="h-auto w-full max-w-sm animate-rise rounded-2xl shadow-[0_0_60px_rgba(114,244,164,0.12),0_0_120px_rgba(136,92,246,0.08)]"
          style={{ animationDelay: `480ms` }}
        />
      </div>
    </section>
  );
}
