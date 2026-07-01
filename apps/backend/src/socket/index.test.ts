import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const JWT_SECRET = 'test-access-secret';

function makeSocket(cookieHeader: string): Socket {
  return {
    handshake: { headers: { cookie: cookieHeader } },
    data: {},
  } as unknown as Socket;
}

describe('socketAuth', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('JWT_ACCESS_SECRET', JWT_SECRET);
  });

  it('유효한 access_token 쿠키로 socket.data에 userId와 email을 주입한다', async () => {
    const { socketAuth } = await import('./socketAuth');
    const token = jwt.sign({ id: 'user-id', email: 'user@example.com' }, JWT_SECRET);
    const socket = makeSocket(`access_token=${token}`);
    const next = vi.fn();

    socketAuth(socket, next);

    expect(socket.data.userId).toBe('user-id');
    expect(socket.data.email).toBe('user@example.com');
    expect(next).toHaveBeenCalledWith();
  });

  it('쿠키가 없으면 AUTH_UNAUTHORIZED 에러를 next로 전달한다', async () => {
    const { socketAuth } = await import('./socketAuth');
    const socket = makeSocket('');
    const next = vi.fn();

    socketAuth(socket, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ data: { code: 'AUTH_UNAUTHORIZED' } }),
    );
  });

  it('만료된 토큰이면 AUTH_TOKEN_EXPIRED 에러를 next로 전달한다', async () => {
    const { socketAuth } = await import('./socketAuth');
    const token = jwt.sign({ id: 'user-id', email: 'user@example.com' }, JWT_SECRET, {
      expiresIn: -1,
    });
    const socket = makeSocket(`access_token=${token}`);
    const next = vi.fn();

    socketAuth(socket, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ data: { code: 'AUTH_TOKEN_EXPIRED' } }),
    );
  });

  it('유효하지 않은 서명의 토큰이면 AUTH_UNAUTHORIZED 에러를 next로 전달한다', async () => {
    const { socketAuth } = await import('./socketAuth');
    const token = jwt.sign({ id: 'user-id', email: 'user@example.com' }, 'wrong-secret');
    const socket = makeSocket(`access_token=${token}`);
    const next = vi.fn();

    socketAuth(socket, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ data: { code: 'AUTH_UNAUTHORIZED' } }),
    );
  });

  it('쿠키가 여러 개인 경우에도 access_token만 추출한다', async () => {
    const { socketAuth } = await import('./socketAuth');
    const token = jwt.sign({ id: 'user-id', email: 'user@example.com' }, JWT_SECRET);
    const socket = makeSocket(`other_cookie=abc; access_token=${token}; another=xyz`);
    const next = vi.fn();

    socketAuth(socket, next);

    expect(socket.data.userId).toBe('user-id');
    expect(next).toHaveBeenCalledWith();
  });
});
