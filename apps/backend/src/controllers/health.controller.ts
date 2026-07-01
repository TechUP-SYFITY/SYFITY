import { Get, Route } from 'tsoa';

import type { HealthService, HealthStatus } from '../services/health.service';

interface HealthResponse {
  success: true;
  data: HealthStatus;
}

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
