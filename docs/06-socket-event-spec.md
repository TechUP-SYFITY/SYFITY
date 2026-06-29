# 06. Socket Event Spec

## 1. 문서 정보

| 항목      | 내용                                                                                 |
| --------- | ------------------------------------------------------------------------------------ |
| 문서명    | Syfity Socket Event Spec                                                             |
| 버전      | v1.0                                                                                 |
| 상태      | 초안                                                                                 |
| 작성 목적 | Syfity MVP Socket.IO 이벤트 명세 정의                                                |
| 기반 문서 | `01-prd.md`, `03-realtime-sync-design.md`, `04-database-design.md`, `05-api-spec.md` |

---

## 2. 공통 규칙

### 2.1 연결

- Socket은 Room 입장 시 연결하고 퇴장 시 해제한다.
- 연결 전 반드시 `POST /api/v1/rooms/join` (REST)를 먼저 호출하여 입장 자격을 검증한다.
- Socket 인증은 httpOnly 쿠키의 JWT를 핸드셰이크 시 자동으로 전송하여 처리한다.

### 2.2 네임스페이스

기본 네임스페이스(`/`)를 사용한다. 이벤트 prefix(`room:`, `playback:`, `playlist:`, `chat:`, `presence:`)로 도메인을 구분한다.

### 2.3 Socket Room 식별자

Socket.IO Room 참여 시 `room:${roomId}` prefix를 사용하여 내부 ID 충돌을 방지한다.

```ts
io.to(`room:${roomId}`).emit(event, payload);
```

### 2.4 이벤트 방향 표기

| 표기 | 설명                          |
| ---- | ----------------------------- |
| C→S  | 클라이언트가 서버로 전송      |
| S→C  | 서버가 클라이언트로 broadcast |

### 2.5 Acknowledgement

성공/실패 응답이 필요한 C→S 이벤트에만 ack를 적용한다.

```ts
// ack 적용 이벤트
room:join, playback:play, playback:pause, playback:seek,
playback:change-track, playback:error, chat:send

// ack 미적용 이벤트 (broadcast 전용)
room:leave 및 모든 S→C 이벤트
```

**ack 성공 응답**

```ts
{ success: true, data?: { ... } }
```

**ack 에러 응답**

```ts
{ success: false, error: { code: string, message: string } }
```

### 2.6 에러 처리 방식

| 상황                                                       | 처리 방식               |
| ---------------------------------------------------------- | ----------------------- |
| 클라이언트 요청 에러 (권한 없음, 유효하지 않은 데이터 등)  | ack로 에러 반환         |
| 서버 발생 에러 (Host 연결 해제, Room closed, 재생 실패 등) | 별도 이벤트로 broadcast |

### 2.7 재연결 처리

- Socket.IO 재연결 시 기존 Socket Room 참여가 초기화된다.
- 재연결 후 클라이언트는 `room:join`을 다시 전송하여 Socket Room에 재참여한다.
- 재연결 후 5초 유예 시간 동안은 disconnect 상태로 처리하지 않는다.

### 2.8 연결 해제 유예 시간

```
일반 Member disconnect
→ 5초 대기
→ 재연결 시  → presence:update (online) broadcast
→ 5초 후 미복귀 → presence:update (offline) broadcast

Host disconnect
→ 1분 대기
→ 재연결 시  → room:host-reconnected broadcast
→ 1분 후 미복귀 → Room status closed, room:closed broadcast
```

유예 시간 동안 Socket Room에 남아있으므로 재연결 시 자연스럽게 복구된다.

---

## 3. 이벤트 목록

### C→S (클라이언트 → 서버)

