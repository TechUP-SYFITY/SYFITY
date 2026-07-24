WITH ranked_current_objects AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "user_id"
      ORDER BY "updated_at" DESC, "id" DESC
    ) AS row_number
  FROM "profile_image_objects"
  WHERE "status" = 'current'
)
UPDATE "profile_image_objects" AS object
SET "status" = 'delete_pending'
FROM ranked_current_objects AS ranked
WHERE object."id" = ranked."id"
  AND ranked.row_number > 1;

CREATE UNIQUE INDEX "profile_image_objects_one_current_per_user_key"
  ON "profile_image_objects"("user_id")
  WHERE "status" = 'current';
