import type { IRoomRepository, InactivateStaleRoomsResult } from '../types/room';

export class RoomLifecycleService {
  constructor(private readonly roomRepo: Pick<IRoomRepository, 'inactivateStaleRooms'>) {}

  async inactivateStaleRooms(): Promise<InactivateStaleRoomsResult> {
    const inactivatedCount = await this.roomRepo.inactivateStaleRooms();
    return { inactivatedCount };
  }
}
