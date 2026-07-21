# 06. Socket Event Spec

## 1. 문서 정보

| 항목      | 내용                                                                                 |
| --------- | ------------------------------------------------------------------------------------ |
| 문서명    | Syfity Socket Event Spec                                                             |
| 버전      | v2.1                                                                                 |
| 상태      | Member 로컬 재개 동기화 흐름을 반영한 재생·Room 이벤트 계약                          |
| 작성 목적 | Syfity Socket.IO 이벤트 계약 정의                                                    |
| 기반 문서 | `01-prd.md`, `03-realtime-sync-design.md`, `04-database-design.md`, `05-api-spec.md` |

---

## 2. 공통 규칙

### 2.1 연결과 입장

- Socket 인증은 httpOnly JWT 쿠키로 handshake 단계에서 수행한다. 실패는 `connect_error`로 전달한다.
- 초대 코드로 처음 입장할 때는 Room Socket 입장 전 `POST /api/v1/room-memberships`를 호출해 참여 이력을 만든다.
- Room 생성 직후 Host 입장, 최근 Room·내 Room 재입장, Socket 재연결은 기존 참여 이력을 사용해 `room:join`만 호출한다.
- `room:join`은 REST 호출 여부를 신뢰하지 않고 DB의 참여 이력·Room 상태·`kicked` 상태를 항상 다시 검증한다.
- Socket.IO 내부 Room 이름은 `room:${roomId}`를 사용한다.
- Socket 재연결 뒤에는 `room:join`을 다시 전송한다.
- `room:join`이 성공하면 서버는 해당 Socket에 `room:joined` snapshot을 먼저 전송하고, 전송 완료 뒤 성공 ack를 반환한다.

### 2.2 이벤트 표기와 ack

| 표기 | 설명                                    |
| ---- | --------------------------------------- |
| C→S  | 클라이언트에서 서버로 전송              |
| S→C  | 서버에서 대상 Socket 또는 Room으로 전송 |

성공·실패가 필요한 C→S 이벤트는 ack를 사용한다.

```ts
{ success: true, data?: { ... } }
{ success: false, error: { code: string, message: string } }
```

`room:leave`, `playback:sync-request`와 모든 S→C 이벤트에는 ack를 사용하지 않는다.

### 2.3 인메모리 재생 세션

- 현재 곡, 재생 위치, 반복·셔플 설정, 셔플 큐, 재생 이력은 `playback:{roomId}` 인메모리 세션에만 둔다.
- cache miss는 현재 곡 없음·일시정지·반복 없음·셔플 해제의 새 세션으로 처리한다.
- 서버 재시작 후에는 기존 Socket이 재연결하며 기본 상태의 `room:joined` snapshot을 받는다. Host가 새 재생을 시작하기 전까지 자동 재생하지 않는다.
- 실행 중 세션을 명시적으로 지울 때에는 `playback:reset`을 전파한다. 클라이언트 Player 상태로 서버 세션을 복원하지 않는다.

### 2.4 연결 해제 유예와 멀티 디바이스

```text
Member disconnect → 5초 내 재접속 시 online 유지 / 미복귀 시 offline
Host disconnect   → 1분 내 재접속 시 복귀 / 미복귀 시 Room closed
```

같은 사용자의 다른 Socket이 Room에 남아 있으면 유예 타이머를 시작하지 않는다. 타이머는 인메모리이므로 서버 재시작 시 유실된다. 재시작 자체는 Room을 closed로 바꾸지 않으며, 재생 세션만 초기화된다.

---

## 3. 이벤트 목록

### C→S

| 이벤트                     | ack | 설명                                                        |
| -------------------------- | --- | ----------------------------------------------------------- |
| `room:join`                | O   | Socket Room 입장·snapshot 요청                              |
| `room:leave`               | X   | 명시적 퇴장                                                 |
| `playback:play`            | O   | 재생 요청 (Host)                                            |
| `playback:pause`           | O   | 일시정지 요청 (Host)                                        |
| `playback:seek`            | O   | seek 요청 (Host)                                            |
| `playback:change-track`    | O   | 직접 선택·다음·이전 요청 (Host)                             |
| `playback:update-settings` | O   | 반복·셔플 설정 변경 (Host)                                  |
| `playback:ended`           | O   | Host Player 종료 감지 알림                                  |
| `playback:error`           | O   | Host Player 재생 실패 알림                                  |
| `playback:sync-request`    | X   | 버퍼링·광고 뒤 또는 Member 로컬 재개 시 최신 재생 상태 요청 |
| `chat:send`                | O   | 채팅 전송                                                   |

Playlist 추가·삭제·순서 변경·개인 Playlist 불러오기는 REST API 처리 뒤 `playlist:updated`로 전파한다.

