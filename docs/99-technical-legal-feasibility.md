# Technical & Legal Feasibility Review

## 문서 목적

본 문서는 Syfity 프로젝트에서 YouTube 기반 음악 동시 감상 기능을 구현할 때 발생할 수 있는 저작권, 플랫폼 약관, 기술적 제약을 사전에 검토하기 위한 문서이다.

Syfity는 여러 사용자가 하나의 Room에 접속하여 같은 음악을 실시간으로 감상하고, 플레이리스트를 공동 관리하며, 채팅으로 소통하는 웹 서비스이다.

본 프로젝트는 YouTube Data API와 YouTube IFrame Player API를 활용할 예정이므로, 서비스 설계 단계에서 YouTube API 약관 및 저작권 관련 제약을 명확히 정의할 필요가 있다.

---

## 1. 핵심 결론

Syfity는 다음 조건을 지키는 경우 구현 가능성이 높다.

### 허용 가능한 방향

- YouTube Data API를 사용하여 영상 검색 및 메타데이터 조회
- YouTube IFrame Player API를 사용하여 각 사용자 브라우저에서 직접 영상 재생
- 서버는 실제 음원이나 영상 파일을 전달하지 않고, `videoId`, `currentTime`, `isPlaying`, `playlistOrder` 같은 상태 정보만 동기화
- 플레이리스트에는 YouTube 영상의 식별자와 메타데이터만 저장
- 채팅, 방 생성, 초대 코드, 참여자 목록 등 Syfity의 자체 소셜 기능 제공
- 사용자가 입력한 YouTube 또는 YouTube Music 공유 링크에서 `videoId`를 추출한 뒤, 공식 YouTube IFrame Player로 재생

### 피해야 하는 방향

- YouTube 영상을 서버에 다운로드
- YouTube 영상을 MP3로 추출
- 영상이나 음원 파일을 자체 서버 또는 CDN에 저장
- YouTube Player를 숨기고 오디오만 재생
- YouTube 광고, 로고, 링크, 컨트롤을 임의로 차단 또는 제거
- YouTube 콘텐츠를 오프라인 재생 가능하게 제공
- YouTube Music의 비공개 API를 분석하거나 사용하는 방식
- YouTube Music을 대체하는 음악 스트리밍 서비스처럼 보이는 제품 포지셔닝

---

## 2. 서비스의 법적·기술적 포지셔닝

Syfity는 음악 스트리밍 서비스가 아니다.

Syfity는 YouTube에 업로드된 콘텐츠를 각 사용자 브라우저의 YouTube IFrame Player를 통해 재생하고, 사용자 간 재생 상태를 Socket.io로 동기화하는 소셜 리스닝 서비스이다.

따라서 서비스의 핵심 정의는 다음과 같다.

> Syfity는 음원을 제공하는 서비스가 아니라,
> YouTube Player 기반의 재생 상태를 동기화하고, Room·Playlist·Chat 경험을 제공하는 실시간 소셜 리스닝 플랫폼이다.

---

## 3. YouTube Music 활용 가능성

YouTube Music은 음악 감상 서비스로서 Syfity와 유사한 사용 맥락을 가지고 있지만, 현재 설계에서 직접적인 YouTube Music API 연동은 권장하지 않는다.

### 3.1 직접 연동이 어려운 이유

- YouTube Music 전용 공개 API를 공식적으로 사용할 수 있는 형태로 확인하기 어렵다.
- YouTube Music 웹 앱의 내부 요청을 분석하거나 비공식 API를 사용하는 방식은 정책 위반 위험이 있다.
- YouTube Music의 음원을 오디오만 분리하거나 자체 플레이어처럼 재생하는 방식은 피해야 한다.
- YouTube Music Premium 기능인 백그라운드 재생, 오디오 전용 재생, 광고 제거, 오프라인 재생 등을 Syfity가 우회 제공해서는 안 된다.

### 3.2 가능한 활용 방식

YouTube Music을 직접 연동하는 대신, 다음 방식은 고려할 수 있다.

#### 1. YouTube Music 공유 링크 입력 지원

사용자가 YouTube Music에서 공유한 링크가 다음과 같은 형태라면,

```text
https://music.youtube.com/watch?v={videoId}
```

Syfity는 URL에서 `videoId`만 추출하여 YouTube IFrame Player에 전달할 수 있다.

```ts
type ExternalMusicUrl = {
  source: 'youtube' | 'youtube-music';
  originalUrl: string;
  videoId: string;
};
```

이 방식은 YouTube Music API를 사용하는 것이 아니라, 사용자가 제공한 URL에서 YouTube 영상 식별자를 추출해 공식 YouTube Player로 재생하는 방식이다.

#### 2. YouTube 검색 결과를 음악 중심으로 보여주기

YouTube Data API의 검색 기능을 사용하되, UI에서 음악 검색 경험에 맞게 결과를 정리한다.

예시:

