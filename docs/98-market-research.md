# 01. Market Research

# Syfity Market Research

## 1. 문서 목적

본 문서는 Syfity의 서비스 방향성을 정의하기 위해 기존 공동 감상 서비스와 소셜 음악 서비스의 시장 흐름, 경쟁 서비스, 사용자 반응, 기능적 한계를 분석하는 문서이다.

Syfity는 여러 사용자가 하나의 Room에 접속하여 같은 음악을 실시간으로 감상하고, 플레이리스트를 공동 관리하며, 채팅으로 소통하는 웹 기반 소셜 리스닝 플랫폼이다.

본 문서는 이후 PRD 작성의 근거 문서로 활용된다.

---

## 2. 서비스 정의

### 2.1 서비스 한 줄 정의

> Syfity는 여러 사용자가 하나의 Room에서 같은 음악을 실시간으로 듣고, 플레이리스트를 함께 관리하며, 채팅으로 소통하는 소셜 리스닝 플랫폼이다.

### 2.2 핵심 가치

- 같은 음악을 동시에 듣는 경험
- 함께 플레이리스트를 만드는 경험
- 음악을 들으며 대화하는 경험
- 친구들과 지속적으로 모이는 Room 경험
- 플랫폼 제약을 낮춘 웹 기반 공동 감상 경험

---

## 3. 시장 배경

기존 음악 스트리밍 서비스는 개인화 추천, 음질, 플레이리스트, 구독 모델을 중심으로 발전해왔다. 그러나 최근 음악 플랫폼은 개인 감상뿐 아니라 친구와의 공유, 실시간 감상, 메시징, 활동 표시 등 소셜 기능을 강화하는 방향으로 확장되고 있다.

Spotify는 Jam 기능을 통해 친구들과 실시간 공유 Queue를 만들 수 있게 했고, 이후 Messages, Listening Activity, Request to Jam 등 음악 공유와 소셜 기능을 계속 확장하고 있다. Apple은 SharePlay를 통해 FaceTime 중 음악과 영상을 동기화해 함께 감상할 수 있는 기능을 제공한다. Rave, Discord, AmpMe 역시 각각 공동 시청, 커뮤니티 기반 콘텐츠 감상, 여러 기기 동기화라는 방식으로 “함께 즐기는 미디어 경험”을 제공한다.

이러한 흐름은 사용자가 더 이상 음악을 단순히 혼자 소비하는 것이 아니라, 친구나 커뮤니티와 함께 공유하고 소통하는 경험을 원한다는 점을 보여준다.

Syfity는 이러한 시장 흐름 속에서 “같이 듣기”, “같이 고르기”, “같이 이야기하기”를 하나의 Room 안에서 제공하는 것을 목표로 한다.

---

## 4. 경쟁 서비스 선정

| 서비스                            | 선정 이유                                   |
| --------------------------------- | ------------------------------------------- |
| Spotify Jam                       | 가장 대표적인 공동 음악 감상 기능           |
| Apple SharePlay                   | Apple 생태계 기반 동시 감상 기능            |
| Rave                              | Room 기반 공동 영상/음악 감상 서비스        |
| Discord Activities / Spotify 연동 | 커뮤니티 기반 콘텐츠 감상 및 음악 공유 경험 |
| AmpMe                             | 여러 기기의 음악 재생 동기화 서비스         |

---

## 5. 경쟁 서비스 분석

## 5.1 Spotify Jam

### 개요

Spotify Jam은 사용자가 친구들과 하나의 공유 Queue를 만들고 실시간으로 음악을 함께 들을 수 있는 기능이다. Premium 사용자가 Jam을 시작할 수 있으며, 초대받은 사용자는 Queue에 곡을 추가할 수 있다. 초대는 QR 코드나 초대 링크를 통해 가능하며, Host는 기본적으로 곡 순서 변경이나 삭제 권한을 가진다. [S1][S8]

### 강점

- Spotify 음원 기반의 안정적인 음악 감상 경험
- 실시간 공유 Queue 제공
- QR 코드 및 링크 기반 초대
- 참여자가 곡을 추가할 수 있는 공동 감상 구조
- Host 중심의 Queue 관리
- Android Auto 등 다양한 환경으로 확장 중 [S9]

