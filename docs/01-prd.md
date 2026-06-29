# 01. PRD

# Syfity PRD

---

## 1. 문서 정보

| 항목      | 내용                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------- |
| 문서명    | Syfity PRD                                                                                      |
| 버전      | v1.0                                                                                            |
| 상태      | MVP 정책 결정 반영본                                                                            |
| 작성 목적 | Syfity MVP 제품 요구사항 정의                                                                   |
| 기반 문서 | `99-technical-legal-feasibility.md`, `98-market-research.md`, PRD 회의 결정사항                 |
| 비고      | 본 문서는 MVP 구현 기준을 정의하기 위한 PRD이며, 세부 구현 과정에서 일부 정책은 변경될 수 있다. |

---

## 2. 서비스 개요

### 2.1 서비스명

**Syfity**

### 2.2 서비스 한 줄 정의

> Syfity는 여러 사용자가 하나의 Room에서 같은 음악을 실시간으로 듣고, 플레이리스트를 함께 관리하며, 채팅으로 소통하는 웹 기반 소셜 리스닝 플랫폼이다.

### 2.3 서비스 설명

Syfity는 사용자가 Room을 만들고 친구를 초대하여 같은 음악을 동시에 감상할 수 있는 웹 서비스이다.

사용자는 Room 안에서 YouTube 영상을 검색하거나 YouTube / YouTube Music 공유 링크를 입력해 공동 플레이리스트에 곡을 추가할 수 있다. Room 참여자는 같은 곡을 같은 시점에 감상하며, 채팅을 통해 음악에 대한 반응이나 대화를 나눌 수 있다.

Syfity는 음악 스트리밍 서비스를 직접 제공하지 않는다. 실제 영상과 음원은 각 사용자의 브라우저에서 YouTube IFrame Player를 통해 재생되며, Syfity 서버는 `videoId`, `baseCurrentTime`, `isPlaying`, `playlistOrder`, `serverStartedAt` 같은 재생 상태와 Room 데이터를 동기화한다.

---

## 3. 문제 정의

### 3.1 배경

기존 음악 서비스는 개인화 추천, 플레이리스트, 음질, 구독 모델 중심으로 발전해왔다. 그러나 친구들과 음악을 함께 듣고, 함께 곡을 고르고, 감상 중 대화하는 경험은 여러 서비스에 분산되어 있다.

Spotify Jam은 함께 듣기 기능을 제공하지만 채팅 경험은 약하고, Discord는 채팅과 커뮤니티에 강하지만 음악 플레이어와 공동 플레이리스트 관리가 중심 기능은 아니다. Apple SharePlay는 동시 감상 경험은 좋지만 Apple 생태계에 강하게 묶여 있다. Rave는 공동 감상과 채팅을 제공하지만 음악보다는 영상 공동 시청에 더 가깝다.

### 3.2 핵심 문제

현재 사용자가 친구와 음악을 함께 듣기 위해서는 다음 문제가 발생한다.

1. 음악 재생과 대화가 분리되어 있다.
2. 공동 플레이리스트 관리 경험이 부족하다.
3. 플랫폼 또는 앱 의존성이 높다.
4. 반복적으로 들어갈 수 있는 Room 기반 감상 공간이 부족하다.
5. 실시간 동기화가 불안정하면 “함께 듣고 있다”는 감각이 약해진다.
6. YouTube 기반 재생에서는 광고, 버퍼링, autoplay 차단 등 사용자별 재생 상태 차이가 발생할 수 있다.

### 3.3 해결 방향

Syfity는 음악 감상, 공동 플레이리스트, 채팅, Room, 실시간 동기화를 하나의 화면과 흐름 안에서 제공한다.

MVP에서는 비공개 Room과 초대 코드를 중심으로 시작하되, 추후 공개방으로 확장 가능한 구조를 둔다.

---

## 4. 제품 목표

### 4.1 Product Goals

| 목표                     | 설명                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| 쉬운 Room 생성과 참여    | 사용자가 빠르게 방을 만들고 초대 코드 또는 링크로 친구를 초대할 수 있어야 한다.              |
| 실시간 공동 감상         | 참여자들이 같은 곡을 같은 시점에 듣는 경험을 제공해야 한다.                                  |
| 공동 플레이리스트 관리   | 참여자가 함께 곡을 추가하고, 현재 곡과 다음 곡을 쉽게 확인할 수 있어야 한다.                 |
| 음악과 채팅의 결합       | 음악 감상 중 같은 화면에서 자연스럽게 대화할 수 있어야 한다.                                 |
| 재입장 가능한 Room 경험  | 초대 코드 또는 최근 Room 목록을 통해 기존 Room에 다시 입장할 수 있어야 한다.                 |
| 확장 가능한 Room 구조    | MVP는 비공개방 중심이지만, 추후 공개방으로 확장 가능한 구조를 가져야 한다.                   |
| 안전한 YouTube 기반 재생 | YouTube 콘텐츠를 직접 저장하거나 재배포하지 않고, 공식 IFrame Player 기반으로 재생해야 한다. |
| 광고/버퍼링 상황 대응    | YouTube 광고와 버퍼링으로 인한 사용자별 지연을 고려해 자동 동기화 보정 정책을 제공해야 한다. |

### 4.2 Non-goals

MVP에서는 다음 기능을 목표로 하지 않는다.

- 자체 음원 스트리밍
- MP3 추출
- YouTube 영상 다운로드
- YouTube Player 숨김 재생
- YouTube Music 직접 API 연동
- 공개방 목록 및 탐색
- 공개방 추천 피드
- Guest 역할 실제 사용
- 신고/차단 기반 공개방 모더레이션
- 음성 채팅
- 친구 시스템
- 추천 알고리즘
- AI 플레이리스트 추천
- 유료 방
- 수동 Sync 버튼

---

## 5. 타깃 사용자

### 5.1 Primary Target

#### 온라인에서 친구와 음악을 함께 듣고 싶은 10~20대 사용자

특징:

- YouTube, YouTube Music, Spotify, Discord 같은 서비스에 익숙하다.
- 음악을 혼자 듣는 것뿐 아니라 친구와 공유하고 대화하는 경험을 선호한다.
- 별도 앱 설치 없이 웹에서 빠르게 참여하는 경험을 선호한다.
- 플레이리스트를 함께 만들고, 서로 곡을 추천하는 경험에 익숙하다.

### 5.2 Secondary Target

#### 디스코드나 메신저로 대화하면서 음악을 공유하는 사용자

특징:

- 평소 Discord, KakaoTalk, Instagram DM 등에서 음악 링크를 공유한다.
- 음악을 함께 듣고 싶지만, 재생 상태를 맞추거나 곡 순서를 관리하기 어렵다.
- 대화와 음악 감상을 하나의 공간에서 하고 싶어한다.

### 5.3 추후 확장 가능 타깃

- 공개방에서 비슷한 취향의 사람들과 음악을 듣고 싶은 사용자
- 온라인 스터디/작업 중 배경음악을 함께 듣고 싶은 사용자
- 팬덤이나 커뮤니티에서 음악 감상회를 열고 싶은 사용자

---

## 6. Product Principles

