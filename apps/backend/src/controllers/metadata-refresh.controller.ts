import type { NextFunction, Request, Response } from 'express';

import { config } from '../config';
import { pingHealthcheck } from '../lib/healthchecks/pingHealthcheck';
import type { MetadataRefreshService } from '../services/metadata-refresh.service';

export class MetadataRefreshController {
  constructor(
    private readonly metadataRefreshService: Pick<MetadataRefreshService, 'refreshStaleMetadata'>,
  ) {}

  async refreshStaleMetadata(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.metadataRefreshService.refreshStaleMetadata();
      await pingHealthcheck(config.healthchecks.metadataRefreshUrl);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