### 한계

- Jam 시작은 Premium 사용자에게 의존한다. [S1][S8]
- Spotify 앱과 계정 사용이 전제된다.
- Jam 자체는 음악 감상 중심이며, 채팅 경험이 강하게 통합되어 있지 않다.
- Room보다는 일회성 Session에 가깝다.
- TV 환경에서는 Jam QR 사이드바가 계속 표시되어 음악 비디오 감상 경험을 방해한다는 불만이 있다. [S7]
- Spotify Messages 추가에 대해 일부 사용자는 음악 앱이 채팅 앱처럼 되는 것을 원하지 않는다는 반응을 보였다. [S6]

### Syfity가 참고할 점

Spotify Jam은 “함께 듣기” 기능은 잘 제공하지만, 음악을 들으며 대화하고, 방 단위로 플레이리스트를 관리하는 경험은 상대적으로 약하다.

Syfity는 Spotify Jam과 달리 처음부터 Room, Playlist, Chat을 하나의 경험으로 설계해야 한다.

---

## 5.2 Apple SharePlay

### 개요

Apple SharePlay는 FaceTime 통화 중 Apple Music, Apple TV 등 지원 앱의 콘텐츠를 함께 감상할 수 있는 기능이다. 참여자 간 재생 상태가 동기화되고, 각 참여자가 재생 제어를 공유할 수 있다. [S10][S11]

### 강점

- FaceTime과 결합된 자연스러운 커뮤니케이션 경험
- 음악과 영상의 실시간 재생 동기화
- 참여자 간 공유 재생 컨트롤
- Apple 생태계 안에서 매끄러운 사용 경험

### 한계

- Apple 생태계 의존도가 높다.
- FaceTime 중심 경험이므로 독립적인 Room 서비스와는 다르다.
- 지속적인 음악 커뮤니티나 공동 플레이리스트 관리보다는 통화 중 공유 기능에 가깝다.
- 지원 앱과 구독 조건의 영향을 받는다.

### Syfity가 참고할 점

SharePlay는 동기화 품질과 통화 결합 경험이 강하지만, 플랫폼 제약이 크다. Syfity는 웹 기반으로 접근성을 높이고, FaceTime 없이도 Room에서 친구들과 음악을 함께 듣는 경험을 제공해야 한다.

---

## 5.3 Rave

### 개요

Rave는 사용자가 YouTube, Netflix 등 여러 플랫폼의 콘텐츠를 함께 감상하고 채팅할 수 있는 Watch Party 서비스이다. Rave는 여러 기기와 플랫폼에서 함께 보기 경험을 제공한다. [S12]

### 강점

- Room 기반 공동 감상 경험
- 채팅 기능 제공
- YouTube, Netflix 등 다양한 콘텐츠 소스 지원
- 여러 플랫폼에서 접근 가능

### 한계

- 음악 감상보다는 영상 공동 시청에 더 가깝다.
- 음악 플레이리스트 공동 관리 경험은 약하다.
- 여러 콘텐츠 플랫폼을 다루기 때문에 사용 흐름이 복잡해질 수 있다.
- 콘텐츠 플랫폼 및 앱스토어 정책 리스크가 존재할 수 있다. [S13]

### Syfity가 참고할 점

Rave는 Room과 Chat을 결합한 공동 감상 경험을 제공하지만, 음악 중심 UX는 약하다. Syfity는 많은 콘텐츠 유형을 다루기보다 음악 감상과 플레이리스트 공동 관리에 집중해야 한다.

---

## 5.4 Discord Activities / Spotify 연동

### 개요

Discord는 원래 게임 커뮤니케이션 서비스로 시작했지만, 현재는 음성 채팅, 텍스트 채팅, 서버, 커뮤니티 운영 기능을 제공하는 대표적인 커뮤니케이션 플랫폼이다. Spotify와의 연동을 통해 사용자의 현재 감상 곡을 표시하거나 친구와 음악을 공유하는 기능도 제공해왔다. [S17]