### S→C

| 이벤트                   | 대상        | 설명                      |
| ------------------------ | ----------- | ------------------------- |
| `room:joined`            | 입장 Socket | Room snapshot             |
| `room:host-disconnected` | Room        | Host 재연결 유예 시작     |
| `room:host-reconnected`  | Room        | Host 복귀                 |
| `room:closed`            | Room        | Room 종료 뒤 연결 해제    |
| `room:kicked`            | 추방 대상   | 추방 안내 뒤 연결 해제    |
| `playback:play`          | Room        | 재생 상태 반영            |
| `playback:pause`         | Room        | 일시정지 상태 반영        |
| `playback:seek`          | Room        | seek 상태 반영            |
| `playback:change-track`  | Room        | 곡 변경 상태 반영         |
| `playback:settings`      | Room        | 반복·셔플 설정 반영       |
| `playback:tick`          | Room        | 재생 중 10초 주기 보정    |
| `playback:sync-response` | 요청 Socket | 최신 재생 상태            |
| `playback:reset`         | Room        | 인메모리 재생 세션 초기화 |
| `playback:error`         | Room        | 재생 불가 안내            |
| `playlist:updated`       | Room        | 전체 Playlist 갱신        |
| `chat:received`          | Room        | 사용자 채팅               |
| `chat:system`            | Room        | 시스템 메시지             |
| `presence:update`        | Room        | 참여자 표시 상태 변경     |

---

## 4. Room 이벤트

### 4.1 `room:join` C→S와 `room:joined` S→C

REST 입장 완료 뒤 또는 재연결 뒤 호출한다.

```ts
// C→S
{
  roomId: string;
}

// ack
{
  success: true;
}
```

서버는 Socket을 `room:${roomId}`에 넣고 아래 snapshot을 해당 Socket에 전송한 뒤, 성공 ack를 반환한다.

```ts
// room:joined S→C
{
  roomId: string,
  hostConnection:
    | { status: 'connected' }
    | { status: 'disconnected', waitUntil: string },
  playbackState: {
    currentTime: number,
    isPlaying: boolean,
    videoId: string | null,
    playlistItemId: string | null,
    playbackVersion: number,
  },
  playbackPolicy: { repeatMode: 'off' | 'all' | 'one', shuffleEnabled: boolean },
  playlist: PlaylistItem[],
  members: Array<{
    id: string,
    userId: string,
    nickname: string,
    profileImage: string | null,
    role: 'host' | 'member' | 'guest',
    status: 'online' | 'offline' | 'left',
  }>,
  recentChats: ChatMessage[],
}
```

`kicked` Member는 snapshot에 포함하지 않는다. Host의 추방 목록은 REST `GET /rooms/:roomId/members?status=kicked`로 조회한다.

| 코드                 | 설명                             |
| -------------------- | -------------------------------- |
| `ROOM_NOT_FOUND`     | Room 없음                        |
| `ROOM_CLOSED`        | closed Room은 Socket 입장 불가   |
| `ROOM_INACTIVE`      | inactive Room은 Socket 입장 불가 |
| `ROOM_MEMBER_KICKED` | 추방 해제 전 재입장 불가         |
| `ROOM_ACCESS_DENIED` | REST 입장 이력 없음              |
| `VALIDATION_ERROR`   | roomId 형식 오류                 |

### 4.2 `room:leave` C→S

```ts
{
  roomId: string;
}
```

Member의 명시적 퇴장은 해당 Socket을 Room에서 제거하고 DB 상태를 `left`로 바꾼 뒤 `presence:update`를 전파한다.

Host의 명시적 퇴장은 즉시 Room을 closed로 전환한다. 이는 `PATCH /rooms/:roomId`에 `{ status: 'closed' }`를 전달하는 경우와 같은 종료 처리이며, 참여 이력·채팅은 보존하고 재생 세션을 종료한 뒤 `room:closed`를 전파한다.

### 4.3 Host 연결 상태

```ts
// room:host-disconnected S→C
{ roomId: string, waitUntil: string }

// room:host-reconnected S→C
{ roomId: string }
```

Host의 모든 Socket 연결이 끊기면 `room:host-disconnected`를 전파하고 1분을 기다린다. 유예 안에 `room:join`에 성공하면 타이머를 취소하고 `room:host-reconnected`를 전파한다. 유예가 끝나면 Room을 closed로 전환한다.

### 4.4 `room:closed` S→C

```ts
{
  roomId: string,
  reason: 'host-left' | 'host-timeout' | 'host-closed',
}
```

| reason         | 설명                              |
| -------------- | --------------------------------- |
| `host-left`    | Host가 `room:leave`로 명시적 퇴장 |
| `host-timeout` | Host disconnect 후 1분 미복귀     |
| `host-closed`  | Host가 Room 종료 API를 호출       |

