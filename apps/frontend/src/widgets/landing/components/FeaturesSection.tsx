import { LANDING_FEATURES } from '../landingData';
import { FeatureCard } from './FeatureCard';

export function FeaturesSection() {
  return (
    <section className="relative z-10 mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold text-accent">핵심 기능</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          음악을 함께하는
          <br />
          새로운 방법
        </h2>
        <p className="mt-4 text-base text-white/50">
          Syfity는 음악 청취를 혼자의 경험에서 모두의 경험으로 바꿉니다.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LANDING_FEATURES.map((feature, index) => (
          <FeatureCard key={feature.title} {...feature} delayMs={index * 120} />
        ))}
      </div>
    </section>
  );
}