또한 과거 Discord에서는 YouTube 기반 음악 봇이 널리 사용되었으나, YouTube 약관 문제로 Groovy, Rythm 같은 주요 음악 봇이 종료되었고, 이후 Discord는 YouTube와 Watch Together 기능을 테스트했다. [S14][S15]

### 강점

- 실시간 채팅과 음성 커뮤니케이션에 강함
- 서버 기반 커뮤니티 구조
- 친구·커뮤니티와 함께 콘텐츠를 즐기는 문화가 이미 존재
- Spotify 연동을 통한 음악 공유 경험

### 한계

- 음악 감상 자체가 서비스의 중심은 아니다.
- 플레이리스트 공동 관리 기능은 제한적이다.
- 음악을 함께 듣기 위해서는 Discord 서버 또는 별도 연동이 필요하다.
- YouTube 음원을 우회 재생하는 봇 방식은 약관 리스크가 크다. [S14][S15]

### Syfity가 참고할 점

Discord는 소셜 커뮤니케이션에는 강하지만, 음악 플레이어와 공동 플레이리스트 관리 서비스는 아니다. Syfity는 Discord의 소셜 경험을 참고하되, 음악 감상과 Queue 관리가 중심이 되는 UI를 설계해야 한다.

---

## 5.5 AmpMe

### 개요

AmpMe는 여러 사용자의 스마트폰을 동기화하여 하나의 큰 스피커처럼 음악을 재생하는 파티형 서비스이다. 사용자는 Host 또는 Participant로 참여하고, Party Code를 통해 여러 기기를 동기화한다. [S16]

### 강점

- 여러 기기 동기화라는 명확한 사용 목적
- 파티나 모임 같은 오프라인 상황에 적합
- 코드 기반 참여 흐름
- 여러 스마트폰을 하나의 스피커처럼 활용하는 차별화된 경험

### 한계

- 음악 감상 커뮤니티라기보다는 스피커 확장 경험에 가깝다.
- 채팅, 플레이리스트 협업, 지속적인 Room 경험은 약하다.
- 네트워크 상태에 따라 동기화 품질이 영향을 받을 수 있다. [S16]
- 초기에는 지원 음악 소스가 제한적이었다. [S16]

### Syfity가 참고할 점

AmpMe는 “기기 간 소리 동기화”에 집중하지만, Syfity는 “사용자 간 음악 감상 경험 동기화”에 집중한다. Syfity의 핵심은 소리의 물리적 확장이 아니라, 친구들과 함께 듣고 대화하며 플레이리스트를 관리하는 온라인 Room 경험이다.

---

## 6. 기능 비교 매트릭스

| 항목                   | Spotify Jam | Apple SharePlay | Rave | Discord        | AmpMe | Syfity |
| ---------------------- | ----------- | --------------- | ---- | -------------- | ----- | ------ |
| 실시간 재생 동기화     | O           | O               | O    | △              | O     | O      |
| Room 기반 경험         | △           | X               | O    | 서버/채널 기반 | △     | O      |
| 공동 플레이리스트 관리 | △           | X               | △    | X              | △     | O      |
| 채팅                   | △           | FaceTime 기반   | O    | O              | X     | O      |
| 초대 코드/링크         | O           | O               | O    | 서버 초대      | O     | O      |
| 웹 접근성              | △           | △               | △    | O              | △     | O      |
| 플랫폼 제약 낮음       | X           | X               | △    | △              | △     | O      |
| 음악 감상 중심 UX      | O           | O               | △    | X              | △     | O      |
| 지속적인 공간성        | X           | X               | △    | O              | X     | O      |

---

## 7. 사용자 반응 및 리뷰 기반 인사이트

## 7.1 “함께 듣기” 기능은 수요가 있다

Spotify Jam은 친구들과 공유 Queue를 만들고 실시간으로 함께 듣는 기능으로 소개되었으며, 이후 Android Auto, Messages, Listening Activity, Request to Jam 등으로 확장되고 있다. 이는 음악 플랫폼이 공동 감상과 소셜 기능을 중요하게 보고 있음을 보여준다. [S1][S2][S3][S4][S5][S8][S9]

