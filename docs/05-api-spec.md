# 05. API Spec

## 1. 문서 정보

| 항목      | 내용                                                                                                                       |
| --------- | -------------------------------------------------------------------------------------------------------------------------- |
| 문서명    | Syfity API Spec                                                                                                            |
| 버전      | v2.4                                                                                                                       |
| 상태      | Playlist import의 동시 중복 처리 계약을 명확화                                                                             |
| 작성 목적 | Syfity REST API 계약 정의                                                                                                  |
| 기반 문서 | `01-prd.md`, `02-system-architecture.md`, `03-realtime-sync-design.md`, `04-database-design.md`, `06-socket-event-spec.md` |

---

## 2. 공통 규칙

### 2.1 Base URL

```text
로컬: http://localhost:4000/api/v1
운영: https://api.syfity.site/api/v1
```

### 2.2 인증

일반 API는 JWT Access Token을 httpOnly 쿠키로 받는다. Access Token 만료는 1시간, Refresh Token 만료는 30일이며 Refresh Token Rotation을 적용한다.

```ts
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
}
```

인증이 필요 없는 엔드포인트는 `GET /health`, OAuth 시작·콜백, `POST /auth/refresh`, Swagger UI뿐이다. GitHub Actions용 내부 정리 API는 사용자 쿠키 대신 `CRON_SECRET`을 사용한다.

### 2.3 응답 형식

```ts
// 성공
{ success: true, data: { ... } }

// 실패
{ success: false, error: { code: string, message: string } }
```

`204 No Content` 응답은 body를 반환하지 않는 예외다.

### 2.4 에러 코드

| Prefix               | 도메인                     |
| -------------------- | -------------------------- |
| `AUTH_`              | 인증·인가                  |
| `ROOM_`              | Room·참여자·수명 주기      |
| `PLAYLIST_`          | Room Playlist·YouTube 영상 |
| `PERSONAL_PLAYLIST_` | 개인 Playlist              |
| `SEARCH_`            | YouTube 검색               |
| `SERVER_`            | 내부·외부 API 오류         |

공통 오류는 `AUTH_UNAUTHORIZED`(401), `AUTH_TOKEN_EXPIRED`(401), `AUTH_FORBIDDEN`(403), `SERVER_INTERNAL_ERROR`(500)다.

요청 본문·query·path parameter의 형식 또는 값 조합 검증 실패는 모두 `VALIDATION_ERROR`(400)로 반환한다.

### 2.5 REST와 Socket의 경계

- REST는 Room·Playlist·채팅·개인 Playlist의 영속 데이터와 Home 관리 작업을 처리한다.
- 현재 곡, 재생 위치, 반복·셔플, 셔플 큐, 재생 이력은 REST로 조회·변경하지 않는다.
- `POST /room-memberships`는 입장 권한과 참여 이력만 처리한다. 입장 뒤 Socket `room:join`의 `room:joined` snapshot으로 재생 세션, Playlist, 참여자, 최근 채팅을 받는다.
- 재생 제어와 `playback:reset`을 포함한 실시간 이벤트는 `06-socket-event-spec.md`에서 정의한다.

---

## 3. 엔드포인트 목록

```text
GET    /health
GET    /api-docs

GET    /auth/google
GET    /auth/google/callback
POST   /auth/refresh
POST   /auth/logout
GET    /me

GET    /rooms/recent
GET    /rooms/mine
POST   /rooms
POST   /room-memberships
GET    /rooms/:roomId
PATCH  /rooms/:roomId
DELETE /rooms/:roomId
GET    /rooms/:roomId/members?status=kicked
PATCH  /rooms/:roomId/members/:memberId

GET    /rooms/:roomId/playlist
POST   /rooms/:roomId/playlist
DELETE /rooms/:roomId/playlist/:itemId
PATCH  /rooms/:roomId/playlist
POST   /rooms/:roomId/playlist-imports
GET    /rooms/:roomId/chats

GET    /personal-playlists
POST   /personal-playlists
GET    /personal-playlists/:playlistId
PATCH  /personal-playlists/:playlistId
DELETE /personal-playlists/:playlistId
POST   /personal-playlists/:playlistId/items
DELETE /personal-playlists/:playlistId/items/:itemId
PATCH  /personal-playlists/:playlistId/items

GET    /search

POST   /internal/rooms/inactivate-stale
```

---

## 4. 공통 서비스 API

### 4.1 `GET /health`

인증 없이 Backend 상태를 확인한다. UptimeRobot은 이 엔드포인트를 10분마다 호출한다.

