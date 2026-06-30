export interface HealthStatus {
  status: 'ok';
}

export class HealthService {
  getHealth(): HealthStatus {
    return { status: 'ok' };
  }
}