### 인사이트

Syfity의 “함께 듣기” 컨셉은 시장 흐름과 맞다. 단순 음악 플레이어가 아니라 소셜 리스닝 경험으로 포지셔닝해야 한다.

---

## 7.2 음악과 채팅의 결합은 필요하지만, 방식이 중요하다

Spotify Messages 추가에 대해 일부 사용자는 음악 앱이 채팅 앱처럼 되는 것을 원하지 않는다는 반응을 보였다. [S6]

이는 음악 서비스에 채팅 기능을 단순히 추가하는 방식이 사용자에게 거부감을 줄 수 있음을 보여준다.

### 인사이트

Syfity는 “기존 음악 앱에 채팅을 붙인 서비스”가 아니라, 처음부터 Room 기반 소셜 리스닝 서비스로 설계되어야 한다. 채팅 UI는 음악 감상을 방해하지 않고, Room 경험을 강화하는 방식이어야 한다.

---

## 7.3 초대와 참여 흐름은 단순해야 한다

Spotify Jam은 QR 코드와 링크 초대를 제공하지만, 이후 Request to Jam 기능이 추가되며 Jam 참여 흐름을 더 쉽게 만들고 있다. 이는 기존 QR/링크 중심 초대만으로는 충분하지 않을 수 있음을 보여준다. [S3][S4][S5]

### 인사이트

Syfity는 초대 코드와 링크 기반 입장을 제공하되, 사용자가 방을 만들고 친구를 초대하는 과정을 최대한 짧게 설계해야 한다.

---

## 7.4 소셜 기능은 감상 경험을 방해하지 않아야 한다

Spotify Jam의 TV UI에서는 QR 사이드바가 음악 비디오 감상 화면을 방해한다는 불만이 있었다. [S7]

### 인사이트

Syfity는 플레이어, 채팅, 플레이리스트, 참여자 목록을 한 화면에 배치하되, 현재 곡 감상을 방해하지 않는 레이아웃이 필요하다. 특히 모바일 화면에서는 플레이어와 채팅, 플레이리스트 간 우선순위 설계가 중요하다.

---

## 7.5 플랫폼 제약이 사용성을 제한한다

SharePlay는 Apple 생태계 안에서는 강력하지만, Apple 기기와 FaceTime 중심 흐름에 묶인다. Spotify Jam도 Spotify 계정과 Premium Host 조건에 영향을 받는다. [S1][S8][S10][S11]

### 인사이트

Syfity는 웹 기반 서비스로 접근성을 높이고, YouTube IFrame Player 기반으로 별도 음원 구독 없이 참여 가능한 구조를 목표로 한다.

---

## 7.6 음악 공동 감상과 커뮤니케이션은 분리되어 있는 경우가 많다

Spotify와 Discord는 음악 공유와 소셜 커뮤니케이션을 연결하려는 움직임을 보여왔지만, Discord는 커뮤니케이션이 중심이고 Spotify는 음악 감상이 중심이다. [S17]

### 인사이트

Syfity는 음악 감상과 채팅을 한 화면에서 자연스럽게 연결하는 중간 지점을 공략할 수 있다.

---

## 8. 공통 페인포인트

경쟁 서비스 분석과 사용자 반응을 종합하면 다음 페인포인트가 도출된다.

### 8.1 플랫폼 제약

Spotify Jam은 Spotify 사용 환경에, SharePlay는 Apple 생태계에 영향을 받는다. 서로 다른 기기와 플랫폼을 사용하는 사용자들이 함께 듣기에는 제약이 있다.

### 8.2 음악과 소통의 분리

기존 음악 서비스는 음악 감상에는 강하지만 대화 기능이 약하다. 반대로 Discord는 대화에는 강하지만 음악 플레이어와 플레이리스트 관리가 중심 기능은 아니다.

### 8.3 공동 플레이리스트 관리의 한계