1. 누구나 쉽게 방을 만들고 참여할 수 있어야 한다.
2. 음악과 대화가 하나의 공간에서 자연스럽게 이루어져야 한다.
3. 플레이리스트는 개인이 아닌 Room의 공동 자산이어야 한다.
4. 실시간 동기화는 사용자가 의식하지 못할 정도로 자연스러워야 한다.
5. 소셜 기능은 음악 감상을 방해하지 않아야 한다.
6. 특정 플랫폼이나 구독 서비스에 대한 의존도를 낮춰야 한다.
7. YouTube 기반 재생은 공식 Player와 정책을 준수해야 한다.
8. MVP는 비공개 Room 중심으로 단순하게 시작하되, 공개방과 권한 확장이 가능한 구조로 설계한다.
9. 광고와 버퍼링은 제거하거나 우회하지 않고, 사용자가 재생 가능한 상태가 된 이후 현재 Room 시점에 자동 합류하도록 보정한다.
10. 사용자의 동기화 조작은 최소화하고, 서버 기준 자동 보정으로 일관된 공동 감상 경험을 제공한다.

---

## 7. MVP 범위

### 7.1 MVP 핵심 시나리오

```
Google Login
→ Room 생성
→ 초대 코드 또는 초대 링크 공유
→ Room 입장
→ YouTube 검색 또는 YouTube / YouTube Music 링크 입력
→ Playlist에 곡 추가
→ Host가 재생 시작
→ 서버 기준 재생 상태 동기화
→ 참여자는 광고/버퍼링 이후 현재 Room 시점으로 자동 합류
→ 채팅
→ 곡 변경 / 재생 / 일시정지 / Seek 동기화
→ Room 재입장 또는 Host 종료
```

### 7.2 MVP 포함 기능

| 구분        | 기능                                                  |
| ----------- | ----------------------------------------------------- |
| 인증        | Google Login                                          |
| Room        | 비공개 Room 생성, 초대 코드 입장, 최근 Room 재입장    |
| Room 확장성 | `private` / `public` 타입 구조 준비                   |
| 사용자 역할 | Host, Member, Guest 역할 구조                         |
| 역할 사용   | MVP에서는 Host / Member 중심, Guest는 타입만 준비     |
| 음악 검색   | YouTube 검색                                          |
| 링크 추가   | YouTube / YouTube Music 공유 링크 기반 곡 추가        |
| Player      | YouTube IFrame Player 기반 재생                       |
| Playlist    | 곡 추가, 삭제, 순서 확인, Host 순서 변경              |
| Realtime    | 재생, 일시정지, Seek, 곡 변경 동기화                  |
| Sync        | 서버 절대 시간 기반 동기화, 광고/버퍼링 후 자동 보정  |
| Chat        | 텍스트 채팅, 시스템 메시지                            |
| Presence    | 참여자 목록, 온라인 상태                              |
| Responsive  | 모든 화면 반응형 대응                                 |
| Error State | 영상 재생 실패, 방 입장 실패, 연결 끊김, 빈 상태 처리 |

### 7.3 MVP 제외 기능

| 기능                    | 제외 이유                                     |
| ----------------------- | --------------------------------------------- |
| 공개방 목록             | MVP 우선순위는 비공개방 기반 안정적 동기화    |
| 공개방 검색/추천        | 공개방 설계 이후 필요                         |
| Guest 실제 사용         | 공개방 이후 추가 고려                         |
| 신고/차단               | Public Room MVP 제외로 인해 후순위            |
| 친구 시스템             | Room 초대 링크와 최근 Room 목록으로 대체 가능 |
| 음성 채팅               | 구현 범위 증가                                |
| AI 추천                 | 핵심 기능 안정화 이후 확장                    |
| 유료 기능               | 정책/법률 검토 필요                           |
| YouTube Music 직접 연동 | 공식 API 및 정책 이슈                         |
| 자체 음원 업로드        | 저작권 및 구현 범위 이슈                      |
| 수동 Sync 버튼          | 서버 절대 시간 기반 자동 보정으로 처리        |

---

## 8. Room 정책

### 8.1 Room 타입

Syfity의 Room은 확장성을 고려해 다음 타입을 가진다.

```tsx
type RoomVisibility = 'private' | 'public';
```

#### Private Room

MVP의 기본 Room 타입이다.

특징:

- 초대 코드 또는 초대 링크로 입장
- 공개 목록에 노출되지 않음
- 친구 또는 소규모 그룹 중심 사용
- MVP 우선 구현

#### Public Room

추후 확장 기능이다.

특징:

- 공개 목록에 노출 가능
- 누구나 탐색 후 입장 가능
- Guest 역할, 신고, 차단, 강퇴, 채팅 제한 등 추가 정책 필요
- MVP에서는 데이터 구조와 권한 모델만 확장 가능하게 설계

### 8.2 Room 지속성

MVP에서 Room은 단순 일회성 방이 아니라, 초대 코드 기반으로 재입장 가능한 Private Room으로 설계한다.

#### 정책

- Room 생성 시 DB에 저장한다.
- Host가 명시적으로 방을 종료하기 전까지 Room은 유지된다.
- Room 데이터는 삭제하지 않고 상태값으로 관리한다.
- 마지막 활동 후 30일 이상 지난 Room은 inactive 처리한다.
- inactive 처리는 물리 삭제가 아니라 상태 변경이다.

```tsx
type RoomStatus = 'active' | 'inactive' | 'closed';
```

#### 상태 정의

| 상태     | 설명                                          |
| -------- | --------------------------------------------- |
| active   | 입장 및 재생 가능한 Room                      |
| inactive | 마지막 활동 후 30일 이상 지나 비활성화된 Room |
| closed   | Host가 종료했거나 Host 미복귀로 닫힌 Room     |

### 8.3 Room 재입장 정책

#### 정책

- 최초 입장은 초대 코드 또는 초대 링크를 통해 가능하다.
- 한 번 참여한 active Room은 최근 Room 목록에서 초대 코드 없이 재입장할 수 있다.
- 초대 코드가 유효하면 다시 입력하여 재입장할 수 있다.
- active Room은 재입장 가능하다.
- inactive Room은 MVP에서 재입장할 수 없다.
- closed Room은 MVP에서 재입장할 수 없다.
- closed Room은 최근 Room 목록에 노출하지 않는다.

### 8.4 최근 Room 목록 정책

#### 표시 범위

- 사용자가 이전에 참여한 active Room만 표시한다.
- inactive Room과 closed Room은 최근 Room 목록에 표시하지 않는다.

#### 정렬 기준

- 기본 정렬은 `lastJoinedAt` 내림차순으로 한다.
- 추후 필요 시 `lastActivityAt` 기준 정렬을 검토할 수 있다.

---

## 9. 사용자 역할 및 권한

### 9.1 역할 정의

```tsx
type RoomRole = 'host' | 'member' | 'guest';
```

#### Host

Room을 생성한 사용자 또는 Host 권한을 위임받은 사용자이다.

주요 책임:

- Room 관리
- 재생 제어
- 플레이리스트 관리
- 참여자 관리
- Room 종료

#### Member

Private Room에서 초대 코드로 입장한 로그인 사용자이다.

주요 권한:

- 채팅
- 곡 추가
- 본인이 추가한 곡 삭제
- 현재 재생 상태 수신
- 최근 Room 목록을 통한 재입장

#### Guest

공개방 확장을 고려한 제한 역할이다.