서버는 `chat:system`을 먼저 저장·전파한 뒤 `room:closed`를 전송하고 모든 Socket을 Room에서 제거한다. Member 참여 이력을 `left`로 변경하지 않는다.

### 4.5 `room:kicked` S→C

```ts
{ roomId: string, message: 'Host에 의해 Room에서 추방되었습니다.' }
```

Host가 active Room의 Member를 추방하면 대상에게 이 이벤트를 보낸 뒤 대상의 모든 Socket Room 연결을 해제한다. 다른 참여자에게는 일반 퇴장과 같은 `presence:update { status: 'left' }`를 전파한다. DB의 실제 Member 상태는 `kicked`이며, Host만 REST 추방 목록에서 확인한다.

---

## 5. Playback 이벤트

### 5.1 공통 상태 payload

`playback:play`, `playback:pause`, `playback:seek`, `playback:change-track`, `playback:tick`, `playback:sync-response`는 필요 범위에서 다음 필드를 포함한다.

```ts
{
  currentTime: number,
  isPlaying: boolean,
  videoId: string | null,
  playlistItemId: string | null,
  playbackVersion: number,
}
```

Client는 수신한 서버 상태를 기준으로만 Player와 UI를 변경한다.

### 5.2 `playback:play`, `playback:pause`, `playback:seek` C→S

Host만 요청할 수 있다.

```ts
// playback:play / playback:pause
{ roomId: string, currentTime: number }

// playback:seek
{ roomId: string, seekTime: number }
```

서버는 인메모리 재생 세션을 갱신한 뒤 동일 이름의 S→C 이벤트를 Room 전체에 전파한다. 아직 곡이 선택되지 않은 `playback:play`는 현재 반복·셔플 정책으로 첫 재생 가능 곡을 선택하고 `playback:change-track`을 먼저 전파한다.

### 5.3 `playback:change-track` C→S

Host의 직접 선택, 다음, 이전 요청을 서버가 처리한다. FE가 다음 곡이나 셔플 순서를 계산하지 않는다.

```ts
{
  roomId: string,
  action: 'select' | 'next' | 'previous',
  playlistItemId?: string, // action: select에서 필수
}
```

- `select`: 어떤 재생 가능 곡이든 즉시 재생한다. 남은 셔플 큐에 있으면 큐에서 제거하고, 이미 들은 곡이면 남은 큐를 유지한다.
- `next`: 반복·셔플 정책으로 다음 곡을 선택한다.
- `previous`: 재생 세션 이력을 기준으로 이전 곡을 선택한다.

성공 시 서버는 `playback:change-track`으로 새 현재 곡과 `playbackVersion`을 전파한다.

### 5.4 반복·셔플 설정

#### `playback:update-settings` C→S

Host만 반복 모드와 셔플을 변경한다. 적어도 하나의 필드가 필요하다.

```ts
{
  roomId: string,
  repeatMode?: 'off' | 'all' | 'one',
  shuffleEnabled?: boolean,
}
```

셔플을 켜면 서버가 재생 가능한 곡으로 남은 큐를 만들고, 끄면 큐·이력을 비운다.

#### `playback:settings` S→C

```ts
{
  repeatMode: 'off' | 'all' | 'one',
  shuffleEnabled: boolean,
  playbackVersion: number,
}
```

### 5.5 `playback:ended` C→S

Host Player가 `ENDED` 상태를 감지하면 보낸다.

```ts
{ roomId: string, playlistItemId: string, playbackVersion: number }
```

서버는 현재 버전·곡과 일치하는 알림만 처리한다. 서버 종료 타이머와 동시에 도착해도 Room 단위 직렬화와 버전 비교로 한 번만 다음 상태를 결정한다. 다음 곡이 있으면 `playback:change-track`, 없으면 `playback:pause`를 전파한다.

### 5.6 `playback:tick`과 `playback:sync-request`

재생 중인 active Room에서 서버가 10초마다 `playback:tick`을 전파한다. Client는 Player 오차가 2초 이상일 때만 seek한다.

버퍼링 또는 광고 뒤 Player가 재생 가능해지거나, Member가 로컬 재생 동기화를 재개할 때 ack 없이 아래 요청을 보낸다. Member의 로컬 정지·재개는 Room 전체 재생 상태를 변경하지 않으며, 요청 Socket만 최신 상태를 받아 다시 동기화한다.

```ts
// C→S
{
  roomId: string;
} // playback:sync-request
```

서버는 요청 Socket에 `playback:sync-response`로 최신 공통 상태 payload를 보낸다.

### 5.7 `playback:reset` S→C

