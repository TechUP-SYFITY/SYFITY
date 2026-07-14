-- 방 안에서 동일한 YouTube videoId를 한 번만 추가할 수 있게 한다.
-- 운영 반영 전 중복 행이 없는지 확인해야 한다. 기존 중복을 자동으로 삭제하지 않는다.
CREATE UNIQUE INDEX "playlist_items_room_id_video_id_key" ON "playlist_items"("room_id", "video_id");