대부분의 서비스는 Queue 추가 정도는 제공하지만, Room 단위로 플레이리스트를 관리하고 순서를 조정하며 현재 곡과 다음 곡을 함께 이해하는 경험은 부족하다.

### 8.4 지속적인 Room 경험 부족

Spotify Jam이나 SharePlay는 일회성 Session에 가깝다. 사용자가 반복적으로 들어와 친구들과 음악을 듣는 “지속적인 공간” 경험은 약하다.

### 8.5 UI 방해 요소

공동 감상 기능이 기존 플레이어에 덧붙는 경우, QR 패널이나 초대 UI가 감상 경험을 방해할 수 있다.

### 8.6 동기화 신뢰성

실시간 공동 감상 서비스에서 가장 중요한 경험은 “같은 순간을 함께 듣고 있다”는 감각이다. 네트워크 상태나 기기 차이로 재생 위치가 어긋나면 서비스의 핵심 가치가 약해진다.

---

## 9. 시장 기회

기존 서비스들은 각각 다음 중 하나에 강점을 가진다.

- 음악 스트리밍
- 공동 영상 시청
- 채팅
- 기기 동기화
- 커뮤니티

하지만 음악 감상, 공동 플레이리스트, 채팅, Room 경험, 실시간 동기화를 하나의 웹 서비스로 자연스럽게 결합한 서비스에는 여전히 빈틈이 있다.

Syfity는 이 지점을 공략한다.

> Syfity는 음악을 함께 재생하는 기능이 아니라,
> 친구들과 함께 음악을 듣고, 고르고, 이야기하는 Room 기반 소셜 리스닝 경험을 제공한다.

---

## 10. Syfity 차별화 전략

## 10.1 Room-first Listening

Syfity는 단발성 Session이 아니라 Room을 중심으로 설계한다. 사용자는 방을 만들고 친구를 초대하며, 같은 공간에서 음악을 듣고 채팅할 수 있다.

## 10.2 Playlist Collaboration

Syfity의 플레이리스트는 개인 Queue가 아니라 Room의 공동 플레이리스트이다. 참여자는 곡을 추가하고, 현재 재생 곡과 다음 곡을 함께 확인할 수 있다.

## 10.3 Music + Chat in One Screen

Syfity는 음악 플레이어와 채팅을 분리하지 않는다. 사용자는 음악을 들으면서 같은 화면에서 대화하고 반응할 수 있다.

## 10.4 Web-based Access

Syfity는 웹 기반 서비스를 목표로 하며, 특정 OS 생태계에 종속되지 않는 접근성을 제공한다.

## 10.5 Safe YouTube-based Playback

Syfity는 YouTube 콘텐츠를 직접 저장하거나 재배포하지 않고, 공식 YouTube IFrame Player를 기반으로 재생 상태만 동기화한다.

---

## 11. Product Principles

1. 누구나 쉽게 방을 만들고 참여할 수 있어야 한다.
2. 음악과 대화가 하나의 공간에서 자연스럽게 이루어져야 한다.
3. 플레이리스트는 개인이 아닌 Room의 공동 자산이어야 한다.
4. 실시간 동기화는 사용자가 의식하지 못할 정도로 자연스러워야 한다.
5. 소셜 기능은 음악 감상을 방해하지 않아야 한다.
6. 특정 플랫폼이나 구독 서비스에 대한 의존도를 낮춰야 한다.
7. YouTube 기반 재생은 공식 Player와 정책을 준수해야 한다.

---

## 12. PRD에 반영할 핵심 요구사항

### 12.1 Must Have

- Google Login
- Room 생성 및 입장
- 초대 코드 또는 초대 링크
- YouTube 검색
- YouTube / YouTube Music 공유 링크 기반 곡 추가
- YouTube IFrame Player 기반 재생
- 현재 곡 동기화
- 재생 / 일시정지 / Seek 동기화
- 공동 플레이리스트 추가 / 삭제 / 순서 변경
- 채팅
- 참여자 목록
- 온라인 상태 표시

### 12.2 Should Have