MVP에서는 실제 사용자 흐름에 사용하지 않고 타입만 준비한다.

추후 용도:

- 공개방 임시 참여
- 제한된 채팅 권한
- 제한된 곡 추가 권한
- 모더레이션 대상 역할

### 9.2 MVP 권한 매트릭스

| 기능                         | Host     | Member   | Guest  |
| ---------------------------- | -------- | -------- | ------ |
| Room 생성                    | O        | O        | 미사용 |
| Room 종료                    | O        | X        | 미사용 |
| Room 정보 수정               | O        | X        | 미사용 |
| 초대 코드 공유               | O        | O        | 미사용 |
| Room 입장                    | O        | O        | 미사용 |
| 재생                         | O        | X        | 미사용 |
| 일시정지                     | O        | X        | 미사용 |
| Seek                         | O        | X        | 미사용 |
| 다음 곡 이동                 | O        | X        | 미사용 |
| 이전 곡 이동                 | O        | X        | 미사용 |
| 곡 추가                      | O        | O        | 미사용 |
| 본인이 추가한 곡 삭제        | O        | O        | 미사용 |
| 다른 사용자가 추가한 곡 삭제 | O        | X        | 미사용 |
| 곡 순서 변경                 | O        | X        | 미사용 |
| 채팅                         | O        | O        | 미사용 |
| 시스템 메시지 수신           | O        | O        | 미사용 |
| 참여자 강퇴                  | MVP 제외 | MVP 제외 | 미사용 |
| Host 위임                    | MVP 제외 | X        | 미사용 |

### 9.3 재생 제어 정책

MVP에서는 Host만 재생을 제어할 수 있다.

Host가 제어 가능한 기능:

- 재생
- 일시정지
- Seek
- 다음 곡 이동
- 이전 곡 이동
- 현재 곡 변경

Member는 재생 제어 권한을 가지지 않는다.

이유:

- 트롤링 방지
- 동기화 충돌 최소화
- 서버 이벤트 처리 단순화
- MVP 구현 안정성 확보

### 9.4 Playlist 권한 정책

#### 곡 추가

- Host와 Member 모두 곡을 추가할 수 있다.

#### 곡 삭제

- Host는 모든 곡을 삭제할 수 있다.
- Member는 본인이 추가한 곡만 삭제할 수 있다.

#### 순서 변경

- Host만 Playlist 순서를 변경할 수 있다.
- Member는 순서를 변경할 수 없다.

---

## 10. Host 퇴장 및 Room 종료 정책

### 10.1 Host 퇴장

Host가 Room을 나가거나 연결이 끊긴 경우, Room은 즉시 종료되지 않는다.

#### 정책

1. Host가 연결 해제되면 Room은 Host 재접속 대기 상태가 된다.
2. Host 재접속 대기 시간은 1분으로 한다.
3. 1분 안에 Host가 돌아오면 Room은 정상 상태로 복구된다.
4. 1분 안에 Host가 돌아오지 않으면 Room은 closed 상태가 된다.
5. Room이 closed 상태가 되면 모든 Member는 Room에서 퇴장 처리된다.
6. Room 데이터는 삭제하지 않고 closed 상태로 보관한다.
7. closed Room은 최근 Room 목록에 노출하지 않는다.

### 10.2 Host가 직접 Room 종료

Host가 명시적으로 Room을 종료하면 다음 처리가 발생한다.

- Room 상태를 closed로 변경한다.
- 모든 Member를 퇴장 처리한다.
- 재생 상태를 중지한다.
- Room 데이터는 삭제하지 않는다.
- closed Room은 최근 Room 목록에 표시하지 않는다.

### 10.3 Host 위임 정책

MVP에서는 Host 자동 위임을 지원하지 않는다.

Host가 1분 안에 재접속하지 않으면 Room은 closed 처리된다.

Host 위임은 MVP 이후 추가 고려 사항으로 둔다.

---

## 11. 인증 정책

### 11.1 로그인 방식

MVP에서는 Google Login을 사용한다.

```tsx
type AuthProvider = 'google';
```

### 11.2 로그인 필수 여부

MVP에서는 로그인 필수를 기준으로 한다.

로그인이 필요한 이유:

- Host 식별
- Room 참여자 식별
- 채팅 작성자 식별
- 플레이리스트에 곡을 추가한 사용자 식별
- 본인이 추가한 곡 삭제 권한 검증
- Room 재입장 처리
- 최근 Room 목록 제공
- 권한 관리
- 재연결 시 사용자 상태 복구

### 11.3 비로그인 Guest

MVP에서는 비로그인 Guest 입장을 지원하지 않는다.

Guest 역할은 Public Room 확장을 고려한 타입으로만 준비한다.

---

## 12. 음악 소스 정책

### 12.1 기본 재생 방식

Syfity는 YouTube IFrame Player API를 기반으로 영상을 재생한다.

Syfity 서버는 영상 파일이나 음원 파일을 저장하지 않는다. 서버는 다음 상태만 저장하거나 동기화한다.

```tsx
type PlaybackState = {
  roomId: string;
  videoId?: string;
  playlistItemId?: string;
  baseCurrentTime: number;
  isPlaying: boolean;
  serverStartedAt?: string;
  serverPausedAt?: string;
  updatedAt: string;
  controlledBy: string;
};
```

### 12.2 YouTube 검색

사용자는 Room 안에서 YouTube 영상을 검색할 수 있다.

검색 결과에는 다음 정보를 표시한다.

- 영상 제목
- 채널명
- 썸네일
- 영상 길이
- YouTube 출처

### 12.3 YouTube / YouTube Music 링크 추가

사용자는 YouTube 또는 YouTube Music 공유 링크를 입력하여 곡을 추가할 수 있다.

지원 범위:

```
<https://www.youtube.com/watch?v={videoId}>
<https://youtu.be/{videoId}>
<https://music.youtube.com/watch?v={videoId}>
```

Syfity는 링크에서 `videoId`를 추출한 뒤, 해당 `videoId`를 YouTube IFrame Player에 전달한다.

#### 정책

- YouTube Music 직접 연동이 아니다.
- YouTube Music 계정, 보관함, 플레이리스트, 추천 데이터를 가져오지 않는다.
- YouTube Music 내부 API를 사용하지 않는다.
- 공유 링크에서 `videoId`만 추출한다.
- `videoId` 추출이 불가능한 링크는 지원하지 않는다.
- 재생 불가능한 영상은 에러 처리한다.

---

## 13. 실시간 동기화 정책

### 13.1 동기화 기본 방향

MVP의 동기화 기준은 서버 절대 시간 기반으로 한다.

Host는 재생 제어 이벤트를 발생시키는 사용자이며, 서버는 해당 이벤트를 기준으로 Room의 공식 PlaybackState를 갱신한다.

즉, Host의 조작은 서버 상태를 변경하는 트리거이고, 실제 동기화 기준은 서버가 관리하는 재생 상태와 서버 시간이다.

### 13.2 기본 흐름

```
Host가 play / pause / seek / change-track 이벤트 발생
→ 서버로 이벤트 전송
→ 서버가 PlaybackState 갱신
→ 서버가 Room 참여자에게 broadcast
→ 각 클라이언트가 서버 기준 currentTime 계산
→ YouTube Player 상태 갱신
```

