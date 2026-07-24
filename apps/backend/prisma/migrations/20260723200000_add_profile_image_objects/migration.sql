CREATE TYPE "ProfileImageObjectStatus" AS ENUM ('pending', 'current', 'delete_pending');

CREATE TABLE "profile_image_objects" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "path" TEXT NOT NULL,
  "status" "ProfileImageObjectStatus" NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "profile_image_objects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "profile_image_objects_path_key" ON "profile_image_objects"("path");
CREATE INDEX "profile_image_objects_user_id_status_idx" ON "profile_image_objects"("user_id", "status");
CREATE INDEX "profile_image_objects_status_created_at_idx" ON "profile_image_objects"("status", "created_at");

ALTER TABLE "profile_image_objects"
  ADD CONSTRAINT "profile_image_objects_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
