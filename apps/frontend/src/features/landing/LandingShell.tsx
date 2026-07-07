import { Footer, Header } from '@/shared/components/layout';

import { FeaturesSection } from './components/FeaturesSection';
import { HeroSection } from './components/HeroSection';
import { LandingNav } from './components/LandingNav';

export function LandingShell() {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <Header actions={<LandingNav />} />

      <main className="relative flex-1 overflow-hidden bg-background">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-blob absolute -top-40 left-1/4 size-125 rounded-full bg-primary/8 blur-[120px]" />
          <div
            className="animate-blob absolute top-40 -right-32 size-150 rounded-full bg-accent/8 blur-[130px]"
            style={{ animationDelay: '-4s', animationDuration: '18s' }}
          />
          <div
            className="animate-blob absolute bottom-0 -left-32 size-125 rounded-full bg-primary/5 blur-[120px]"
            style={{ animationDelay: '-8s', animationDuration: '16s' }}
          />
        </div>

        <HeroSection />
        <FeaturesSection />
      </main>

      <Footer />
    </div>
  );
}
