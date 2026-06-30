# 05. API Spec

## 1. 문서 정보

| 항목      | 내용                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------- |
| 문서명    | Syfity API Spec                                                                                 |
| 버전      | v1.0                                                                                            |
| 상태      | 초안                                                                                            |
| 작성 목적 | Syfity MVP REST API 명세 정의                                                                   |
| 기반 문서 | `01-prd.md`, `02-system-architecture.md`, `03-realtime-sync-design.md`, `04-database-design.md` |

---

## 2. 공통 규칙

### 2.1 Base URL

```
로컬:                 http://localhost:4000/api/v1
운영 (Render):        https://{render-service}.onrender.com/api/v1
운영 (커스텀 도메인):  https://api.{domain}/api/v1  ← 커스텀 도메인 확정 후 적용
```

### 2.2 인증

JWT 기반 인증. Access Token은 httpOnly 쿠키로 전달된다.

| 항목                   | 값                                            |
| ---------------------- | --------------------------------------------- |
| Access Token 만료      | 1시간                                         |
| Refresh Token 만료     | 30일                                          |
| Refresh Token 저장     | DB (`users.refresh_token`)                    |
| Refresh Token Rotation | 적용 (갱신 시 새 토큰 발급, 이전 토큰 무효화) |

**쿠키 설정**

```ts
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
}
```

**인증이 필요 없는 엔드포인트**

- `GET /health`
- `GET /api-docs`, `GET /api-docs/*` → Swagger UI 및 내부 리소스
- `GET /auth/google`
- `GET /auth/google/callback`
- `POST /auth/refresh`

나머지 모든 엔드포인트는 인증이 필요하다.

### 2.3 응답 형식

**성공**

```ts
{
  success: true,
  data: { ... }
}
```

**실패**

```ts
{
  success: false,
  error: {
    code: string,    // 에러 코드 (FE 분기 처리용)
    message: string  // 사람이 읽을 수 있는 메시지
  }
}
```

### 2.4 에러 코드 체계

도메인별 prefix로 구분한다.

| Prefix      | 도메인                                           |
| ----------- | ------------------------------------------------ |
| `AUTH_`     | 인증/인가                                        |
| `ROOM_`     | Room                                             |
| `PLAYLIST_` | Playlist (URL 파싱, 영상 재생 불가 포함)         |
| `SERVER_`   | 서버 내부 오류 및 외부 API 오류 (YouTube API 등) |

### 2.5 공통 에러 코드

| 코드                    | HTTP | 설명                                                             |
| ----------------------- | ---- | ---------------------------------------------------------------- |
| `AUTH_UNAUTHORIZED`     | 401  | Access Token 없음 또는 유효하지 않음 → FE가 `/auth/refresh` 시도 |
| `AUTH_TOKEN_EXPIRED`    | 401  | Access Token 만료 → FE가 `/auth/refresh` 시도                    |
| `AUTH_REFRESH_EXPIRED`  | 401  | Refresh Token 만료 → 자동 로그아웃 후 Landing으로 이동           |
| `AUTH_FORBIDDEN`        | 403  | 권한 없음                                                        |
| `SERVER_INTERNAL_ERROR` | 500  | 서버 내부 오류                                                   |

---

## 3. 엔드포인트 목록

```
GET    /health
GET    /api-docs       → Swagger UI (인증 불필요, 구현 단계에서 swagger.yaml과 함께 연동)

GET    /auth/google
GET    /auth/google/callback
POST   /auth/refresh
POST   /auth/logout

GET    /me

GET    /rooms/recent
POST   /rooms
POST   /rooms/join
GET    /rooms/:roomId
PATCH  /rooms/:roomId
POST   /rooms/:roomId/close

GET    /rooms/:roomId/playlist
POST   /rooms/:roomId/playlist
DELETE /rooms/:roomId/playlist/:itemId
PATCH  /rooms/:roomId/playlist/reorder

GET    /rooms/:roomId/chats

GET    /search
```

---

## 4. 상세 명세

### 4.1 Health

#### `GET /health`

서버 상태 확인. 인증 불필요.

**응답 200**

```ts
{
  success: true,
  data: { status: 'ok' }
}
```

---

### 4.2 Auth

#### `GET /auth/google`

Google OAuth 로그인 시작. 브라우저를 Google 인증 페이지로 리다이렉트한다.