| 이벤트                  | ack | 설명                                      |
| ----------------------- | --- | ----------------------------------------- |
| `room:join`             | O   | Room 입장 요청                            |
| `room:leave`            | X   | 명시적 퇴장 (나가기 버튼 클릭 시)         |
| `playback:play`         | O   | 재생 요청 (Host만)                        |
| `playback:pause`        | O   | 일시정지 요청 (Host만)                    |
| `playback:seek`         | O   | Seek 요청 (Host만)                        |
| `playback:change-track` | O   | 곡 변경 요청 (Host만, next/previous 포함) |
| `playback:error`        | O   | 재생 실패 감지 (Host만)                   |
| `playback:sync-request` | X   | sync 요청 (버퍼링 종료 시)                |
| `chat:send`             | O   | 채팅 메시지 전송                          |

Playlist 변경(추가/삭제/순서 변경)은 REST API로 처리한다. C→S Socket 이벤트 없음.

### S→C (서버 → 클라이언트)

| 이벤트                   | 설명                                        |
| ------------------------ | ------------------------------------------- |
| `room:host-disconnected` | Host 연결 해제 알림                         |
| `room:host-reconnected`  | Host 재연결 알림                            |
| `room:closed`            | Room 종료 알림                              |
| `playback:play`          | 재생 broadcast                              |
| `playback:pause`         | 일시정지 broadcast                          |
| `playback:seek`          | Seek broadcast                              |
| `playback:change-track`  | 곡 변경 broadcast                           |
| `playback:tick`          | 10초 주기 sync broadcast (재생 중인 Room만) |
| `playback:sync-response` | 클라이언트 sync 요청 응답                   |
| `playback:error`         | 재생 실패 broadcast                         |
| `playlist:updated`       | Playlist 전체 broadcast                     |
| `chat:received`          | 채팅 메시지 broadcast                       |
| `chat:system`            | 시스템 메시지 broadcast                     |
| `presence:update`        | 참여자 상태 변경 broadcast                  |

---

## 4. 이벤트 상세

### 4.1 Room

#### `room:join` C→S

REST `POST /rooms/join` 완료 후 Socket Room에 참여한다. 재연결 시에도 재전송한다.

**Payload**

```ts
{
  roomId: string;
}
```

**ack 성공**

```ts
{
  success: true,
  data: {
    playbackState: {
      currentTime: number,
      isPlaying: boolean,
      videoId: string | null,
      playlistItemId: string | null
    }
  }
}
```

**ack 에러**

| 코드                | 설명      |
| ------------------- | --------- |
| `ROOM_NOT_FOUND`    | Room 없음 |
| `AUTH_UNAUTHORIZED` | 인증 실패 |

---

#### `room:leave` C→S

나가기 버튼 클릭 시 전송. 탭 닫기/페이지 이동은 disconnect 5초 유예로 처리.

Host가 `room:leave`를 전송하면 서버 내부에서 `POST /rooms/:roomId/close` 로직을 실행한다. disconnect와 달리 1분 대기 없이 즉시 Room closed 처리된다.

Member가 `room:leave`를 전송하면 `presence:update (left)` broadcast 후 Socket Room에서 제거된다.

**Payload**

```ts
{
  roomId: string;
}
```

---

#### `room:host-disconnected` S→C

Host 연결 해제 시 broadcast. 1분 내 재접속 대기 상태임을 알린다.

**Payload**

```ts
{
  roomId: string,
  waitUntil: string  // 1분 후 시각 (ISO 8601)
}
```

---

#### `room:host-reconnected` S→C

Host 재연결 시 broadcast.

**Payload**

```ts
{
  roomId: string;
}
```

---

#### `room:closed` S→C

Room 종료 시 broadcast. 모든 참여자에게 전송 후 Socket Room을 해제한다.

**Payload**

```ts
{
  roomId: string,
  reason: 'host-left' | 'host-timeout' | 'host-closed'
}
```

**reason 정의**

| 값             | 설명                                                              |
| -------------- | ----------------------------------------------------------------- |
| `host-left`    | Host가 나가기 버튼으로 퇴장 (`room:leave`)                        |
| `host-timeout` | Host disconnect 후 1분 미복귀                                     |
| `host-closed`  | Host가 방 종료 버튼으로 명시적 종료 (`POST /rooms/:roomId/close`) |

---

### 4.2 Playback

#### `playback:play` C→S

