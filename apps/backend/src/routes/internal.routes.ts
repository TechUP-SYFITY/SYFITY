import { Router } from 'express';

import type { MetadataRefreshController } from '../controllers/metadata-refresh.controller';
import type { ProfileImageCleanupController } from '../controllers/profile-image-cleanup.controller';
import type { RoomLifecycleController } from '../controllers/room-lifecycle.controller';
import { cronAuth } from '../middlewares/cron-auth.middleware';

export function createInternalRouter(
  roomLifecycleController: Pick<RoomLifecycleController, 'inactivateStaleRooms'>,
  metadataRefreshController: Pick<MetadataRefreshController, 'refreshStaleMetadata'>,
  profileImageCleanupController: Pick<ProfileImageCleanupController, 'cleanup'>,
): Router {
  const router = Router();
  router.post('/rooms/inactivate-stale', cronAuth, (req, res, next) =>
    roomLifecycleController.inactivateStaleRooms(req, res, next),
  );
  router.post('/playlist-items/refresh-stale-metadata', cronAuth, (req, res, next) =>
    metadataRefreshController.refreshStaleMetadata(req, res, next),
  );
  router.post('/profile-image-objects/cleanup', cronAuth, (req, res, next) =>
    profileImageCleanupController.cleanup(req, res, next),
  );
  return router;
}
