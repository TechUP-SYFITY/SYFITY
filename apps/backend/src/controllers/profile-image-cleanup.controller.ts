import type { NextFunction, Request, Response } from 'express';

import type { ProfileImageCleanupService } from '../services/profile-image-cleanup.service';

export class ProfileImageCleanupController {
  constructor(private readonly service: Pick<ProfileImageCleanupService, 'cleanup'>) {}

  async cleanup(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.cleanup();
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
