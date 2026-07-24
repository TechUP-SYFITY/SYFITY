-- AlterEnum
ALTER TYPE "RoomMemberStatus" ADD VALUE 'kicked';

-- AlterTable
ALTER TABLE "room_members" ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "room_members_room_id_status_idx" ON "room_members"("room_id", "status");
