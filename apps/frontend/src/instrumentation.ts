export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  const { isMockingEnabled } = await import('@/shared/lib/env');
  if (!isMockingEnabled()) {
    return;
  }

  const { server } = await import('@/shared/mocks/server');
  server.listen({ onUnhandledRequest: 'bypass' });
}
