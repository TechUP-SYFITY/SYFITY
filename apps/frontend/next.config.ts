import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // E2E는 별도 산출물 디렉터리를 써서, 개발 중인 `next dev`의 .next와 충돌하지 않게 한다.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
};

export default nextConfig;
