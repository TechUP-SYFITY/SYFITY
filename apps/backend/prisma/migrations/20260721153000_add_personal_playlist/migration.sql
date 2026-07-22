-- CreateTable
CREATE TABLE "personal_playlists" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "personal_playlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_playlist_items" (
    "id" UUID NOT NULL,
    "personal_playlist_id" UUID NOT NULL,
    "video_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "channel_title" TEXT NOT NULL,
    "thumbnail_url" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "PlaylistItemStatus" NOT NULL DEFAULT 'available',
    "added_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_playlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "personal_playlists_owner_id_updated_at_idx" ON "personal_playlists"("owner_id", "updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "personal_playlist_items_personal_playlist_id_video_id_key" ON "personal_playlist_items"("personal_playlist_id", "video_id");

-- CreateIndex
CREATE INDEX "personal_playlist_items_personal_playlist_id_position_idx" ON "personal_playlist_items"("personal_playlist_id", "position");

-- AddForeignKey
ALTER TABLE "personal_playlists" ADD CONSTRAINT "personal_playlists_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_playlist_items" ADD CONSTRAINT "personal_playlist_items_personal_playlist_id_fkey" FOREIGN KEY ("personal_playlist_id") REFERENCES "personal_playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