### 13.3 서버 기준 currentTime 계산

재생 중일 때 현재 재생 위치는 다음 개념으로 계산한다.

```
currentRoomTime = baseCurrentTime + (now - serverStartedAt)
```

#### 예시

- Host가 30초 지점에서 재생 시작
- 서버가 `baseCurrentTime = 30`, `serverStartedAt = 10:00:00` 저장
- 사용자가 10:00:10에 Room에 입장
- 해당 사용자는 약 40초 지점으로 seek 후 재생

### 13.4 동기화 이벤트

동기화 대상 이벤트:

- play
- pause
- seek
- change-track
- next-track
- previous-track
- playlist-update
- sync-response

### 13.5 새 사용자 입장 시 동기화

새 사용자가 Room에 입장하면 서버는 다음 데이터를 전달한다.

- 현재 곡
- 현재 Playlist
- 현재 PlaybackState
- 서버 기준 현재 재생 위치
- 재생 여부
- 참여자 목록
- 최근 채팅 메시지
- Room 상태

사용자는 서버 기준 현재 시점으로 YouTube Player를 동기화한다.

### 13.6 동기화 보정 정책

MVP에서는 수동 Sync 버튼을 제공하지 않는다.

모든 동기화 보정은 서버 기준 자동 보정으로 처리한다.

정책:

- 기본 동기화 허용 오차는 2초로 한다.
- 클라이언트의 현재 재생 위치가 서버 기준 현재 Room 시점과 2초 이상 차이 나면 자동 보정한다.
- 동기화 허용 오차는 상수로 관리하고, 테스트 결과에 따라 1~3초 범위에서 조정 가능하게 구현한다.
- 재생 중인 Room에서는 이벤트 발생 시 보정한다.
- 재생 중인 Room에서는 10초 주기로 자동 보정 검사를 수행한다.
- 보정은 서버 기준 currentRoomTime으로 seek하는 방식으로 처리한다.

```tsx
const DEFAULT_SYNC_THRESHOLD_SECONDS = 2;
const SYNC_CHECK_INTERVAL_SECONDS = 10;
```

---

## 14. YouTube Player 상태 및 광고/버퍼링 처리

### 14.1 고려해야 할 Player 상태

YouTube IFrame Player 기반 재생에서는 다음 상태가 동기화 품질에 영향을 줄 수 있다.

- Player 준비 지연
- autoplay 차단
- buffering
- YouTube 광고 재생
- 영상 재생 실패
- 임베드 불가 영상
- 사용자별 YouTube 계정 / Premium 여부 차이

### 14.2 광고 처리 정책

Syfity는 YouTube 광고를 제거하거나 차단하지 않는다.

정책:

- YouTube 광고는 제거하지 않는다.
- YouTube 광고 영역을 가리지 않는다.
- YouTube Player의 로고, 링크, 컨트롤을 조작하지 않는다.
- 광고를 보고 있는 사용자를 기다리지 않고 Room 재생은 계속 진행한다.
- 광고 또는 버퍼링이 끝난 사용자는 서버 기준 현재 Room 시점으로 자동 보정된다.
- 광고/버퍼링으로 인한 지연은 수동 Sync 버튼이 아니라 자동 보정으로 해결한다.

### 14.3 광고/버퍼링 사용자의 합류 방식

결정된 정책:

- Room 전체는 광고 사용자를 기다리지 않고 진행한다.
- 광고 또는 버퍼링 중인 사용자는 개별적으로 대기한다.
- 해당 사용자의 Player가 재생 가능한 상태가 되면 서버 기준 현재 Room 시점으로 자동 seek한다.
- 이 과정에서 사용자는 초반 일부 구간을 놓칠 수 있다.
- 필요한 경우 “광고 또는 버퍼링 후 현재 재생 위치로 자동 동기화됩니다” 안내를 표시한다.

### 14.4 재생 실패 처리

YouTube 영상은 다음 이유로 재생 실패할 수 있다.

- 삭제된 영상
- 비공개 영상
- 임베드 불가 영상
- 지역 제한 영상
- 네트워크 오류

처리 정책:

- 사용자에게 재생 실패 안내를 표시한다.
- Host에게 다음 곡으로 이동할 수 있는 UI를 제공한다.
- 재생 실패한 곡은 Playlist에서 즉시 제거하지 않고 실패 상태를 표시할 수 있다.
- Host가 다음 곡으로 이동하면 서버 PlaybackState를 갱신한다.

---

## 15. 채팅 정책

### 15.1 MVP 채팅 범위

MVP에서는 다음 채팅 기능을 포함한다.

- 텍스트 채팅
- 시스템 메시지

이모지 리액션은 MVP 범위에서는 제외하고, MVP 이후 추가 고려 사항으로 둔다.

### 15.2 텍스트 채팅

요구사항:

- Room 참여자는 텍스트 메시지를 보낼 수 있다.
- 메시지는 모든 참여자에게 실시간으로 표시된다.
- 메시지에는 작성자, 내용, 작성 시간이 포함된다.
- MVP에서는 이미지, 파일, 음성 메시지는 지원하지 않는다.

### 15.3 시스템 메시지

시스템 메시지는 Room 상태 변화를 사용자에게 알려주는 메시지이다.

MVP 필수 시스템 메시지:

- 사용자가 입장했습니다.
- 사용자가 퇴장했습니다.
- 곡이 추가되었습니다.
- 곡이 삭제되었습니다.
- Host가 재생을 시작했습니다.
- Host가 일시정지했습니다.
- Host 연결이 끊겼습니다.
- Host 재접속을 기다리는 중입니다.
- Room이 종료되었습니다.
- 광고 또는 버퍼링 후 현재 위치로 자동 동기화됩니다.

---

## 16. Empty / Error State 정책

### 16.1 기본 방향

상황에 따라 Toast, 컴포넌트 단위 상태, 페이지 단위 상태를 구분해 처리한다.

### 16.2 Toast로 처리할 상태

실시간 또는 일시적 피드백이 필요한 상태는 Toast로 처리한다.

예시:

- 곡 추가 완료
- 곡 삭제 완료
- 권한 없음
- 네트워크 일시 끊김
- 자동 동기화 완료
- 유효하지 않은 링크
- 검색 실패

### 16.3 컴포넌트 단위로 처리할 상태

특정 UI 영역의 빈 상태는 컴포넌트 단위로 처리한다.

예시:

- 빈 플레이리스트
- 검색 결과 없음
- 채팅 메시지 없음
- 참여자 목록 로딩
- Player 준비 중
- 광고/버퍼링 후 자동 동기화 대기

### 16.4 페이지 단위로 처리할 상태

페이지 전체 접근이 불가능한 경우 페이지 단위로 처리한다.

예시:

- 존재하지 않는 Room
- inactive Room
- closed Room
- 권한 없는 Room
- 잘못된 초대 코드
- 로그인 필요
- 존재하지 않는 페이지

---

## 17. 주요 사용자 흐름

### 17.1 로그인

```
사용자
→ Landing Page
→ Google Login 클릭
→ 인증 완료
→ Home 이동
```

요구사항:

- 사용자는 Google 계정으로 로그인할 수 있어야 한다.
- 로그인 성공 시 사용자 프로필 정보를 저장한다.
- 로그인 실패 시 에러 메시지를 표시한다.