초대 링크로 접근했다가 로그인이 필요한 경우 `returnUrl`을 OAuth state에 담아 전달한다.

**Query**

| 파라미터  | 타입   | 필수 | 설명                       |
| --------- | ------ | ---- | -------------------------- |
| returnUrl | string | No   | 로그인 후 리다이렉트할 URL |

---

#### `GET /auth/google/callback`

Google OAuth 콜백. 인증 성공 시 JWT를 쿠키로 발급하고 FE로 리다이렉트한다.

**성공 시 흐름**

```
Access Token + Refresh Token 쿠키 발급
→ returnUrl이 있으면 해당 URL로 리다이렉트
→ returnUrl이 없으면 Home으로 리다이렉트
```

**실패 시 흐름**

```
Landing 페이지로 리다이렉트 (에러 메시지 쿼리 파라미터 포함)
```

---

#### `POST /auth/refresh`

Access Token 갱신. Refresh Token Rotation 적용으로 새 Refresh Token도 함께 발급한다.

**응답 200**

```ts
{
  success: true,
  data: { message: 'token refreshed' }
}
```

새 Access Token, 새 Refresh Token이 쿠키로 설정된다.

**에러**

| 코드                   | HTTP | 설명                         |
| ---------------------- | ---- | ---------------------------- |
| `AUTH_REFRESH_EXPIRED` | 401  | Refresh Token 만료 또는 없음 |

---

#### `POST /auth/logout`

로그아웃. 쿠키를 삭제하고 DB의 `refresh_token`을 NULL로 초기화한다.

**응답 200**

```ts
{
  success: true,
  data: { message: 'logged out' }
}
```

---

### 4.3 Me

#### `GET /me`

현재 로그인한 사용자 정보 조회. 앱 초기 로딩 시 호출한다.

**응답 200**

```ts
{
  success: true,
  data: {
    id: string,
    email: string,
    nickname: string,
    profileImage: string | null
  }
}
```

**에러**

| 코드                | HTTP | 설명     |
| ------------------- | ---- | -------- |
| `AUTH_UNAUTHORIZED` | 401  | 미로그인 |

---

### 4.4 Room

#### `GET /rooms/recent`

현재 사용자가 참여한 `active` 상태 Room 목록을 `lastJoinedAt` 내림차순으로 반환한다.

**응답 200**

```ts
{
  success: true,
  data: {
    rooms: [
      {
        id: string,
        name: string,
        inviteCode: string,
        lastJoinedAt: string  // ISO 8601
      }
    ]
  }
}
```

---

#### `POST /rooms`

새 Room 생성. 생성자는 Host가 된다. Room 생성 시 `playback_states` 레코드도 함께 생성한다.

초대 코드는 Hex 6자리로 생성하며 최대 3회 재시도한다. 3회 모두 실패 시 `SERVER_INVITE_CODE_GENERATION_FAILED` 에러를 반환하고 로그를 기록한다.

**Request Body**

```ts
{
  name: string; // Room 이름
}
```

**응답 201**

```ts
{
  success: true,
  data: {
    id: string,
    name: string,
    inviteCode: string,
    status: 'active',
    createdAt: string
  }
}
```

**에러**

| 코드                                   | HTTP | 설명                    |
| -------------------------------------- | ---- | ----------------------- |
| `SERVER_INVITE_CODE_GENERATION_FAILED` | 500  | 초대 코드 생성 3회 실패 |

---

#### `POST /rooms/join`

초대 코드 또는 roomId로 Room에 입장한다.

- `inviteCode` → Room 조회 후 입장
- `roomId` → `room_members` 기존 참여자 확인 후 재입장

입장 성공 시 Room 초기 데이터를 함께 반환한다.

**Request Body**

```ts
{
  inviteCode?: string,
  roomId?: string
}
```

`inviteCode`와 `roomId` 중 하나는 반드시 있어야 한다.

**응답 200**

```ts
{
  success: true,
  data: {
    room: {
      id: string,
      name: string,
      status: RoomStatus,
      inviteCode: string,
      hostId: string
    },
    playbackState: {
      videoId: string | null,
      playlistItemId: string | null,
      currentTime: number,      // 서버 역산값
      isPlaying: boolean,
      updatedAt: string
    },
    playlist: [
      {
        id: string,
        videoId: string,
        title: string,
        channelTitle: string,
        thumbnailUrl: string,
        duration: number,        // 초 단위
        position: number,
        addedBy: string,
        status: PlaylistItemStatus
      }
    ],
    members: [
      {
        id: string,
        userId: string,
        nickname: string,
        profileImage: string | null,
        role: RoomRole,
        status: RoomMemberStatus
      }
    ],
    recentChats: [
      {
        id: string,
        userId: string | null,
        nickname: string | null,
        type: ChatMessageType,
        message: string,
        createdAt: string
      }
    ]
  }
}
```