- 곡 제목
- 아티스트명 또는 채널명
- 썸네일
- 영상 길이
- 공식 뮤직비디오 여부
- 라이브/커버/가사 영상 여부

단, 검색 결과 자체를 YouTube 결과가 아닌 것처럼 보이게 하거나, YouTube 출처를 숨기면 안 된다.

#### 3. YouTube Music 스타일 UX 참고

Syfity는 YouTube Music의 UX를 직접 복제하지 않고, 음악 감상에 적합한 자체 UI를 설계한다.

가능한 방향:

- 현재 재생 중인 곡 강조
- Queue 중심 UI
- Room 단위 공동 플레이리스트
- 채팅과 플레이어의 동시 배치
- 친구들과 함께 듣는 경험에 맞춘 실시간 상태 표시

---

## 4. 권장 아키텍처

### 4.1 안전한 재생 구조

```text
User Browser
  ↓
YouTube IFrame Player
  ↓
YouTube

Syfity Server
  ↓
videoId / currentTime / play / pause / seek / playlist event
```

각 사용자는 자신의 브라우저에서 YouTube Player를 통해 영상을 재생한다.

Syfity 서버는 영상 파일이나 음원 파일을 전달하지 않는다. 서버는 현재 방의 상태와 재생 명령만 관리한다.

---

## 5. 저장 가능한 데이터와 저장하면 안 되는 데이터

### 5.1 저장 가능

```ts
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
};
```

저장 가능한 정보:

- `videoId`
- 영상 제목
- 채널명
- 썸네일 URL
- 영상 길이
- 플레이리스트 순서
- 추가한 사용자
- 추가 시각

---

### 5.2 저장하면 안 되는 데이터

- 영상 파일
- 음원 파일
- 추출된 MP3 파일
- YouTube 영상 원본 데이터
- YouTube Music 내부 API 응답 데이터
- YouTube 사용자 비밀번호
- YouTube 인증 과정에서 표시되는 민감 정보
- YouTube Player 내부 정보를 우회적으로 수집한 데이터

---

## 6. 브랜드 및 UI 주의사항

Syfity는 YouTube를 기반으로 음악을 재생하지만, YouTube 또는 YouTube Music의 공식 서비스처럼 보이면 안 된다.

### 6.1 서비스명

서비스명에 다음 표현을 사용하지 않는다.

- YouTube
- YT
- You-Tube
- YouTube Music
- YouTube Room
- YouTube Jam

서비스명은 `Syfity`를 사용한다.

### 6.2 UI

- YouTube 로고를 Syfity 서비스 로고처럼 사용하지 않는다.
- YouTube Player가 표시되는 영역에서는 YouTube 콘텐츠임을 사용자가 알 수 있어야 한다.
- YouTube 브랜드 요소를 임의로 수정하지 않는다.
- Syfity 자체의 브랜드와 YouTube 출처 표시를 구분한다.

---

## 7. MVP 구현 권장 범위

### 7.1 포함

- Google Login
- Room 생성
- 초대 코드 입장
- YouTube 검색
- YouTube / YouTube Music 공유 링크 입력
- YouTube IFrame Player 재생
- 플레이리스트 추가/삭제/순서 변경
- Host 기반 재생 제어
- 재생/일시정지/Seek/곡 변경 동기화
- 채팅
- 참여자 목록
- 접속 상태 표시

---

### 7.2 제외

- MP3 추출
- 자체 음원 업로드
- 자체 오디오 스트리밍
- YouTube Player 숨김 재생
- 백그라운드 오디오 전용 재생
- 광고 제거
- YouTube Music 비공식 API 사용
- YouTube Music 계정/보관함/플레이리스트 직접 연동
- Public Room 추천 피드
- 유료 방
- 음성 채팅
- AI 음악 추천

---

## 8. 최종 판단

Syfity는 YouTube IFrame Player API와 YouTube Data API를 올바르게 사용하는 경우 구현 가능성이 높다.

다만 서비스는 반드시 다음 원칙을 지켜야 한다.

1. 음원이나 영상 파일을 직접 제공하지 않는다.
2. YouTube Player를 숨기거나 변형하지 않는다.
3. 광고, 로고, 링크, Player 기능을 차단하지 않는다.
4. 서버는 콘텐츠가 아니라 재생 상태만 동기화한다.
5. 플레이리스트에는 videoId와 메타데이터만 저장한다.
6. YouTube Music의 비공식 API나 내부 요청을 사용하지 않는다.
7. YouTube Music 공유 링크는 videoId 추출 용도로만 제한적으로 지원한다.
8. 실제 서비스 출시 또는 수익화 시에는 YouTube API 정책과 음악 저작권 라이선스를 별도 검토한다.

따라서 Syfity의 안전한 제품 정의는 다음과 같다.

> Syfity는 YouTube 콘텐츠를 직접 배포하는 음악 스트리밍 서비스가 아니라,
> YouTube IFrame Player 기반 재생 상태를 실시간으로 동기화하고, Room·Playlist·Chat 경험을 제공하는 소셜 리스닝 서비스이다.
