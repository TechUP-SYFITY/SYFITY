import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { createInternalRouter } from './internal.routes';
import { cronAuth } from '../middlewares/cron-auth.middleware';

type RouteLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: (req: Request, res: Response, next: NextFunction) => void }>;
  };
};

function getRoute(
  router: ReturnType<typeof createInternalRouter>,
  path: string,
): NonNullable<RouteLayer['route']> {
  const layer = (router as unknown as { stack: RouteLayer[] }).stack.find(
    (entry) => entry.route?.path === path,
  );
  if (!layer?.route) throw new Error(`Route not found: ${path}`);
  return layer.route;
}

describe('createInternalRouter', () => {
  it('세 Cron 엔드포인트에 cronAuth를 먼저 적용하고 각 Controller로 요청을 전달한다', () => {
    const roomLifecycleController = { inactivateStaleRooms: vi.fn() };
    const metadataRefreshController = { refreshStaleMetadata: vi.fn() };
    const profileImageCleanupController = { cleanup: vi.fn() };
    const router = createInternalRouter(
      roomLifecycleController,
      metadataRefreshController,
      profileImageCleanupController,
    );
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    const roomLifecycleRoute = getRoute(router, '/rooms/inactivate-stale');
    const metadataRefreshRoute = getRoute(router, '/playlist-items/refresh-stale-metadata');
    const profileImageCleanupRoute = getRoute(router, '/profile-image-objects/cleanup');

    expect(roomLifecycleRoute.methods).toEqual({ post: true });
    expect(metadataRefreshRoute.methods).toEqual({ post: true });
    expect(profileImageCleanupRoute.methods).toEqual({ post: true });
    expect(roomLifecycleRoute.stack[0]?.handle).toBe(cronAuth);
    expect(metadataRefreshRoute.stack[0]?.handle).toBe(cronAuth);
    expect(profileImageCleanupRoute.stack[0]?.handle).toBe(cronAuth);

    roomLifecycleRoute.stack[1]?.handle(req, res, next);
    metadataRefreshRoute.stack[1]?.handle(req, res, next);
    profileImageCleanupRoute.stack[1]?.handle(req, res, next);

    expect(roomLifecycleController.inactivateStaleRooms).toHaveBeenCalledWith(req, res, next);
    expect(metadataRefreshController.refreshStaleMetadata).toHaveBeenCalledWith(req, res, next);
    expect(profileImageCleanupController.cleanup).toHaveBeenCalledWith(req, res, next);
  });
});
