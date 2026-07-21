/*
  `rooms_closed_at_idx` is intentionally a partial index. Prisma schema cannot
  express the closed-status predicate required by stale-room cleanup queries.

  Warnings:

  - You are about to drop the column `last_activity_at` on the `rooms` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "rooms" DROP COLUMN "last_activity_at";

-- CreateIndex
CREATE INDEX "rooms_host_id_status_updated_at_idx" ON "rooms"("host_id", "status", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "rooms_closed_at_idx" ON "rooms"("closed_at") WHERE "status" = 'closed';