- Host / Guest 권한 구분
- 방 공개 / 비공개 설정
- 연결 끊김 및 재연결 처리
- 새로 입장한 사용자의 현재 상태 자동 동기화
- 빈 상태, 로딩, 에러 상태 처리
- 모바일 반응형 UI

### 12.3 Could Have

- 다음 곡 투표
- DJ 모드
- 이모지 리액션
- 방 히스토리
- 취향 기반 추천
- PWA
- 모바일 최적화
- 음악 취향 통계

---

## 13. 결론

시장 분석 결과, 기존 서비스들은 “함께 듣기” 또는 “함께 보기” 기능을 제공하지만, 음악 감상·공동 플레이리스트·채팅·Room 경험을 하나로 자연스럽게 결합하는 데에는 여전히 빈틈이 있다.

Syfity는 이 빈틈을 바탕으로 다음과 같이 정의할 수 있다.

> Syfity는 여러 사용자가 하나의 Room에서 같은 음악을 실시간으로 듣고, 플레이리스트를 함께 관리하며, 채팅으로 소통하는 웹 기반 소셜 리스닝 플랫폼이다.

---

# Appendix. References & Evidence

> 본 문서에서는 본문 가독성을 위해 `[S1]`, `[S2]` 형태의 출처 키를 사용한다.
> 각 출처의 실제 링크와 활용 근거는 아래 표에 정리한다.

