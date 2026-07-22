-- AlterTable
ALTER TABLE "users" ADD COLUMN "onboarded_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "playlist_items" ADD COLUMN "metadata_refreshed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "playlist_items" SET "metadata_refreshed_at" = "added_at";

-- AlterTable
ALTER TABLE "personal_playlist_items" ADD COLUMN "metadata_refreshed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "personal_playlist_items" SET "metadata_refreshed_at" = "added_at";
