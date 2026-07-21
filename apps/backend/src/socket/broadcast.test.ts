import { describe, expect, it, vi } from 'vitest';

import { broadcastToRoom } from './broadcast';
import { getIo } from '../lib/io';

vi.mock('../lib/io', () => ({
  getIo: vi.fn(),
}));

describe('broadcastToRoom', () => {
  it('호출 시점에 Socket.IO 인스턴스를 조회해 Room으로 이벤트를 전송한다', () => {
    const emit = vi.fn();
    const to = vi.fn().mockReturnValue({ emit });
    vi.mocked(getIo).mockReturnValue({ to } as never);

    broadcastToRoom('room-1', 'playlist:updated', { playlist: [] });

    expect(getIo).toHaveBeenCalledTimes(1);
    expect(to).toHaveBeenCalledWith('room:room-1');
    expect(emit).toHaveBeenCalledWith('playlist:updated', { playlist: [] });
  });
});