### 17.2 Room 생성

```
Home
→ Create Room 클릭
→ Room 이름 입력
→ Private Room 생성
→ Invite Code 발급
→ Room Page 이동
```

요구사항:

- 로그인한 사용자는 Room을 생성할 수 있다.
- Room 생성자는 Host가 된다.
- MVP에서는 기본적으로 Private Room으로 생성한다.
- Room 생성 시 초대 코드가 발급된다.
- 생성한 Room은 최근 Room 목록에 표시된다.

### 17.3 Room 최초 입장

```
초대 코드 입력 또는 초대 링크 클릭
→ Room 조회
→ 입장
→ Member로 등록
→ 현재 Room 상태 동기화
```

요구사항:

- 사용자는 초대 코드 또는 초대 링크로 Room에 입장할 수 있다.
- Room이 존재하지 않으면 에러를 표시한다.
- Room이 inactive 또는 closed 상태이면 입장 불가 상태를 표시한다.
- 입장 성공 시 현재 곡, 서버 기준 재생 시간, 재생 여부, 플레이리스트, 최근 채팅, 참여자 목록을 받아온다.

### 17.4 최근 Room 재입장

```
Home
→ 최근 Room 목록 확인
→ Room 선택
→ Room 상태 확인
→ 재입장
```

요구사항:

- 사용자는 이전에 참여한 active Room 목록을 볼 수 있다.
- active Room은 초대 코드 없이 재입장할 수 있다.
- inactive Room과 closed Room은 최근 Room 목록에 노출하지 않는다.

### 17.5 곡 검색 및 추가

```
Room
→ Search 입력
→ YouTube 검색 결과 표시
→ 곡 선택
→ Playlist 추가
→ 모든 참여자에게 반영
```

요구사항:

- 사용자는 YouTube 영상을 검색할 수 있다.
- 검색 결과에서 곡을 선택해 Room Playlist에 추가할 수 있다.
- Playlist에 추가된 곡은 모든 참여자에게 실시간으로 반영된다.
- 검색 요청에는 debounce를 적용한다.

### 17.6 링크 기반 곡 추가

```
Room
→ YouTube / YouTube Music 링크 입력
→ videoId 추출
→ 영상 정보 조회
→ Playlist 추가
```

요구사항:

- 사용자는 YouTube 또는 YouTube Music 공유 링크를 입력할 수 있다.
- 시스템은 링크에서 `videoId`를 추출한다.
- `videoId`가 유효하면 영상 정보를 조회하고 Playlist에 추가한다.
- 유효하지 않은 링크이면 에러를 표시한다.
- 재생 불가능한 영상이면 추가를 막거나 재생 실패 시 안내한다.

### 17.7 음악 재생 동기화

```
Host가 재생/일시정지/Seek/다음 곡 실행
→ 서버가 PlaybackState 갱신
→ 서버가 Room 참여자에게 broadcast
→ 각 클라이언트가 서버 기준 재생 위치로 Player 상태 갱신
→ 재생 위치 오차가 2초 이상이면 자동 보정
```

요구사항:

- Host의 재생 상태 변경은 모든 참여자에게 반영되어야 한다.
- 새로 입장한 사용자는 현재 Room의 재생 상태를 받아 동기화되어야 한다.
- 광고/버퍼링 중인 사용자는 재생 가능한 상태가 된 후 서버 기준 현재 위치로 자동 합류해야 한다.
- 사용자는 수동 Sync 버튼 없이 자동 보정으로 동기화되어야 한다.
- 재생 중에는 10초 주기로 동기화 오차를 검사한다.

### 17.8 채팅

```
Room
→ 메시지 입력
→ 전송
→ 모든 참여자에게 실시간 표시
```

요구사항:

- 참여자는 Room 안에서 채팅할 수 있다.
- 메시지는 작성자, 내용, 작성 시간을 포함한다.
- 최신 메시지가 실시간으로 표시되어야 한다.
- MVP에서는 텍스트 메시지와 시스템 메시지를 지원한다.

### 17.9 Host 퇴장 및 Room 종료

```
Host 연결 해제
→ Host 재접속 1분 대기
→ 1분 내 복귀 시 Room 유지
→ 1분 초과 시 Room closed
→ 모든 Member 퇴장 처리
```

요구사항:

- Host가 일시적으로 연결이 끊겨도 즉시 Room을 종료하지 않는다.
- 1분 동안 Host 재접속을 기다린다.
- Host가 복귀하지 않으면 Room을 closed 처리한다.
- Host가 명시적으로 Room을 종료하면 모든 Member를 퇴장 처리한다.

---

## 18. 기능 요구사항

### 18.1 Auth

| ID       | 요구사항                                                     | 우선순위 |
| -------- | ------------------------------------------------------------ | -------- |
| AUTH-001 | 사용자는 Google 계정으로 로그인할 수 있어야 한다.            | Must     |
| AUTH-002 | 로그인한 사용자의 프로필 정보를 저장해야 한다.               | Must     |
| AUTH-003 | 사용자는 로그아웃할 수 있어야 한다.                          | Should   |
| AUTH-004 | 로그인하지 않은 사용자는 Room 생성/입장을 할 수 없어야 한다. | Must     |

### 18.2 Room

| ID       | 요구사항                                                           | 우선순위 |
| -------- | ------------------------------------------------------------------ | -------- |
| ROOM-001 | 사용자는 Room을 생성할 수 있어야 한다.                             | Must     |
| ROOM-002 | Room 생성자는 Host가 되어야 한다.                                  | Must     |
| ROOM-003 | Room 생성 시 초대 코드가 발급되어야 한다.                          | Must     |
| ROOM-004 | 사용자는 초대 코드 또는 링크로 Room에 입장할 수 있어야 한다.       | Must     |
| ROOM-005 | MVP Room은 기본적으로 Private Room이어야 한다.                     | Must     |
| ROOM-006 | Room은 추후 Public Room으로 확장 가능해야 한다.                    | Should   |
| ROOM-007 | Room에는 참여자 목록이 표시되어야 한다.                            | Must     |
| ROOM-008 | Room은 active, inactive, closed 상태를 가질 수 있어야 한다.        | Must     |
| ROOM-009 | 사용자는 최근 참여한 active Room 목록을 볼 수 있어야 한다.         | Must     |
| ROOM-010 | 사용자는 최근 Room 목록에서 active Room에 재입장할 수 있어야 한다. | Must     |
| ROOM-011 | Host는 Room을 종료할 수 있어야 한다.                               | Must     |
| ROOM-012 | Host가 연결 해제되면 1분 동안 재접속 대기 상태가 되어야 한다.      | Must     |
| ROOM-013 | Host가 1분 내 복귀하지 않으면 Room은 closed 처리되어야 한다.       | Must     |
| ROOM-014 | 마지막 활동 후 30일 이상 지난 Room은 inactive 처리되어야 한다.     | Should   |

### 18.3 Role & Permission

