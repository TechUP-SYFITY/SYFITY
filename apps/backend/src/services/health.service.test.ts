import { describe, expect, it } from 'vitest';

import { HealthService } from './health.service';

describe('HealthService', () => {
  it('상태 ok를 반환한다', () => {
    const service = new HealthService();

    expect(service.getHealth()).toEqual({ status: 'ok' });
  });
});
