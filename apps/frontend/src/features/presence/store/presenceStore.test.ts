import { beforeEach, describe, expect, it } from 'vitest';

import { usePresenceStore } from './presenceStore';
import type { PresenceMember } from '../types/presence';

const host: PresenceMember = {
  nickname: '민지',
  profileImage: null,
  role: 'host',
  status: 'online',
  userId: 'host-1',
};

const member: PresenceMember = {
  nickname: '지민',
  profileImage: null,
  role: 'member',
  status: 'online',
  userId: 'member-1',
};

describe('usePresenceStore', () => {
  beforeEach(() => {
    usePresenceStore.getState().clearMembers();
  });

  it('새 참여자를 추가한다', () => {
    usePresenceStore.getState().applyPresenceUpdate(member);

    expect(usePresenceStore.getState().members).toEqual([member]);
  });

  it('기존 참여자 상태를 갱신하고 나머지 멤버를 보존한다', () => {
    usePresenceStore.getState().setMembers([host, member]);
    usePresenceStore.getState().applyPresenceUpdate({ ...member, status: 'offline' });

    expect(usePresenceStore.getState().members).toEqual([host, { ...member, status: 'offline' }]);
  });

  it('left 상태의 참여자를 목록에서 제거한다', () => {
    usePresenceStore.getState().setMembers([host, member]);
    usePresenceStore.getState().applyPresenceUpdate({ ...member, status: 'left' });

    expect(usePresenceStore.getState().members).toEqual([host]);
  });

  it('목록에 없는 참여자의 left 이벤트를 안전하게 무시한다', () => {
    usePresenceStore.getState().setMembers([host]);
    usePresenceStore.getState().applyPresenceUpdate({ ...member, status: 'left' });

    expect(usePresenceStore.getState().members).toEqual([host]);
  });

  it('전체 roster로 목록을 교체한다', () => {
    usePresenceStore.getState().setMembers([host]);
    usePresenceStore.getState().setMembers([member]);

    expect(usePresenceStore.getState().members).toEqual([member]);
  });

  it('참여자 목록을 비운다', () => {
    usePresenceStore.getState().setMembers([host, member]);
    usePresenceStore.getState().clearMembers();

    expect(usePresenceStore.getState().members).toEqual([]);
  });
});