```ts
// 200
{ success: true, data: { status: 'ok' } }
```

### 4.2 Auth

| Endpoint                      | 설명                                                             |
| ----------------------------- | ---------------------------------------------------------------- |
| `GET /auth/google?returnUrl=` | Google OAuth 로그인 시작. 성공 뒤 `returnUrl` 또는 Home으로 이동 |
| `GET /auth/google/callback`   | JWT 쿠키 발급 뒤 FE로 리다이렉트                                 |
| `POST /auth/refresh`          | Access·Refresh Token 동시 갱신                                   |
| `POST /auth/logout`           | 쿠키 삭제와 `users.refresh_token` 초기화                         |

`POST /auth/refresh` 실패 시 `AUTH_REFRESH_EXPIRED`(401)를 반환한다.

### 4.3 `GET /me`

현재 로그인 사용자 정보를 반환한다.

```ts
{
  success: true,
  data: { id: string, email: string, nickname: string, profileImage: string | null }
}
```

---

## 5. Room API

### 5.1 `GET /rooms/recent`

사용자가 참여했던 active Room 중 `kicked`가 아닌 Room을 `lastJoinedAt` 내림차순으로 반환한다.

```ts
{ success: true, data: { rooms: [{ id, name, inviteCode, lastJoinedAt }] } }
```

### 5.2 `GET /rooms/mine`

Host가 만든 active·closed Room을 반환한다. Home의 `내 Room` 목록 전용이다. 조회 전에 `closedAt` 30일 경과 Room을 inactive로 보정하며, inactive로 전환된 Room은 응답에서 제외한다.

```ts
{
  success: true,
  data: {
    rooms: [{ id, name, status: 'active' | 'closed', closedAt, updatedAt }]
  }
}
```

### 5.3 `POST /rooms`

새 private Room을 생성한다. 생성자는 Host가 되며, DB에는 Room과 Host 참여 이력만 만든다. 인메모리 재생 세션은 생성하지 않는다.

```ts
// request
{ name: string }

// 201
{ success: true, data: { id, name, inviteCode, status: 'active', createdAt } }
```

`SERVER_INVITE_CODE_GENERATION_FAILED`(500)는 초대 코드 생성 재시도가 모두 실패했을 때 반환한다.

### 5.4 `POST /room-memberships`

초대 코드로 현재 사용자의 active Room 참여 관계를 생성하거나 복원한다. 신규 참여자만 `room_members`를 `left` 상태로 만들고, 기존 참여 이력은 유지한다. `recent_rooms`를 upsert하며, 실제 `online` 전환은 이후 Socket `room:join`에서 수행한다. 이 응답에는 재생 상태를 포함하지 않는다.

```ts
// request
{ inviteCode: string }

// 신규 참여: 201, 기존 참여 이력 복원: 200
{ success: true, data: { room: { id, name, status: 'active', inviteCode, hostId } } }
```

성공 뒤 클라이언트는 Socket `room:join`을 호출해 `room:joined` snapshot을 받는다.

| 코드                 | HTTP | 설명                                  |
| -------------------- | ---- | ------------------------------------- |
| `ROOM_NOT_FOUND`     | 404  | 초대 코드에 해당하는 Room 없음        |
| `ROOM_CLOSED`        | 403  | closed Room                           |
| `ROOM_INACTIVE`      | 403  | inactive Room                         |
| `ROOM_MEMBER_KICKED` | 403  | Host가 추방을 해제하기 전 재입장 불가 |

### 5.5 `GET /rooms/:roomId`

active Room의 기본 영속 정보를 반환한다. Room 참여 이력이 있는 사용자만 조회할 수 있고, `kicked` 사용자는 거부한다.

```ts
{ success: true, data: { id, name, status, inviteCode, hostId, createdAt } }
```

### 5.6 `PATCH /rooms/:roomId`

Host가 Room의 이름 또는 상태를 변경한다. 이름은 active Room에서만 수정할 수 있다. 상태 변경은 허용된 수명 주기 전이만 지원하며, `name`과 `status`는 한 요청에서 함께 변경할 수 없다.

```ts
// 이름 변경 요청
{ name: string }

// active Room 명시적 종료 요청
{ status: 'closed' }

// closed Room 복구 요청
{ status: 'active' }

// 200
{ success: true, data: { id, name, status, closedAt, updatedAt } }
```

`status: 'closed'`는 active Room만 closed로 전환한다. `closedAt`을 기록하고, 재생 세션을 종료하며 모든 Socket Room 연결을 해제한다. 참여 이력과 채팅은 유지한다.