**에러**

| 코드                 | HTTP | 설명                                   |
| -------------------- | ---- | -------------------------------------- |
| `ROOM_NOT_FOUND`     | 404  | Room 없음 또는 유효하지 않은 초대 코드 |
| `ROOM_INACTIVE`      | 403  | inactive 상태 Room                     |
| `ROOM_CLOSED`        | 403  | closed 상태 Room                       |
| `ROOM_ACCESS_DENIED` | 403  | roomId로 재입장 시 기존 참여자가 아님  |

---

#### `GET /rooms/:roomId`

Room 정보 조회.

**응답 200**

```ts
{
  success: true,
  data: {
    id: string,
    name: string,
    status: RoomStatus,
    inviteCode: string,
    hostId: string,
    createdAt: string
  }
}
```

**에러**

| 코드             | HTTP | 설명      |
| ---------------- | ---- | --------- |
| `ROOM_NOT_FOUND` | 404  | Room 없음 |

---

#### `PATCH /rooms/:roomId`

Room 정보 수정. Host만 가능하다.

**Request Body**

```ts
{
  name: string;
}
```

**응답 200**

```ts
{
  success: true,
  data: {
    id: string,
    name: string,
    updatedAt: string
  }
}
```

**에러**

| 코드             | HTTP | 설명        |
| ---------------- | ---- | ----------- |
| `ROOM_NOT_FOUND` | 404  | Room 없음   |
| `AUTH_FORBIDDEN` | 403  | Host가 아님 |

---

#### `POST /rooms/:roomId/close`

Room 종료. Host만 가능하다. Room status를 `closed`로 변경하고 모든 Member를 퇴장 처리한다. Socket `room:closed` 이벤트를 broadcast한다.

Host가 Socket `room:leave` 이벤트를 전송하는 경우에도 서버 내부에서 동일한 로직이 실행된다. `room:closed` reason은 `host-closed` (방 종료 버튼) 또는 `host-left` (나가기 버튼)로 구분된다.

**응답 200**

```ts
{
  success: true,
  data: { message: 'room closed' }
}
```

**에러**

| 코드                  | HTTP | 설명             |
| --------------------- | ---- | ---------------- |
| `ROOM_NOT_FOUND`      | 404  | Room 없음        |
| `AUTH_FORBIDDEN`      | 403  | Host가 아님      |
| `ROOM_ALREADY_CLOSED` | 400  | 이미 closed 상태 |

---

### 4.5 Playlist

#### `GET /rooms/:roomId/playlist`

Room의 플레이리스트 조회. `position` 오름차순으로 반환한다.

**응답 200**

```ts
{
  success: true,
  data: {
    playlist: [
      {
        id: string,
        videoId: string,
        title: string,
        channelTitle: string,
        thumbnailUrl: string,
        duration: number,
        position: number,
        addedBy: string,
        status: PlaylistItemStatus
      }
    ]
  }
}
```

---

#### `POST /rooms/:roomId/playlist`

곡 추가. `videoId` 또는 `youtubeUrl` 중 하나를 전달한다.

- `videoId` → YouTube `videos.list` 호출 (1유닛) → 영상 정보 조회 후 추가
- `youtubeUrl` → videoId 파싱 → YouTube `videos.list` 호출 (1유닛) → 영상 정보 조회 후 추가

추가 성공 시 Socket `playlist:updated` 이벤트를 broadcast한다.

MVP에서 중복 추가를 허용한다.

**Request Body**

```ts
{
  videoId?: string,
  youtubeUrl?: string
}
```

**응답 201**

```ts
{
  success: true,
  data: {
    id: string,
    videoId: string,
    title: string,
    channelTitle: string,
    thumbnailUrl: string,
    duration: number,
    position: number,
    addedBy: string,
    status: 'available'
  }
}
```

**에러**