Host가 재생 버튼 클릭 시 전송.

**Payload**

```ts
{
  roomId: string,
  currentTime: number  // 현재 재생 위치 (초)
}
```

**ack 성공**

```ts
{
  success: true;
}
```

**ack 에러**

| 코드             | 설명        |
| ---------------- | ----------- |
| `AUTH_FORBIDDEN` | Host가 아님 |

---

#### `playback:play` S→C

서버가 PlaybackState 갱신 후 전체 broadcast.

**Payload**

```ts
{
  currentTime: number,  // 서버 역산값
  isPlaying: true,
  videoId: string | null,
  playlistItemId: string | null
}
```

---

#### `playback:pause` C→S

Host가 일시정지 버튼 클릭 시 전송.

**Payload**

```ts
{
  roomId: string,
  currentTime: number
}
```

**ack 성공**

```ts
{
  success: true;
}
```

**ack 에러**

| 코드             | 설명        |
| ---------------- | ----------- |
| `AUTH_FORBIDDEN` | Host가 아님 |

---

#### `playback:pause` S→C

**Payload**

```ts
{
  currentTime: number,
  isPlaying: false,
  videoId: string | null,
  playlistItemId: string | null
}
```

---

#### `playback:seek` C→S

Host가 시크바 조작 시 전송. debounce 적용 여부는 YouTube IFrame Player API 확인 후 결정.

**Payload**

```ts
{
  roomId: string,
  seekTime: number  // seek 위치 (초)
}
```

**ack 성공**

```ts
{
  success: true;
}
```

**ack 에러**

| 코드             | 설명        |
| ---------------- | ----------- |
| `AUTH_FORBIDDEN` | Host가 아님 |

---

#### `playback:seek` S→C

**Payload**

```ts
{
  currentTime: number,
  isPlaying: boolean,
  videoId: string | null,
  playlistItemId: string | null
}
```

---

#### `playback:change-track` C→S

Host가 곡 변경 시 전송. next/previous는 FE에서 playlistItemId를 계산하여 전송.

**Payload**

```ts
{
  roomId: string,
  playlistItemId: string
}
```

**ack 성공**

```ts
{
  success: true;
}
```

**ack 에러**

| 코드                      | 설명        |
| ------------------------- | ----------- |
| `AUTH_FORBIDDEN`          | Host가 아님 |
| `PLAYLIST_ITEM_NOT_FOUND` | 항목 없음   |

---

#### `playback:change-track` S→C

**Payload**

```ts
{
  currentTime: 0,
  isPlaying: true,
  videoId: string,
  playlistItemId: string
}
```

---

#### `playback:tick` S→C

재생 중인 Room에서만 10초마다 서버가 broadcast. pause 상태에서는 전송하지 않는다.

**Payload**

```ts
{
  currentTime: number,  // 서버 역산값
  isPlaying: true,      // pause 상태에서는 전송하지 않으므로 항상 true
  videoId: string | null,
  playlistItemId: string | null
}
```

클라이언트는 수신 후 현재 Player 위치와 비교하여 오차 2초 이상이면 seek 보정한다.

---

#### `playback:sync-response` S→C

클라이언트가 sync를 명시적으로 요청했을 때 응답. 광고/버퍼링 후 재생 가능 상태가 됐을 때 사용.

**Payload**

```ts
{
  currentTime: number,
  isPlaying: boolean,
  videoId: string | null,
  playlistItemId: string | null
}
```

---

#### `playback:sync-request` C→S

버퍼링 종료 시 클라이언트가 현재 PlaybackState를 요청한다. ack 없이 서버가 `playback:sync-response`로 응답한다. 재연결 시에는 `room:join` ack에 PlaybackState가 포함되므로 별도 요청 불필요.

**감지 시점**

- YouTube Player `onStateChange`: 버퍼링(`3`) → 재생(`1`) 전환 시

**Payload**

```ts
{
  roomId: string;
}
```

---

#### `playback:error` C→S