`status: 'active'`는 closed Room만 복구한다. 30일 만료 여부를 먼저 보정하고, 복구 가능하면 Playlist를 삭제한 뒤 인메모리 재생 세션을 제거한다. 참여 이력·채팅·추방 상태는 유지한다.

Host의 Socket 연결 해제는 이 API를 호출하지 않는다. 1분 재연결 유예 뒤 서버가 `status: 'closed'`와 같은 종료 처리를 수행한다.

### 5.7 `DELETE /rooms/:roomId`

Host가 closed Room을 논리 삭제한다. 실제 DB 행은 보존하되 status를 inactive로 전환한다. active Room의 직접 삭제와 inactive Room 복구는 허용하지 않는다.

성공 시 `204 No Content`를 반환한다.

### 5.8 Room 수명 주기 오류

| 코드                    | HTTP | 설명                                                  |
| ----------------------- | ---- | ----------------------------------------------------- |
| `ROOM_NOT_FOUND`        | 404  | Room 없음                                             |
| `ROOM_NOT_ACTIVE`       | 409  | active 상태가 필요한 작업에 closed·inactive Room 요청 |
| `ROOM_NOT_CLOSED`       | 409  | 복구·삭제 대상이 closed가 아님                        |
| `ROOM_CLOSED`           | 403  | closed Room 입장·변경 요청                            |
| `ROOM_INACTIVE`         | 403  | inactive Room 입장·변경 요청                          |
| `ROOM_RECOVERY_EXPIRED` | 409  | 30일 경과로 inactive 처리되어 복구 불가               |
| `AUTH_FORBIDDEN`        | 403  | Host 전용 작업을 Member가 요청                        |

### 5.9 Member 추방 관리

#### `GET /rooms/:roomId/members`

Host만 Room Member 목록을 조회한다. `status` 쿼리가 없으면 현재 활성 로스터(`online`/`offline`)를, `status=kicked`면 추방 목록을 반환한다.

```ts
// GET /rooms/:roomId/members
{
  success: true,
  data: { members: [{ id, userId, nickname, profileImage, role, status: 'online' | 'offline' }] }
}
```

```ts
// GET /rooms/:roomId/members?status=kicked
{
  success: true,
  data: { members: [{ id, userId, nickname, profileImage, kickedAt: string }] }
}
```

`kickedAt`은 `room_members.updated_at`을 응답 필드로 직렬화한 값이다.

#### `PATCH /rooms/:roomId/members/:memberId`

Host가 Room Member의 상태를 변경한다.

```ts
// active Room Member 추방
{ status: 'kicked' }

// 추방 해제
{ status: 'left' }

// 200
{ success: true, data: { memberId: string, status: 'kicked' | 'left' } }
```

`status: 'kicked'`는 active Room에서만 가능하며 Host 자신은 추방할 수 없다. 대상의 모든 Socket Room 연결을 해제한다. `status: 'left'`는 kicked Member만 대상으로 하며, 자동 재입장시키지 않는다.

