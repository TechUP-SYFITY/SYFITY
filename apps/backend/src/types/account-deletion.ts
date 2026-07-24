export interface IAccountDeletionRepository {
  finalizeDeletion(
    userId: string,
    profileImageBucket: string,
  ): Promise<{ closedRoomIds: string[] }>;
}