```ts
{
  roomId: string,
  reason: 'cache-reset',
  playbackState: { currentTime: 0, isPlaying: false, videoId: null, playlistItemId: null, playbackVersion: number },
  playbackPolicy: { repeatMode: 'off', shuffleEnabled: false },
}
```

실행 중 재생 세션이 명시적으로 제거된 경우에만 전파한다. 서버 재시작 뒤에는 Socket이 끊기므로, 재연결 시 `room:joined` 기본 snapshot으로 같은 결과를 전달한다.

### 5.8 `playback:error`

Host Player가 재생 실패를 감지하면 아래 payload로 보낸다.

```ts
{ roomId: string, videoId: string, errorCode: number }
```

서버가 영상 삭제·비공개 등 재생 불가를 확인하면 해당 Room Playlist 항목을 `unavailable`로 표시하고 `playlist:updated`를 전파한다. 이어서 반복·셔플 정책에 따라 다음 재생 가능 곡을 선택하거나 재생을 중지한다. 모든 참여자에게 `playback:error`를 전파한다.

### 5.9 Playback 요청 오류

`playback:*` C→S 요청은 다음 오류를 ack로 반환할 수 있다.

| 코드                      | 설명                                       |
| ------------------------- | ------------------------------------------ |
| `ROOM_NOT_FOUND`          | Room 없음                                  |
| `ROOM_NOT_ACTIVE`         | closed·inactive Room의 재생 요청           |
| `ROOM_MEMBER_KICKED`      | 추방된 사용자 요청                         |
| `ROOM_ACCESS_DENIED`      | Room 참여 이력 없음                        |
| `AUTH_FORBIDDEN`          | Host 전용 요청을 Member가 보냄             |
| `PLAYLIST_ITEM_NOT_FOUND` | 없는 항목·다른 Room 항목·재생 가능 곡 없음 |
| `VALIDATION_ERROR`        | payload 형식 오류                          |

---

## 6. Playlist·채팅·Presence 이벤트

### 6.1 `playlist:updated` S→C

Room Playlist의 REST 변경 또는 개인 Playlist 불러오기가 성공한 뒤 전체 Playlist를 한 번 전파한다.

```ts
{ playlist: PlaylistItem[] }
```

### 6.2 `chat:send` C→S와 `chat:received` S→C

active Room의 `kicked`가 아닌 참여자만 보낼 수 있다. 서버는 공백·길이·참여 권한을 검증하고, 기본 한국어 비속어 목록에 매칭되는 표현을 마스킹한 메시지만 DB에 저장한 뒤 Room 전체에 전파한다. 원문 보관, 신고·차단·제재 같은 운영 모더레이션은 포함하지 않는다.

```ts
// C→S
{ roomId: string, message: string }

// ack: 서버가 저장한 최종 메시지 (비속어 마스킹 결과 포함)
{ success: true, data: ChatMessage }

// chat:received S→C
{ id, userId, nickname, profileImage, type: 'user', message, createdAt }
```

송신자는 ack의 `ChatMessage`로 낙관적 임시 메시지를 교체한다. `chat:received`가 ack보다 먼저 도착할 수 있으므로, 동일 메시지는 id 기준으로 하나만 유지한다. Unicode 이모지는 `message` 문자열로 그대로 저장·전파한다. 채팅 오류는 `ROOM_NOT_ACTIVE`, `ROOM_MEMBER_KICKED`, `ROOM_ACCESS_DENIED`, `VALIDATION_ERROR`를 ack로 반환한다.

### 6.3 `chat:system` S→C

입장·일반 퇴장·곡 추가·곡 삭제·Host 재생 제어·Host 연결 해제·Room 종료 때 생성한다. DB 저장 성공 뒤에만 전파하며, Room 종료에서는 `room:closed`보다 먼저 보낸다.

```ts
{
  id: string,
  userId: null,
  nickname: null,
  profileImage: null,
  type: 'system',
  message: string,
  createdAt: string,
}
```

시스템 메시지도 `ChatMessage` 구조를 사용하며, 작성자 관련 필드는 모두 `null`이다.

### 6.4 `presence:update` S→C

```ts
{
  userId: string,
  nickname: string,
  profileImage: string | null,
  role: 'host' | 'member' | 'guest',
  status: 'online' | 'offline' | 'left',
}
```

| 시점                       | 표시 status |
| -------------------------- | ----------- |
| `room:join`                | `online`    |
| Member disconnect 5초 경과 | `offline`   |
| 재연결 뒤 `room:join`      | `online`    |
| Member `room:leave`        | `left`      |
| Member 추방                | `left`      |

추방 시 DB 상태는 `kicked`지만 다른 참여자의 표시에는 일반 퇴장으로만 전파한다. Host는 REST 추방 목록으로 실제 상태를 확인한다.
