import { Router } from 'express';

import type { RoomLifecycleController } from '../controllers/room-lifecycle.controller';
import { cronAuth } from '../middlewares/cron-auth.middleware';

export function createInternalRouter(
  controller: Pick<RoomLifecycleController, 'inactivateStaleRooms'>,
): Router {
  const router = Router();
  router.post('/rooms/inactivate-stale', cronAuth, (req, res, next) =>
    controller.inactivateStaleRooms(req, res, next),
  );
  return router;
}