| 코드                         | HTTP | 설명                  |
| ---------------------------- | ---- | --------------------- |
| `ROOM_NOT_FOUND`             | 404  | Room 없음             |
| `PLAYLIST_INVALID_URL`       | 400  | videoId 파싱 불가 URL |
| `PLAYLIST_VIDEO_UNAVAILABLE` | 400  | 재생 불가 영상        |
| `SERVER_YOUTUBE_API_ERROR`   | 502  | YouTube API 호출 실패 |

---

#### `DELETE /rooms/:roomId/playlist/:itemId`

곡 삭제.

- Host → 모든 곡 삭제 가능
- Member → 본인이 추가한 곡만 삭제 가능

현재 재생 중인 곡이 삭제된 경우:

- 다음 곡이 있으면 → `playback:change-track` broadcast
- 다음 곡이 없으면 → `playback:pause` broadcast, PlaybackState 초기화

삭제 성공 시 Socket `playlist:updated` 이벤트를 broadcast한다.

**응답 200**

```ts
{
  success: true,
  data: { message: 'playlist item deleted' }
}
```

**에러**

| 코드                      | HTTP | 설명                              |
| ------------------------- | ---- | --------------------------------- |
| `ROOM_NOT_FOUND`          | 404  | Room 없음                         |
| `PLAYLIST_ITEM_NOT_FOUND` | 404  | 항목 없음                         |
| `AUTH_FORBIDDEN`          | 403  | 다른 사용자가 추가한 곡 삭제 시도 |

---

#### `PATCH /rooms/:roomId/playlist/reorder`

플레이리스트 순서 변경. Host만 가능하다. 전체 순서 배열을 받아 트랜잭션으로 일괄 업데이트한다.

변경 성공 시 Socket `playlist:updated` 이벤트를 broadcast한다.

**Request Body**

```ts
{
  items: [{ id: string, position: number }];
}
```

**응답 200**

```ts
{
  success: true,
  data: { message: 'playlist reordered' }
}
```

**에러**

| 코드                      | HTTP | 설명           |
| ------------------------- | ---- | -------------- |
| `ROOM_NOT_FOUND`          | 404  | Room 없음      |
| `AUTH_FORBIDDEN`          | 403  | Host가 아님    |
| `PLAYLIST_ITEM_NOT_FOUND` | 404  | 항목 ID 불일치 |

---

### 4.6 Chat

#### `GET /rooms/:roomId/chats`

채팅 메시지 추가 로드. 커서 기반 페이지네이션.

최초 입장 시 채팅은 `POST /rooms/join` 응답에 포함된다. 이 엔드포인트는 위로 스크롤 시 이전 메시지 로드에 사용한다.

**Query**

| 파라미터   | 타입   | 필수 | 설명                      |
| ---------- | ------ | ---- | ------------------------- |
| cursorTime | string | Yes  | 커서 기준 시각 (ISO 8601) |
| cursorId   | string | Yes  | 커서 기준 메시지 ID       |
| limit      | number | No   | 로드 개수 (기본값: 50)    |

**응답 200**

```ts
{
  success: true,
  data: {
    chats: [
      {
        id: string,
        userId: string | null,
        nickname: string | null,
        type: ChatMessageType,
        message: string,
        createdAt: string
      }
    ],
    hasMore: boolean  // 더 이전 메시지 존재 여부
  }
}
```

**에러**

| 코드             | HTTP | 설명      |
| ---------------- | ---- | --------- |
| `ROOM_NOT_FOUND` | 404  | Room 없음 |

---

### 4.7 Search

#### `GET /search`

YouTube 영상 검색. 서버에서 YouTube Data API `search.list`를 호출한다 (100유닛/회). 동일 검색어는 5분간 캐싱한다. 결과는 10개 고정으로 반환한다.

**Query**

| 파라미터 | 타입   | 필수 | 설명   |
| -------- | ------ | ---- | ------ |
| q        | string | Yes  | 검색어 |

**응답 200**

```ts
{
  success: true,
  data: {
    items: [
      {
        videoId: string,
        title: string,
        channelTitle: string,
        thumbnailUrl: string,
        duration: number  // 초 단위
      }
    ]
  }
}
```

**에러**

| 코드                            | HTTP | 설명                       |
| ------------------------------- | ---- | -------------------------- |
| `SERVER_YOUTUBE_API_ERROR`      | 502  | YouTube API 호출 실패      |
| `SERVER_YOUTUBE_QUOTA_EXCEEDED` | 429  | YouTube API 일일 쿼터 초과 |
