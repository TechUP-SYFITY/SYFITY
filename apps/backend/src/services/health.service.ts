import type { HealthStatus } from '../types/health';

export class HealthService {
  getHealth(): HealthStatus {
    return { status: 'ok' };
  }
}