| Key | 출처명                                                        | URL                                                                                                                                                                     | 출처 유형                 | 문서에서 활용한 근거                                                                                                                                                                                         |
| --- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1  | Spotify Jam 기능 소개 - Lifewire                              | https://www.lifewire.com/spotify-drops-jam-shared-playlist-7974743                                                                                                      | 기사 / 기능 설명          | Spotify Jam은 Premium 사용자가 Jam을 시작할 수 있고, 무료 사용자도 참여 가능하며, QR 코드나 초대 링크를 통해 참여할 수 있음. 참여자는 공유 Queue에 곡을 추가할 수 있고 Host는 곡 순서 변경·삭제 권한을 가짐. |
| S2  | Spotify Messages 기능 - The Verge                             | https://www.theverge.com/news/765771/spotify-messages-dms-audio-sharing-feature                                                                                         | 기사 / 제품 기능 분석     | Spotify가 앱 내 Direct Message 기능을 추가하여 음악, 팟캐스트, 오디오북을 공유할 수 있게 했음. Spotify가 음악 감상 경험에 소셜 기능을 확장하고 있다는 근거로 활용.                                           |
| S3  | Spotify Messages 기능 - Android Central                       | https://www.androidcentral.com/apps-software/spotify/spotify-gets-dms-messages-for-music-lovers-sharing-tracks-and-podcasts                                             | 기사 / 기능 설명          | Spotify Messages가 Jam, Blend, 공동 플레이리스트 등 기존 상호작용이 있는 사용자와 연결될 수 있다는 점을 근거로, 음악 플랫폼의 소셜화 흐름을 설명하는 데 활용.                                                |
| S4  | Spotify Request to Jam / Listening Activity - Android Central | https://www.androidcentral.com/apps-software/spotify/spotifys-dms-bring-the-friendship-with-jam-session-requests-listening-activities                                   | 기사 / 신규 기능 보도     | Spotify가 Messages 안에서 Request to Jam과 Listening Activity를 추가하며 친구의 음악 감상 활동과 공동 감상을 더 쉽게 연결하려는 흐름을 보여줌.                                                               |
| S5  | Spotify Listening Activity / Request to Jam - Times of India  | https://timesofindia.indiatimes.com/technology/tech-news/spotify-adds-listening-activity-and-request-to-jam-features-heres-how-they-work/articleshow/126399955.cms      | 기사 / 신규 기능 보도     | Spotify가 실시간 감상 활동 공유와 Jam 요청 기능을 추가했다는 보조 근거. 공동 감상과 소셜 기능이 음악 플랫폼의 주요 확장 방향임을 설명하는 데 활용.                                                           |
| S6  | Spotify Messages 사용자 반응 - The Sun                        | https://www.thesun.co.uk/tech/36444898/spotify-messages-whatsapp-rival/                                                                                                 | 기사 / 사용자 반응        | 일부 Spotify 사용자가 Messages 기능을 불필요한 소셜 기능으로 받아들였다는 반응을 근거로, 소셜 기능은 음악 감상을 방해하지 않는 방식으로 설계되어야 한다는 인사이트 도출.                                     |
| S7  | Spotify Jam Apple TV UI 이슈 - TechRadar                      | https://www.techradar.com/audio/spotify/never-thought-id-see-the-day-spotify-users-are-pleasantly-surprised-with-its-latest-apple-tv-update-but-one-issue-still-remains | 기사 / 사용자 불만 사례   | Apple TV에서 Spotify Jam QR 사이드바가 음악 비디오 감상 경험을 방해한다는 불만을 근거로, Syfity의 채팅·초대·플레이리스트 UI가 플레이어 경험을 방해하지 않아야 한다는 근거로 활용.                            |
| S8  | Spotify Jam 사용법 - Lifewire                                 | https://www.lifewire.com/listen-to-spotify-with-friends-5120356                                                                                                         | 기사 / 사용법 설명        | Jam은 최대 32명까지 참여 가능하고, Spotify 자체 채팅 기능이 없어 별도 앱이 필요하다는 설명. Syfity의 내장 채팅 필요성을 설명하는 데 활용.                                                                    |
| S9  | Spotify Jam Android Auto 확장 - Android Central               | https://www.androidcentral.com/apps-software/android-auto/spotify-jam-arrives-on-android-auto-via-an-update                                                             | 기사 / 플랫폼 확장 사례   | Spotify Jam이 Android Auto에 확장되어 차량 내 QR 기반 공동 Queue 경험을 제공한다는 사례. 공동 음악 감상이 모바일 밖의 사용 맥락으로 확장되고 있다는 근거로 활용.                                             |
| S10 | Apple SharePlay 기능 설명 - Lifewire                          | https://www.lifewire.com/what-is-shareplay-5189440                                                                                                                      | 기사 / 기능 설명          | SharePlay가 FaceTime 중 음악·영상·화면 공유를 동기화하고, 참여자들이 재생 컨트롤을 공유할 수 있다는 점을 근거로 활용.                                                                                        |
| S11 | Apple SharePlay 사용법 - Wired                                | https://www.wired.com/story/how-to-use-shareplay-apple-iphone-ipad-mac                                                                                                  | 기사 / 사용 흐름 설명     | FaceTime 중 SharePlay를 시작하고, 지원 앱 콘텐츠를 함께 감상하며, 참여자가 공유 컨트롤을 사용할 수 있다는 사용 흐름을 설명하는 보조 근거.                                                                    |
| S12 | Rave 공동 시청 기능 - Lifewire                                | https://www.lifewire.com/screen-share-on-netflix-5194140                                                                                                                | 기사 / 서비스 사용법      | Rave가 Netflix, YouTube 등 콘텐츠를 함께 보고 채팅할 수 있는 Watch Party 앱으로 소개됨. Room 기반 공동 감상과 채팅이 결합된 경쟁 서비스 분석에 활용.                                                         |
| S13 | Rave 플랫폼 정책 리스크 - Reuters                             | https://www.reuters.com/world/rave-files-antitrust-lawsuit-against-apple-over-removal-video-sharing-app-from-2026-05-07/                                                | 뉴스 / 플랫폼 정책 리스크 | Rave가 App Store 제거와 관련해 Apple을 상대로 소송을 제기했다는 사례. 공동 감상 서비스가 콘텐츠 플랫폼 및 앱스토어 정책 리스크를 고려해야 한다는 근거로 활용.                                                |
| S14 | Discord / YouTube 음악 봇 이슈 - Wikipedia: Discord           | https://en.wikipedia.org/wiki/Discord                                                                                                                                   | 백과 / 사건 요약          | Groovy, Rythm 등 YouTube 기반 Discord 음악 봇이 YouTube 약관 문제로 종료되었고, 이후 Discord가 YouTube Watch Together 기능을 테스트했다는 흐름을 참고.                                                       |
| S15 | Rythm 음악 봇 종료 이슈 - Wikipedia: Rythm                    | https://en.wikipedia.org/wiki/Rythm_%28software%29                                                                                                                      | 백과 / 사건 요약          | Rythm이 YouTube 약관 위반 및 상업적 사용 문제로 종료되었다는 사례. Syfity가 YouTube 음원 추출이나 비공식 재생 방식을 피해야 한다는 근거로 활용.                                                              |
| S16 | AmpMe 서비스 소개 - Wired                                     | https://www.wired.com/2015/09/turn-handful-phones-speaker-system-app                                                                                                    | 기사 / 서비스 소개        | AmpMe가 여러 스마트폰을 동기화하여 하나의 큰 스피커처럼 음악을 재생하는 파티형 서비스라는 설명. Syfity와 AmpMe의 차이를 “기기 동기화”와 “사용자 경험 동기화”로 구분하는 데 활용.                             |
| S17 | Spotify와 Discord 연동 - Axios                                | https://www.axios.com/2018/02/01/spotify-and-chat-app-discord-team-up-to-make-music-more-social                                                                         | 기사 / 서비스 연동 사례   | Spotify와 Discord가 음악 공유를 더 소셜하게 만들기 위해 연동했다는 사례. 음악 감상과 커뮤니케이션 플랫폼의 결합 수요를 설명하는 근거로 활용.                                                                 |

