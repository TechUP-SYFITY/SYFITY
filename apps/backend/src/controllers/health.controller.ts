import { Get, Route } from 'tsoa';

import type { HealthService } from '../services/health.service';
import type { HealthResponse } from '../types/health';

@Route('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth(): HealthResponse {
    return {
      success: true,
      data: this.healthService.getHealth(),
    };
  }
}
