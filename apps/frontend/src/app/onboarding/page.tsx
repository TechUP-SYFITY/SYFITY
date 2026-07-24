import { Header } from '@/shared/components/layout';

import { OnboardingForm } from '@/features/auth/components/OnboardingForm';

export default function OnboardingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/4 size-125 rounded-full bg-primary/5 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 right-1/4 size-105 rounded-full bg-accent/5 blur-[120px]"
      />
      <Header variant="app" />
      <main className="relative flex flex-1 items-center justify-center px-5 py-12">
        <OnboardingForm />
      </main>
    </div>
  );
}
