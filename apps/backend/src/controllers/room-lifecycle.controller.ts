import type { NextFunction, Request, Response } from 'express';

import type { RoomLifecycleService } from '../services/room-lifecycle.service';

export class RoomLifecycleController {
  constructor(
    private readonly roomLifecycleService: Pick<RoomLifecycleService, 'inactivateStaleRooms'>,
  ) {}

  async inactivateStaleRooms(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.roomLifecycleService.inactivateStaleRooms();
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
