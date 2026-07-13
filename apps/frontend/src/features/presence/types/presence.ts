import type { RoomMember } from '@/shared/types/domain';

export type PresenceMember = Omit<RoomMember, 'id'>;