| ID       | 요구사항                                                        | 우선순위 |
| -------- | --------------------------------------------------------------- | -------- |
| ROLE-001 | Room 참여자는 Host, Member, Guest 중 하나의 역할을 가져야 한다. | Must     |
| ROLE-002 | MVP에서는 Host와 Member를 실제 역할로 사용한다.                 | Must     |
| ROLE-003 | Guest는 Public Room 확장을 위한 타입으로 준비한다.              | Should   |
| ROLE-004 | Host는 Room의 재생 상태를 제어할 수 있어야 한다.                | Must     |
| ROLE-005 | Member는 재생 상태를 제어할 수 없어야 한다.                     | Must     |
| ROLE-006 | Member는 Playlist에 곡을 추가할 수 있어야 한다.                 | Must     |
| ROLE-007 | Member는 본인이 추가한 곡을 삭제할 수 있어야 한다.              | Must     |
| ROLE-008 | Member는 다른 사용자가 추가한 곡을 삭제할 수 없어야 한다.       | Must     |
| ROLE-009 | Host는 모든 곡을 삭제할 수 있어야 한다.                         | Must     |
| ROLE-010 | Host는 Playlist 순서를 변경할 수 있어야 한다.                   | Must     |
| ROLE-011 | Member는 Playlist 순서를 변경할 수 없어야 한다.                 | Must     |
| ROLE-012 | Member는 채팅을 보낼 수 있어야 한다.                            | Must     |

### 18.4 Music Search & Link

| ID        | 요구사항                                                              | 우선순위 |
| --------- | --------------------------------------------------------------------- | -------- |
| MUSIC-001 | 사용자는 YouTube 영상을 검색할 수 있어야 한다.                        | Must     |
| MUSIC-002 | 검색 결과에는 제목, 채널명, 썸네일, 길이가 표시되어야 한다.           | Must     |
| MUSIC-003 | 사용자는 검색 결과에서 곡을 Playlist에 추가할 수 있어야 한다.         | Must     |
| MUSIC-004 | 사용자는 YouTube 링크를 입력해 곡을 추가할 수 있어야 한다.            | Must     |
| MUSIC-005 | 사용자는 YouTube Music 공유 링크를 입력해 곡을 추가할 수 있어야 한다. | Must     |
| MUSIC-006 | 시스템은 링크에서 `videoId`를 추출할 수 있어야 한다.                  | Must     |
| MUSIC-007 | 유효하지 않은 링크 입력 시 에러를 표시해야 한다.                      | Must     |
| MUSIC-008 | 재생 불가능한 영상은 에러 상태로 처리해야 한다.                       | Must     |

### 18.5 Playlist

| ID     | 요구사항                                                     | 우선순위 |
| ------ | ------------------------------------------------------------ | -------- |
| PL-001 | Room에는 공동 Playlist가 있어야 한다.                        | Must     |
| PL-002 | Host와 Member는 곡을 추가할 수 있어야 한다.                  | Must     |
| PL-003 | Host는 Playlist에서 모든 곡을 삭제할 수 있어야 한다.         | Must     |
| PL-004 | Member는 본인이 추가한 곡만 삭제할 수 있어야 한다.           | Must     |
| PL-005 | Host는 Playlist 순서를 변경할 수 있어야 한다.                | Must     |
| PL-006 | Playlist 변경 사항은 모든 참여자에게 실시간 반영되어야 한다. | Must     |
| PL-007 | 현재 재생 중인 곡이 표시되어야 한다.                         | Must     |
| PL-008 | 다음 곡이 표시되어야 한다.                                   | Must     |
| PL-009 | Playlist가 비어 있을 경우 Empty State를 표시해야 한다.       | Must     |

### 18.6 Player Sync

| ID       | 요구사항                                                                 | 우선순위 |
| -------- | ------------------------------------------------------------------------ | -------- |
| SYNC-001 | Host의 재생 이벤트가 서버 PlaybackState에 반영되어야 한다.               | Must     |
| SYNC-002 | Host의 일시정지 이벤트가 서버 PlaybackState에 반영되어야 한다.           | Must     |
| SYNC-003 | Host의 Seek 이벤트가 서버 PlaybackState에 반영되어야 한다.               | Must     |
| SYNC-004 | 현재 곡 변경이 모든 참여자에게 동기화되어야 한다.                        | Must     |
| SYNC-005 | 새로 입장한 사용자는 서버 기준 현재 재생 상태를 받아야 한다.             | Must     |
| SYNC-006 | 서버 절대 시간 기준으로 현재 재생 위치를 계산해야 한다.                  | Must     |
| SYNC-007 | 광고/버퍼링이 끝난 사용자는 현재 Room 시점으로 자동 보정되어야 한다.     | Must     |
| SYNC-008 | 기본 동기화 허용 오차는 2초로 설정한다.                                  | Must     |
| SYNC-009 | 재생 중에는 10초 주기로 동기화 오차를 검사해야 한다.                     | Must     |
| SYNC-010 | 동기화 허용 오차는 테스트 결과에 따라 1~3초 범위에서 조정 가능해야 한다. | Should   |
| SYNC-011 | 재생 실패 시 사용자에게 안내해야 한다.                                   | Must     |
| SYNC-012 | 수동 Sync 버튼은 제공하지 않는다.                                        | Must     |

### 18.7 Chat

| ID       | 요구사항                                              | 우선순위 |
| -------- | ----------------------------------------------------- | -------- |
| CHAT-001 | Room 참여자는 채팅 메시지를 보낼 수 있어야 한다.      | Must     |
| CHAT-002 | 메시지는 모든 참여자에게 실시간으로 표시되어야 한다.  | Must     |
| CHAT-003 | 메시지에는 작성자, 내용, 작성 시간이 포함되어야 한다. | Must     |
| CHAT-004 | MVP에서는 텍스트 메시지를 지원한다.                   | Must     |
| CHAT-005 | MVP에서는 시스템 메시지를 지원한다.                   | Must     |
| CHAT-006 | 이모지 리액션은 MVP에서 제외한다.                     | Could    |

### 18.8 Presence

| ID       | 요구사항                                                        | 우선순위 |
| -------- | --------------------------------------------------------------- | -------- |
| PRES-001 | Room 참여자 목록이 표시되어야 한다.                             | Must     |
| PRES-002 | 참여자의 온라인/오프라인 상태가 표시되어야 한다.                | Must     |
| PRES-003 | 사용자가 나가면 참여자 목록에서 상태가 갱신되어야 한다.         | Must     |
| PRES-004 | 재연결 시 기존 사용자 상태를 복구할 수 있어야 한다.             | Should   |
| PRES-005 | Host 연결 해제 상태를 Member에게 안내해야 한다.                 | Must     |
| PRES-006 | Host 재접속 대기 1분이 초과되면 Room 종료 상태를 안내해야 한다. | Must     |

### 18.9 Responsive UI

| ID     | 요구사항                                                               | 우선순위 |
| ------ | ---------------------------------------------------------------------- | -------- |
| UI-001 | 모든 화면은 반응형으로 구현되어야 한다.                                | Must     |
| UI-002 | Room Page는 모바일에서 Player, Playlist, Chat을 사용할 수 있어야 한다. | Must     |
| UI-003 | 모바일 Room Page는 탭 또는 접이식 패널 구조를 사용할 수 있다.          | Should   |
| UI-004 | Landing/Home/Room/Error 화면은 모바일에서 깨지지 않아야 한다.          | Must     |

### 18.10 Empty & Error