---

## Source Usage Notes

### 1. 공식 문서와 기사 출처의 구분

본 문서는 시장 조사 목적이므로 공식 문서뿐 아니라 제품 리뷰, 사용자 반응 보도, 서비스 분석 기사도 함께 활용한다.

- 공식 문서 / 공식 기능 설명: 서비스 기능의 객관적 정의에 활용
- 제품 리뷰 / 사용법 기사: 실제 사용 흐름과 UX 분석에 활용
- 사용자 반응 보도: 페인포인트와 사용자 수용성 분석에 활용
- 플랫폼 정책 사례: 구현 리스크 및 제품 방향성 검토에 활용

---

### 2. 사용자 리뷰 분석의 한계

본 문서의 사용자 반응 분석은 공개 기사, 커뮤니티 반응 보도, 서비스 사용 후기 기반의 1차 시장 조사이다.

추후 PRD 또는 UX Case Study 단계에서는 다음 출처를 추가로 조사할 수 있다.

- App Store 리뷰
- Google Play 리뷰
- Reddit 사용자 게시글
- Spotify Community
- Discord Community
- Product Hunt 리뷰
- YouTube Music / Spotify 관련 사용자 포럼

---

### 3. PRD 반영 방식

시장 조사에서 확인한 주요 근거는 다음과 같이 PRD 기능 요구사항으로 연결한다.

| 근거                                                      | PRD 반영 방향                                             |
| --------------------------------------------------------- | --------------------------------------------------------- |
| Spotify Jam은 함께 듣기 기능은 강하지만 채팅 경험이 약함  | Room 내 Chat 기능을 Must Have로 정의                      |
| Spotify Jam은 Queue 공유 중심                             | Syfity는 Room 단위 공동 Playlist 관리로 확장              |
| SharePlay는 Apple 생태계 의존                             | Syfity는 웹 기반 접근성을 강조                            |
| Rave는 공동 감상과 채팅은 강하지만 음악 특화 UX가 약함    | Syfity는 음악 감상 중심 UI와 Playlist UX에 집중           |
| Discord는 커뮤니케이션은 강하지만 음악 관리가 중심이 아님 | Syfity는 음악 플레이어와 채팅을 같은 화면에 배치          |
| AmpMe는 기기 동기화 중심                                  | Syfity는 사용자 간 감상 경험 동기화에 집중                |
| Spotify Messages에 대한 일부 부정 반응                    | 채팅은 음악 감상을 방해하지 않는 보조 경험으로 설계       |
| Spotify Jam TV UI 이슈                                    | 초대·채팅·플레이리스트 UI가 플레이어를 가리지 않도록 설계 |
