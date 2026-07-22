import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/healthchecks/pingHealthcheck', () => ({ pingHealthcheck: vi.fn() }));

import { MetadataRefreshController } from './metadata-refresh.controller';
import { pingHealthcheck } from '../lib/healthchecks/pingHealthcheck';

function makeResponse(): Response {
  const response = { status: vi.fn(), json: vi.fn() };
  response.status.mockReturnValue(response);
  return response as unknown as Response;
}

describe('MetadataRefreshController', () => {
  it('성공 시 결과를 반환하고 헬스체크 ping을 요청한다', async () => {
    const result = {
      playlist: { checkedCount: 2, unavailableCount: 1 },
      personalPlaylist: { checkedCount: 3, unavailableCount: 0 },
    };
    const service = { refreshStaleMetadata: vi.fn().mockResolvedValue(result) };
    const controller = new MetadataRefreshController(service);
    const res = makeResponse();
    const next = vi.fn() as unknown as NextFunction;

    await controller.refreshStaleMetadata({} as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
    expect(pingHealthcheck).toHaveBeenCalledOnce();
    expect(next).not.toHaveBeenCalled();
  });

  it('갱신 또는 ping 실패를 next로 전달한다', async () => {
    const error = new Error('failed');
    const service = { refreshStaleMetadata: vi.fn().mockRejectedValue(error) };
    const controller = new MetadataRefreshController(service);
    const next = vi.fn() as unknown as NextFunction;

    await controller.refreshStaleMetadata({} as Request, makeResponse(), next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