| ID      | 요구사항                                                     | 우선순위 |
| ------- | ------------------------------------------------------------ | -------- |
| ERR-001 | 존재하지 않는 Room 접근 시 페이지 단위 에러를 표시해야 한다. | Must     |
| ERR-002 | inactive Room 접근 시 입장 불가 안내를 표시해야 한다.        | Must     |
| ERR-003 | closed Room 접근 시 입장 불가 안내를 표시해야 한다.          | Must     |
| ERR-004 | 유효하지 않은 초대 코드 입력 시 에러를 표시해야 한다.        | Must     |
| ERR-005 | 빈 Playlist 상태를 표시해야 한다.                            | Must     |
| ERR-006 | 검색 결과 없음 상태를 표시해야 한다.                         | Must     |
| ERR-007 | 재생 불가능한 영상에 대한 안내를 표시해야 한다.              | Must     |
| ERR-008 | 실시간 네트워크 오류는 Toast로 안내해야 한다.                | Should   |
| ERR-009 | 권한 없는 동작은 Toast로 안내해야 한다.                      | Should   |

---

## 19. 비기능 요구사항

### 19.1 Performance

- Room 입장 후 초기 데이터 로딩은 가능한 빠르게 완료되어야 한다.
- 검색 요청은 debounce를 적용해 API 호출을 줄인다.
- Socket 이벤트는 필요한 데이터만 전송한다.
- 동기화 보정은 10초 주기를 기본으로 하여 과도하게 자주 발생하지 않도록 한다.
- 동기화 허용 오차는 기본 2초로 하되, 테스트 결과에 따라 조정 가능하게 구현한다.

### 19.2 Reliability

- 사용자의 네트워크가 일시적으로 끊겨도 재연결을 시도해야 한다.
- 재연결 시 현재 Room 상태를 다시 받아와야 한다.
- Host의 일시적 연결 해제를 고려해 1분 재접속 대기 상태를 제공한다.
- Host가 1분 안에 복귀하지 않으면 Room은 closed 처리되어야 한다.
- 영상 재생 실패 시 사용자 안내가 필요하다.
- 광고/버퍼링 이후 현재 Room 시점으로 자동 재동기화되어야 한다.

### 19.3 Usability

- 사용자는 Room 생성 후 초대 링크를 쉽게 복사할 수 있어야 한다.
- 현재 재생 곡, 다음 곡, 참여자, 채팅이 명확하게 보여야 한다.
- 채팅과 플레이리스트 UI는 Player를 방해하지 않아야 한다.
- 광고나 버퍼링으로 동기화가 지연될 경우 사용자가 상황을 이해할 수 있어야 한다.
- 최근 Room 목록을 통해 재입장 흐름이 자연스러워야 한다.
- 사용자가 직접 Sync 버튼을 누르지 않아도 자동으로 현재 Room 시점에 맞춰져야 한다.

### 19.4 Compatibility

- 데스크톱과 모바일 웹을 모두 지원한다.
- YouTube IFrame Player가 정상 동작하는 브라우저를 기준으로 한다.
- 모바일에서는 Player, Playlist, Chat을 모두 사용할 수 있어야 한다.

### 19.5 Policy & Safety

- YouTube 영상 또는 음원을 직접 저장하지 않는다.
- YouTube Player를 숨기거나 광고/로고/컨트롤을 제거하지 않는다.
- YouTube Music은 공유 링크에서 `videoId`를 추출하는 수준으로만 지원한다.
- YouTube Music 직접 API 연동은 하지 않는다.
- 광고를 제거하거나 우회하지 않는다.
- 공개방 모더레이션은 MVP에서 제외하되, 공개방 확장 시 별도 정책을 정의한다.

---

## 20. 데이터 모델 초안

```tsx
type User = {
  id: string;
  email: string;
  nickname: string;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
};

type RoomVisibility = 'private' | 'public';

type RoomStatus = 'active' | 'inactive' | 'closed';

type Room = {
  id: string;
  name: string;
  hostId: string;
  visibility: RoomVisibility;
  inviteCode: string;
  status: RoomStatus;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  closedAt?: string;
};

type RoomRole = 'host' | 'member' | 'guest';

type RoomMemberStatus = 'online' | 'offline' | 'left';

type RoomMember = {
  id: string;
  roomId: string;
  userId: string;
  role: RoomRole;
  status: RoomMemberStatus;
  joinedAt: string;
  lastSeenAt?: string;
  leftAt?: string;
};

type PlaylistItemStatus = 'available' | 'unavailable';

type PlaylistItem = {
  id: string;
  roomId: string;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration: string;
  order: number;
  addedBy: string;
  addedAt: string;
  status: PlaylistItemStatus;
};

type PlaybackState = {
  roomId: string;
  videoId?: string;
  playlistItemId?: string;
  baseCurrentTime: number;
  isPlaying: boolean;
  serverStartedAt?: string;
  serverPausedAt?: string;
  updatedAt: string;
  controlledBy: string;
};

type ChatMessageType = 'user' | 'system';

type ChatMessage = {
  id: string;
  roomId: string;
  userId?: string;
  type: ChatMessageType;
  message: string;
  createdAt: string;
};

type RecentRoom = {
  id: string;
  userId: string;
  roomId: string;
  lastJoinedAt: string;
};
```

---

## 21. Socket Event 초안

```tsx
// Room
'room:join';
'room:leave';
'room:closed';
'room:host-disconnected';
'room:host-reconnected';
'room:user-joined';
'room:user-left';

// Playback
'playback:play';
'playback:pause';
'playback:seek';
'playback:change-track';
'playback:next';
'playback:previous';
'playback:sync-response';
'playback:auto-resynced';
'playback:error';

// Playlist
'playlist:add';
'playlist:remove';
'playlist:reorder';
'playlist:updated';

// Chat
'chat:send';
'chat:received';
'chat:system';

// Presence
'presence:update';
```

---

## 22. 화면 목록

### 22.1 Landing Page

목적:

- 서비스 소개
- 로그인 유도

주요 요소:

- 서비스명
- 핵심 카피
- Google Login 버튼
- 주요 기능 소개

### 22.2 Home Page

목적:

- Room 생성
- 초대 코드 입력
- 최근 Room 재입장

주요 요소:

- Create Room 버튼
- Join Room 입력
- 최근 Room 목록
- 사용자 프로필

### 22.3 Room Page

목적:

- 음악 감상
- 플레이리스트 관리
- 채팅
- 참여자 확인
- 초대 링크 공유

주요 요소:

- YouTube Player
- 현재 재생 곡 정보
- Host 재생 컨트롤
- Playlist
- Search / Link Add
- Chat
- Participant List
- Invite Code / Invite Link
- 동기화 상태 표시
- 광고/버퍼링 후 자동 동기화 안내

### 22.4 Error / Empty State

필요 화면 또는 상태:

- Room not found
- Invalid invite code
- Inactive room
- Closed room
- Login required
- Playback unavailable
- Network disconnected
- Empty playlist
- Search no result
- Player loading
- Syncing after ad/buffering

---

## 23. 성공 지표

MVP 단계에서 측정 가능한 지표는 다음과 같다.

