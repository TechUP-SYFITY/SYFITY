import { describe, expect, it, vi } from 'vitest';

import { HealthController } from './health.controller';
import type { HealthService } from '../services/health.service';

describe('HealthController', () => {
  it('HealthService 결과를 success 응답으로 감싼다', () => {
    const healthService = {
      getHealth: vi.fn().mockReturnValue({ status: 'ok' }),
    } as unknown as HealthService;
    const controller = new HealthController(healthService);

    expect(controller.getHealth()).toEqual({
      success: true,
      data: { status: 'ok' },
    });
  });
});
