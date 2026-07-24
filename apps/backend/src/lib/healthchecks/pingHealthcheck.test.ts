import { afterEach, describe, expect, it, vi } from 'vitest';

import { pingHealthcheck } from './pingHealthcheck';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('pingHealthcheck', () => {
  it('URL이 있을 때 GET ping을 전송한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response());
    vi.stubGlobal('fetch', fetchMock);

    await pingHealthcheck('https://hc-ping.com/uuid');

    expect(fetchMock).toHaveBeenCalledWith('https://hc-ping.com/uuid', { method: 'GET' });
  });

  it('URL이 없거나 ping이 실패해도 작업 성공 흐름을 방해하지 않는다', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network error'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(pingHealthcheck(undefined)).resolves.toBeUndefined();
    await expect(pingHealthcheck('https://hc-ping.com/uuid')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