Host 클라이언트에서 YouTube Player 재생 실패 감지 시 전송. Member의 재생 실패는 로컬에서만 처리.

**Payload**

```ts
{
  roomId: string,
  videoId: string,
  errorCode: number  // YouTube Player 에러 코드
}
```

**ack 성공**

```ts
{
  success: true;
}
```

---

#### `playback:error` S→C

**Payload**

```ts
{
  videoId: string,
  errorCode: number
}
```

---

### 4.3 Playlist

#### `playlist:updated` S→C

Playlist 변경(추가/삭제/순서 변경) 시 전체 목록을 broadcast. REST API 처리 완료 후 전송.

**Payload**

```ts
{
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
      status: PlaylistItemStatus,
    },
  ];
}
```

---

### 4.4 Chat

#### `chat:send` C→S

채팅 메시지 전송. 서버에서 DB 저장 후 `chat:received`로 broadcast.

**Payload**

```ts
{
  roomId: string,
  message: string
}
```

**ack 성공**

```ts
{
  success: true,
  data: {
    id: string,       // 저장된 메시지 ID (커서 기반 페이지네이션용)
    createdAt: string // ISO 8601
  }
}
```

FE는 optimistic update로 먼저 UI에 표시 후 ack 수신 시 실제 id/createdAt으로 교체한다.

**ack 에러**

| 코드             | 설명           |
| ---------------- | -------------- |
| `AUTH_FORBIDDEN` | 채팅 권한 없음 |

---

#### `chat:received` S→C

모든 참여자에게 새 메시지를 broadcast. 발신자 본인도 포함한다. FE는 ack 수신 시 optimistic 메시지를 `chat:received` 데이터로 교체한다. 서버에서 메시지 가공(욕설 필터링 등) 후 broadcast하므로 본인도 서버 처리 결과를 받아야 한다.

**Payload**

```ts
{
  id: string,
  userId: string,
  nickname: string,
  profileImage: string | null,
  type: 'user',
  message: string,
  createdAt: string
}
```

---

#### `chat:system` S→C

Room 상태 변화 시 서버에서 생성하여 broadcast. DB에 저장되므로 재입장 시 히스토리에 포함된다.

**Payload**

```ts
{
  id: string,
  type: 'system',
  message: string,  // 예: "홍길동님이 입장했습니다."
  createdAt: string
}
```

**시스템 메시지 발생 시점**

| 시점           | 메시지                                                       |
| -------------- | ------------------------------------------------------------ |
| 유저 입장      | `{nickname}님이 입장했습니다.`                               |
| 유저 퇴장      | `{nickname}님이 퇴장했습니다.`                               |
| 곡 추가        | `{nickname}님이 {title}을 추가했습니다.`                     |
| 곡 삭제        | `{nickname}님이 {title}을 삭제했습니다.`                     |
| Host 재생 시작 | `Host가 재생을 시작했습니다.`                                |
| Host 일시정지  | `Host가 일시정지했습니다.`                                   |
| Host 연결 해제 | `Host 연결이 끊겼습니다. 1분 내 재접속을 기다리는 중입니다.` |
| Room 종료      | `Room이 종료되었습니다.`                                     |

---

### 4.5 Presence

#### `presence:update` S→C

참여자 상태 변경 시 변경된 사용자 정보만 broadcast. 입장/퇴장 알림도 이 이벤트로 통합한다.

**Payload**

```ts
{
  userId: string,
  nickname: string,
  profileImage: string | null,
  role: RoomRole,
  status: 'online' | 'offline' | 'left'
}
```

**발생 시점**

| 시점                           | status    | 설명             |
| ------------------------------ | --------- | ---------------- |
| `room:join` Socket 이벤트 수신 | `online`  | 입장 알림 포함   |
| disconnect 후 5초 경과         | `offline` | 일시 연결 해제   |
| 재연결 + `room:join` 재전송    | `online`  | 복귀 알림 포함   |
| `room:leave` 수신              | `left`    | 퇴장 알림 포함   |
| `room:closed` 발생 시          | -         | broadcast 불필요 |
