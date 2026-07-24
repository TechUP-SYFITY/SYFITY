import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/healthchecks/pingHealthcheck', () => ({ pingHealthcheck: vi.fn() }));

import { RoomLifecycleController } from './room-lifecycle.controller';
import { pingHealthcheck } from '../lib/healthchecks/pingHealthcheck';

function makeResponse(): Response {
  const response = { status: vi.fn(), json: vi.fn() };
  response.status.mockReturnValue(response);
  return response as unknown as Response;
}

describe('RoomLifecycleController', () => {
  it('성공 시 처리 건수를 200 응답으로 반환한다', async () => {
    const service = { inactivateStaleRooms: vi.fn().mockResolvedValue({ inactivatedCount: 2 }) };
    const controller = new RoomLifecycleController(service);
    const res = makeResponse();
    const next = vi.fn() as unknown as NextFunction;

    await controller.inactivateStaleRooms({} as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { inactivatedCount: 2 } });
    expect(pingHealthcheck).toHaveBeenCalledOnce();
    expect(next).not.toHaveBeenCalled();
  });

  it('Service 오류를 next로 전달한다', async () => {
    const error = new Error('failed');
    const service = { inactivateStaleRooms: vi.fn().mockRejectedValue(error) };
    const controller = new RoomLifecycleController(service);
    const next = vi.fn() as unknown as NextFunction;

    await controller.inactivateStaleRooms({} as Request, makeResponse(), next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