| 지표                  | 설명                                            |
| --------------------- | ----------------------------------------------- |
| Room 생성 수          | 사용자가 방을 생성하는지 확인                   |
| Room 입장 성공률      | 초대 코드/링크 기반 입장 흐름 검증              |
| 최근 Room 재입장 수   | Room 재입장 흐름이 사용되는지 확인              |
| 평균 참여자 수        | 공동 감상 경험이 실제로 사용되는지 확인         |
| Playlist 곡 추가 수   | 공동 Playlist 기능 사용 여부 확인               |
| 본인 추가 곡 삭제 수  | Member 삭제 정책 사용 여부 확인                 |
| Chat 메시지 수        | 음악 감상 중 대화가 발생하는지 확인             |
| 시스템 메시지 발생 수 | Room 상태 변화 전달 여부 확인                   |
| 재생 동기화 오류 수   | 실시간 동기화 안정성 확인                       |
| 자동 보정 발생 수     | 광고/버퍼링/네트워크 차이에 따른 보정 빈도 확인 |
| 영상 재생 실패율      | YouTube 기반 재생 안정성 확인                   |
| 모바일 사용 비율      | 반응형 대응 필요도 확인                         |

---

## 24. MVP 이후 추가 고려 사항

본 섹션은 MVP 범위에는 포함하지 않지만, 추후 서비스 확장 시 검토할 수 있는 항목을 정리한다.

### 24.1 Public Room

MVP에서는 비공개 Room만 구현한다.
다만 Room 모델에는 `private`, `public` 타입을 준비하여 추후 공개방 확장이 가능하도록 한다.

추후 고려 사항:

- 공개방 목록
- 공개방 검색
- 공개방 정렬
- 공개방 입장 정책
- 공개방 참여자 제한
- 공개방 카테고리
- 공개방 추천

### 24.2 Guest 역할 실제 사용

MVP에서는 `guest` 타입만 준비하고 실제 사용자 흐름에는 사용하지 않는다.

추후 공개방을 도입할 경우 Guest 역할을 다음과 같이 사용할 수 있다.

- 공개방 임시 참여자
- 제한된 채팅 권한 사용자
- 제한된 곡 추가 권한 사용자
- 로그인하지 않은 미리보기 사용자
- 모더레이션 대상 기본 역할

### 24.3 Public Room 모더레이션

공개방 기능이 도입될 경우 다음 모더레이션 정책이 필요하다.

- 사용자 신고
- 방 신고
- 채팅 메시지 신고
- 부적절한 곡 신고
- 사용자 차단
- Host의 강퇴 권한
- 채팅 제한
- 곡 추가 제한
- Guest 권한 제한

MVP에서는 공개방 자체를 구현하지 않으므로 모더레이션 기능도 제외한다.

### 24.4 inactive Room 복구

MVP에서는 inactive Room 재입장을 지원하지 않는다.
추후에는 사용자가 inactive Room을 다시 활성화할 수 있는 정책을 검토할 수 있다.

추후 고려 사항:

- Host만 inactive Room 복구 가능
- 기존 Member도 inactive Room 복구 가능
- inactive Room 복구 시 초대 코드 유지
- inactive Room 복구 시 Playlist 유지
- inactive Room 복구 시 채팅 히스토리 유지 여부

### 24.5 closed Room 히스토리

MVP에서는 closed Room을 최근 Room 목록에 노출하지 않는다.
추후에는 closed Room을 히스토리로 보여줄 수 있다.

추후 고려 사항:

- 닫힌 Room 목록
- Room 감상 기록
- 이전 Playlist 복사
- Room 재생성
- 채팅 히스토리 조회
- 즐겨찾기 Room

### 24.6 이모지 리액션

MVP에서는 텍스트 채팅과 시스템 메시지만 지원한다.
추후에는 이모지 리액션을 추가할 수 있다.

추후 고려 사항:

- 채팅 메시지 이모지 반응
- 현재 곡 이모지 반응
- 실시간 floating reaction
- 박수, 하트, 불꽃 등 빠른 반응 버튼

### 24.7 고급 동기화 정책

MVP에서는 서버 절대 시간 기준, 2초 허용 오차, 10초 주기 자동 보정을 사용한다.

추후 고도화 방향:

- 네트워크 지연 시간 측정
- 사용자별 offset 계산
- Room별 sync threshold 설정
- 부드러운 보정 방식 적용
- 자동 보정 빈도 최적화
- Host와 서버 상태 불일치 감지
- YouTube Player 상태별 세부 처리
- 부드러운 보정 방식 적용 (오차가 작을 경우 재생 속도 조절로 자연스럽게 따라잡기, 오차가 클 경우 즉시 seek)

### 24.8 친구 시스템

MVP에서는 초대 코드와 최근 Room 목록으로 Room 재입장 흐름을 제공한다.
추후에는 친구 시스템을 통해 초대와 재입장 경험을 강화할 수 있다.

추후 고려 사항:

- 친구 추가
- 친구 온라인 상태
- 친구에게 Room 초대
- 함께 들은 Room 기록
- 친구의 현재 감상 상태

### 24.9 추천 기능

MVP에서는 사용자가 직접 검색하거나 링크를 입력해 곡을 추가한다.
추후에는 추천 기능을 통해 공동 Playlist 경험을 강화할 수 있다.

추후 고려 사항:

- 현재 Playlist 기반 추천
- Room 참여자 취향 기반 추천
- 최근 추가 곡 기반 추천
- 인기곡 추천
- AI 기반 플레이리스트 추천

### 24.10 음성 채팅

MVP에서는 텍스트 채팅만 지원한다.
추후에는 음성 채팅을 도입해 실시간 감상 경험을 강화할 수 있다.

다만 음성 채팅은 WebRTC, 음성 품질, 권한, 음소거, 모더레이션 등 추가 설계가 필요하므로 MVP 범위에서는 제외한다.

### 24.11 모바일 UX 고도화

MVP에서는 모든 화면을 반응형으로 구현한다.
추후에는 모바일 사용성에 맞춘 별도 UX를 고도화할 수 있다.

추후 고려 사항:

- Room Page 모바일 탭 구조 개선
- Player 고정 영역
- Chat / Playlist 전환 UX
- 미니 플레이어
- PWA
- 모바일 알림

### 24.12 반복 재생

MVP에서는 Playlist의 마지막 곡이 종료되면 재생을 정지한다.

추후 고려 사항:

- Playlist 전체 반복 재생
- 현재 곡 단일 반복 재생
- 반복 재생 모드 전환 UI

---

## 25. 최종 요약

Syfity의 MVP는 비공개 Room과 초대 코드를 중심으로 시작한다.

핵심 기능은 Google Login, Room 생성/입장, 최근 Room 재입장, YouTube 검색 및 YouTube / YouTube Music 공유 링크 기반 곡 추가, 공동 Playlist, YouTube IFrame Player 기반 재생, 서버 시간 기반 실시간 동기화, 광고/버퍼링 후 자동 보정, Room 채팅, 시스템 메시지, 참여자 상태 표시이다.

MVP에서는 공개방, Guest 실제 사용, 신고/차단, 친구 시스템, 음성 채팅, AI 추천, 유료 기능, 수동 Sync 버튼은 제외한다. 다만 데이터 모델과 권한 구조는 추후 공개방 확장이 가능하도록 설계한다.

Syfity는 음악을 직접 제공하는 스트리밍 서비스가 아니라, YouTube Player 기반 재생 상태를 동기화하고 Room·Playlist·Chat 경험을 제공하는 웹 기반 소셜 리스닝 플랫폼이다.
