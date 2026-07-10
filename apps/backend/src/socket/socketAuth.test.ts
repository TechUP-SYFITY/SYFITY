import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const JWT_SECRET = 'test-access-secret';
const USER_ID = '11111111-1111-4111-8111-111111111111';

let findUserByIdMock: ReturnType<typeof vi.fn>;

function makeSocket(cookie: string): {
  socket: Socket;
  next: (err?: Error) => void;
} {
  const socket = {
    handshake: { headers: { cookie } },
    data: {},
  } as unknown as Socket;
  return { socket, next: vi.fn<(err?: Error) => void>() };
}

describe('socketAuth', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('JWT_ACCESS_SECRET', JWT_SECRET);
    findUserByIdMock = vi.fn().mockResolvedValue({
      id: USER_ID,
      email: 'user@example.com',
      nickname: 'Alice',
      profileImage: null,
    });
    vi.doMock('../lib/prisma', () => ({ prisma: {} }));
    vi.doMock('../repositories/user.repository', () => ({
      UserRepository: vi.fn().mockImplementation(function MockUserRepository() {
        return {
          findUserById: findUserByIdMock,
        };
      }),
    }));
  });

  it('유효한 access_token 쿠키를 검증하고 socket.data에 userId/email을 주입한다', async () => {
    const { socketAuth } = await import('./socketAuth');
    const token = jwt.sign({ id: USER_ID, email: 'user@example.com' }, JWT_SECRET);
    const { socket, next } = makeSocket(`access_token=${token}`);

    await socketAuth(socket, next);

    expect(socket.data.userId).toBe(USER_ID);
    expect(socket.data.email).toBe('user@example.com');
    expect(next).toHaveBeenCalledWith();
    expect(findUserByIdMock).toHaveBeenCalledWith(USER_ID);
  });

  it('유효한 토큰이지만 DB에 사용자가 없으면 AUTH_USER_NOT_FOUND로 next를 호출한다', async () => {
    findUserByIdMock.mockResolvedValue(null);
    const { socketAuth } = await import('./socketAuth');
    const token = jwt.sign({ id: USER_ID, email: 'user@example.com' }, JWT_SECRET);
    const { socket, next } = makeSocket(`access_token=${token}`);

    await socketAuth(socket, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ data: { code: 'AUTH_USER_NOT_FOUND' } }),
    );
    expect(socket.data.userId).toBeUndefined();
  });

  it('쿠키가 없으면 AUTH_UNAUTHORIZED로 next를 호출한다', async () => {
    const { socketAuth } = await import('./socketAuth');
    const { socket, next } = makeSocket('');

    await socketAuth(socket, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ data: { code: 'AUTH_UNAUTHORIZED' } }),
    );
    expect(findUserByIdMock).not.toHaveBeenCalled();
  });

  it('만료된 토큰이면 AUTH_TOKEN_EXPIRED로 next를 호출한다', async () => {
    const { socketAuth } = await import('./socketAuth');
    const token = jwt.sign({ id: USER_ID, email: 'user@example.com' }, JWT_SECRET, {
      expiresIn: -1,
    });
    const { socket, next } = makeSocket(`access_token=${token}`);

    await socketAuth(socket, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ data: { code: 'AUTH_TOKEN_EXPIRED' } }),
    );
    expect(findUserByIdMock).not.toHaveBeenCalled();
  });

  it('payload id가 UUID가 아니면 AUTH_UNAUTHORIZED로 next를 호출한다', async () => {
    const { socketAuth } = await import('./socketAuth');
    const token = jwt.sign({ id: 'user-id', email: 'user@example.com' }, JWT_SECRET);
    const { socket, next } = makeSocket(`access_token=${token}`);

    await socketAuth(socket, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ data: { code: 'AUTH_UNAUTHORIZED' } }),
    );
    expect(socket.data.userId).toBeUndefined();
    expect(findUserByIdMock).not.toHaveBeenCalled();
  });
});
