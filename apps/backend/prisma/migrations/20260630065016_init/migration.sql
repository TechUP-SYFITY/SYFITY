-- CreateEnum
CREATE TYPE "RoomVisibility" AS ENUM ('private', 'public');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('active', 'inactive', 'closed');

-- CreateEnum
CREATE TYPE "RoomRole" AS ENUM ('host', 'member', 'guest');

-- CreateEnum
CREATE TYPE "RoomMemberStatus" AS ENUM ('online', 'offline', 'left');

-- CreateEnum
CREATE TYPE "PlaylistItemStatus" AS ENUM ('available', 'unavailable');

-- CreateEnum
CREATE TYPE "ChatMessageType" AS ENUM ('user', 'system');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "profile_image" TEXT,
    "refresh_token" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "host_id" UUID NOT NULL,
    "visibility" "RoomVisibility" NOT NULL,
    "invite_code" VARCHAR(8) NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'active',
    "last_activity_at" TIMESTAMPTZ NOT NULL,
    "closed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_members" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "RoomRole" NOT NULL,
    "status" "RoomMemberStatus" NOT NULL,
    "joined_at" TIMESTAMPTZ NOT NULL,
    "last_seen_at" TIMESTAMPTZ,
    "left_at" TIMESTAMPTZ,

    CONSTRAINT "room_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recent_rooms" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "last_joined_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "recent_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlist_items" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "video_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "channel_title" TEXT NOT NULL,
    "thumbnail_url" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "added_by" UUID NOT NULL,
    "status" "PlaylistItemStatus" NOT NULL DEFAULT 'available',
    "added_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "playlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playback_states" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "video_id" TEXT,
    "playlist_item_id" UUID,
    "base_current_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_playing" BOOLEAN NOT NULL DEFAULT false,
    "server_started_at" TIMESTAMPTZ,
    "server_paused_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "playback_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "user_id" UUID,
    "type" "ChatMessageType" NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_invite_code_key" ON "rooms"("invite_code");

-- CreateIndex
CREATE UNIQUE INDEX "room_members_room_id_user_id_key" ON "room_members"("room_id", "user_id");

-- CreateIndex
CREATE INDEX "recent_rooms_user_id_last_joined_at_idx" ON "recent_rooms"("user_id", "last_joined_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "recent_rooms_user_id_room_id_key" ON "recent_rooms"("user_id", "room_id");

-- CreateIndex
CREATE INDEX "playlist_items_room_id_position_idx" ON "playlist_items"("room_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "playback_states_room_id_key" ON "playback_states"("room_id");

-- CreateIndex
CREATE INDEX "chat_messages_room_id_created_at_id_idx" ON "chat_messages"("room_id", "created_at" DESC, "id" DESC);

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recent_rooms" ADD CONSTRAINT "recent_rooms_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recent_rooms" ADD CONSTRAINT "recent_rooms_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_items" ADD CONSTRAINT "playlist_items_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_items" ADD CONSTRAINT "playlist_items_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playback_states" ADD CONSTRAINT "playback_states_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playback_states" ADD CONSTRAINT "playback_states_playlist_item_id_fkey" FOREIGN KEY ("playlist_item_id") REFERENCES "playlist_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