Room 상태 오류(`ROOM_CLOSED`/`ROOM_INACTIVE`)는 [5.8 Room 수명 주기 오류](#58-room-수명-주기-오류)를 따른다.

| 코드                     | HTTP | 설명                                       |
| ------------------------ | ---- | ------------------------------------------ |
| `ROOM_MEMBER_NOT_FOUND`  | 404  | 해당 Room의 Member 없음                    |
| `ROOM_MEMBER_NOT_KICKED` | 409  | `status: 'left'` 변경 대상이 kicked가 아님 |
| `ROOM_CANNOT_KICK_HOST`  | 409  | Host 자신 추방 시도                        |

---

## 6. Room Playlist와 채팅 API

모든 Room Playlist·채팅 변경 API는 active Room의 `kicked`가 아닌 참여자만 사용할 수 있다. Room 상태·권한 오류는 5.8절을 따른다.

### 6.1 `GET /rooms/:roomId/playlist`

Room Playlist를 `position` 오름차순으로 반환한다.

```ts
{ success: true, data: { playlist: [PlaylistItem] } }
```

### 6.2 `POST /rooms/:roomId/playlist`

`videoId` 또는 `youtubeUrl` **정확히 하나**를 받아 YouTube `videos.list` 검증 후 Room Playlist 끝에 추가한다. 같은 `videoId`는 available·unavailable 여부와 관계없이 중복 추가할 수 없다.

```ts
// request
{ videoId?: string, youtubeUrl?: string }

// 201
{ success: true, data: PlaylistItem }
```

성공 뒤 `playlist:updated`를 broadcast한다.

두 필드가 모두 없거나 모두 있으면 `VALIDATION_ERROR`(400)를 반환한다.

| 코드                         | HTTP | 설명                       |
| ---------------------------- | ---- | -------------------------- |
| `PLAYLIST_INVALID_URL`       | 400  | videoId 파싱 불가 URL      |
| `PLAYLIST_VIDEO_UNAVAILABLE` | 400  | 재생·임베드 불가 영상      |
| `PLAYLIST_NOT_MUSIC`         | 400  | Music 카테고리가 아닌 영상 |
| `PLAYLIST_DUPLICATE_VIDEO`   | 409  | 동일 영상이 이미 있음      |
| `SERVER_YOUTUBE_API_ERROR`   | 502  | YouTube API 실패           |

### 6.3 `DELETE /rooms/:roomId/playlist/:itemId`

Host는 모든 곡을, Member는 자신이 추가한 곡만 삭제한다. 현재 곡을 삭제하면 서버의 인메모리 반복·셔플 정책으로 다음 상태를 결정하고, `playback:change-track` 또는 `playback:pause`를 전파한다. 성공 뒤 `playlist:updated`를 전파한다.

성공 시 `204 No Content`를 반환한다.

### 6.4 `PATCH /rooms/:roomId/playlist`

Host만 전체 순서 배열을 받아 DB 트랜잭션으로 position을 갱신한다. 진행 중인 셔플 큐는 다시 만들지 않는다.

```ts
{
  items: [{ id: string, position: number }];
}
```

`items`는 현재 Room Playlist의 모든 항목 id를 정확히 한 번씩 포함해야 하며, id 집합이 일치하지 않으면 `PLAYLIST_ITEM_NOT_FOUND`(404)를 반환한다. `position`은 `1`부터 항목 수까지 중복 없이 연속이어야 하며, 위반 시 `VALIDATION_ERROR`(400)를 반환한다.

성공 시 `204 No Content`를 반환하고, 서버는 `playlist:updated`로 갱신된 전체 Playlist를 Room에 전파한다.

### 6.5 `POST /rooms/:roomId/playlist-imports`

active Room의 Host가 **자신의** 개인 Playlist를 Room Playlist 끝에 일회성 복사한다.

```ts
// request
{ personalPlaylistId: string }

// 200
{
  success: true,
  data: { addedCount: number, duplicateCount: number, unavailableCount: number }
}
```

- Room에 이미 있는 곡과 재생·임베드 불가 곡은 건너뛴다.
- 동시 요청으로 같은 곡이 추가되며 unique 충돌이 나면 가져오기를 재시도하고, 재조회된 곡은 `duplicateCount`에 포함한다. 재시도 한도를 넘으면 `PLAYLIST_DUPLICATE_VIDEO`(409)를 반환한다.
- 완료 후 `playlist:updated`를 한 번만 broadcast한다.
- 셔플이 켜져 있으면 서버는 추가된 곡을 남은 인메모리 큐의 무작위 위치에 넣는다.
- `personalPlaylistId`가 없으면 `PERSONAL_PLAYLIST_NOT_FOUND`(404), 요청자가 소유하지 않으면 `PERSONAL_PLAYLIST_ACCESS_DENIED`(403)를 반환한다.

### 6.6 `GET /rooms/:roomId/chats`

과거 채팅을 `(createdAt, id)` 복합 커서로 조회한다.

| Query      | 타입   | 필수 | 설명                |
| ---------- | ------ | ---- | ------------------- |
| cursorTime | string | Yes  | 기준 시각(ISO 8601) |
| cursorId   | string | Yes  | 기준 메시지 ID      |
| limit      | number | No   | 기본 50             |

```ts
{ success: true, data: { chats: [ChatMessage], hasMore: boolean } }
```

Unicode 이모지는 기존 `message` TEXT에 포함되며 별도 REST API가 필요하지 않다.

---

## 7. 개인 Playlist API

모든 개인 Playlist API는 소유자만 접근할 수 있다. 존재하지 않으면 `PERSONAL_PLAYLIST_NOT_FOUND`(404), 다른 사용자의 Playlist면 `PERSONAL_PLAYLIST_ACCESS_DENIED`(403)를 반환한다.

### 7.1 Playlist 관리

| Endpoint                                 | 요청       | 성공 응답                                                    | 설명                         |
| ---------------------------------------- | ---------- | ------------------------------------------------------------ | ---------------------------- |
| `GET /personal-playlists`                | -          | `{ success: true, data: { playlists: [PersonalPlaylist] } }` | 내 목록                      |
| `POST /personal-playlists`               | `{ name }` | `201 { success: true, data: { id, name, createdAt } }`       | 생성                         |
| `GET /personal-playlists/:playlistId`    | -          | `{ success: true, data: { playlist, items } }`               | 상세·곡 목록                 |
| `PATCH /personal-playlists/:playlistId`  | `{ name }` | `{ success: true, data: { id, name, updatedAt } }`           | 이름 변경                    |
| `DELETE /personal-playlists/:playlistId` | -          | `204 No Content`                                             | 항목까지 cascade hard delete |

### 7.2 곡 관리

| Endpoint                                               | 요청                                        | 성공 응답                                                    | 설명                      |
| ------------------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------ | ------------------------- |
| `POST /personal-playlists/:playlistId/items`           | `{ videoId?: string, youtubeUrl?: string }` | `201 { success: true, data: PersonalPlaylistItem }`          | YouTube 검증 후 끝에 추가 |
| `DELETE /personal-playlists/:playlistId/items/:itemId` | -                                           | `204 No Content`                                             | 항목 삭제                 |
| `PATCH /personal-playlists/:playlistId/items`          | `{ items: [{ id, position }] }`             | `{ success: true, data: { items: [PersonalPlaylistItem] } }` | 전체 순서 변경            |

개인 Playlist 곡 추가도 `videoId`와 `youtubeUrl` 중 정확히 하나를 요구하며, 둘 다 없거나 모두 있으면 `VALIDATION_ERROR`(400)를 반환한다. 순서 변경의 `items`는 대상 Playlist의 모든 항목 id를 정확히 한 번씩 포함해야 하며, id 집합이 일치하지 않으면 `PERSONAL_PLAYLIST_ITEM_NOT_FOUND`(404)를 반환한다. `position`은 `1`부터 항목 수까지 연속이어야 하며, 위반 시 `VALIDATION_ERROR`(400)를 반환한다. 동일 `videoId` 중복은 `PERSONAL_PLAYLIST_DUPLICATE_VIDEO`(409)로 거부한다. 추가 시 영상 재생·임베드 검증에 실패하면 `PLAYLIST_VIDEO_UNAVAILABLE`(400), Music 카테고리가 아니면 `PLAYLIST_NOT_MUSIC`(400)을 반환한다. Playlist는 존재하지만 대상 곡이 없으면 `PERSONAL_PLAYLIST_ITEM_NOT_FOUND`(404)를 반환한다.

| 코드                                | HTTP | 설명                       |
| ----------------------------------- | ---- | -------------------------- |
| `PLAYLIST_INVALID_URL`              | 400  | videoId 파싱 불가 URL      |
| `PLAYLIST_VIDEO_UNAVAILABLE`        | 400  | 재생·임베드 불가 영상      |
| `PLAYLIST_NOT_MUSIC`                | 400  | Music 카테고리가 아닌 영상 |
| `PERSONAL_PLAYLIST_DUPLICATE_VIDEO` | 409  | 동일 영상이 이미 있음      |
| `PERSONAL_PLAYLIST_ITEM_NOT_FOUND`  | 404  | 대상 곡이 없음             |

---

## 8. `GET /search`

YouTube Music 영상 검색이다. 서버는 `search.list`와 `videos.list`로 Music 카테고리를 검증하고 상위 10개를 반환한다. 동일 검색어는 5분간 캐시한다.

```ts
// query: ?q=...
{ success: true, data: { items: [{ videoId, title, channelTitle, thumbnailUrl, duration }] } }
```

`SEARCH_QUERY_REQUIRED`(400), `SERVER_YOUTUBE_API_ERROR`(502), `SERVER_YOUTUBE_QUOTA_EXCEEDED`(429)를 사용한다.

---

## 9. 내부 운영 API

### `POST /internal/rooms/inactivate-stale`

GitHub Actions가 하루 한 번 호출한다. Swagger와 일반 FE 클라이언트에는 노출하지 않는다.

```http
Authorization: Bearer <CRON_SECRET>
```

closed 상태이고 `closedAt`이 30일 이상 지난 Room을 inactive로 바꾼다. 여러 번 호출해도 이미 inactive인 Room을 다시 변경하지 않는 멱등 작업이다.

```ts
// 200
{ success: true, data: { inactivatedCount: number } }
```

유효한 Bearer Token이 없으면 `AUTH_FORBIDDEN`(403)을 반환한다.
