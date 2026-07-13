# Search 통합 입력 및 곡 추가 Toast 설계

## 배경

GitHub 이슈 #52는 Room의 곡 추가 화면에서 Playlist 추가 성공·실패를 기존 Toast UI로 알려 주는 작업이다. 1차 구현 검토 후 다음 사용자 피드백을 최종 요구사항에 반영한다.

- 데스크톱 Toast는 곡 추가 다이얼로그 위를 덮지 않고 화면 오른쪽 아래에 표시한다.
- 모바일 Toast는 현재의 화면 하단 중앙 배치를 유지한다.
- `검색`과 `링크` 탭을 제거하고 하나의 입력창에서 검색어와 YouTube 링크를 모두 받는다.
- 일반 텍스트는 기존처럼 자동 검색하고, 링크는 검색 API를 호출하지 않은 채 직접 추가할 수 있게 한다.

Figma Toast의 색상, 아이콘, 메시지, 닫기 버튼 구조와 Storybook의 공용 Toast primitive를 계속 기준으로 사용한다.

## 목표

- Playlist 추가 성공 시 `플레이리스트에 추가했어요 🎵` Toast를 표시한다.
- 실패 시 `getPlaylistErrorMessage()`가 반환한 사용자용 메시지를 표시한다.
- 데스크톱에서는 화면 우하단, 모바일에서는 화면 하단 중앙에 Toast를 표시한다.
- Toast가 다이얼로그의 transform·overflow에 종속되거나 잘리지 않게 한다.
- 단일 입력창에서 검색어와 절대 URL을 구분한다.
- 일반 텍스트는 350ms debounce 검색을 유지한다.
- URL은 검색 요청을 중단하고 `링크 추가` CTA 및 Enter 제출을 제공한다.
- 공용 Toast, Search API, Playlist API, playlist mutation hook은 변경하지 않는다.

## 비목표

- 새로운 전역 Toast context 또는 Toast queue를 만들지 않는다.
- 공용 `Toast.tsx`의 API나 스타일을 변경하지 않는다.
- 프론트에서 YouTube URL의 최종 유효성을 확정하지 않는다. 서버가 기존 `PLAYLIST_INVALID_URL` 경로로 검증한다.
- Playlist 추가 성공 후 곡 추가 패널을 닫거나 입력값을 자동으로 지우지 않는다.
- YouTube Music 등 현재 백엔드가 받지 않는 URL 형식을 새로 지원하지 않는다.

## 검토한 접근

### 1. 입력값을 클라이언트에서 검색어와 URL로 분기 — 채택

절대 URL로 파싱되는 입력은 검색 훅에 빈 문자열을 전달해 검색을 끄고, 기존 `onAddUrl` 경로로 보낸다. 일반 텍스트는 기존 검색 훅을 그대로 사용한다. API 변경 없이 사용자가 기대하는 단일 입력 UX를 제공할 수 있어 가장 작고 안전하다.

### 2. 검색 API가 검색어와 URL을 모두 처리

서버 API 계약과 에러 처리를 바꿔야 하고 이슈 #52 범위를 벗어난다. Playlist API가 이미 URL 검증을 담당하므로 중복이다.

### 3. 탭을 숨기고 내부 상태만 유지

화면에는 단일 입력처럼 보여도 이중 상태와 분기 UI가 남아 유지보수가 어렵다. 탭 제거 요구에도 정확히 부합하지 않아 채택하지 않는다.

## 컴포넌트 구조

### RoomPageClient

`RoomPageClient`는 계속 `useAddPlaylistItem(roomId)` mutation과 Toast 피드백 상태를 소유한다. 검색 결과 추가는 `{ videoId }`, 링크 추가는 `{ youtubeUrl }`을 동일 helper에 전달한다. 성공·실패 callback, 고유 Toast ID, 패널 닫기 시 reset 동작은 유지한다.

### SearchPanel 통합 입력

- `AddMode`, `Tabs`, 별도 `youtubeUrl` 상태를 제거한다.
- 기존 `query` 하나를 검색어와 URL의 공통 입력값으로 사용한다.
- placeholder는 `YouTube 영상 검색 또는 링크 붙여넣기`로 변경한다.
- `http://` 또는 `https://` 절대 URL로 파싱되면 URL 모드로 본다.
- URL 모드에서는 `useYoutubeSearchQuery('')`가 되어 검색 API를 호출하지 않는다.
- 결과 영역에는 입력한 URL과 `링크 추가` CTA를 표시한다.
- URL 모드에서 Enter 또는 CTA 클릭 시 trim한 값을 `onAddUrl`에 전달한다.
- 일반 텍스트는 기존 debounce, 로딩, 오류, 빈 결과, 검색 결과 목록을 유지한다.
- URL의 YouTube 지원 여부와 video ID 유효성은 기존 Playlist API가 판정하며, 실패는 Toast로 안내한다.

### SearchPanel 다이얼로그 레이어

`DialogPrimitive.Content`를 화면 전체를 덮는 비변형·overflow-visible 접근성 wrapper로 만든다. 기존 바텀시트/데스크톱 모달의 크기, 배경, transform, animation, `overflow-hidden`은 내부 visual surface로 옮긴다.

wrapper의 자식은 다음 두 형제다.

1. visual surface: 헤더, 통합 입력, 검색 결과 또는 링크 CTA
2. feedback: `SearchAddToast`

이 구조는 Toast를 Radix Dialog의 접근 가능한 subtree 안에 두면서도, fixed viewport가 visual surface의 transform/overflow에 묶이지 않게 한다.

### SearchAddToast

기존 공용 `ToastProvider`, `Toast`, `ToastViewport`, `ToastIcon`, `ToastTitle`, `ToastClose`만 조합한다.

- 모바일: 기존 하단 중앙, safe-area 여백 유지
- 데스크톱: `left`와 중앙 translate를 해제하고 화면 오른쪽 아래에 24px 간격으로 배치
- `duration={4000}`, 아래 방향 swipe, 수동 닫기 유지
- 성공은 `type="background"`, 실패는 `type="foreground"`로 Radix의 단일 live announcement 우선순위를 사용
- visible Toast root에 별도 `role="status"`/`role="alert"`를 넣지 않아 중복 안내를 방지
- Provider와 Viewport label은 한국어로 지정

## 데이터 흐름

### 검색어

1. 사용자가 일반 텍스트를 입력한다.
2. 350ms debounce 후 기존 Search API를 호출한다.
3. 결과의 `추가` 버튼을 누르면 `{ videoId }`로 Playlist mutation을 실행한다.
4. 성공 또는 실패 Toast를 표시하고 SearchPanel은 열린 상태를 유지한다.

### 링크

1. 사용자가 절대 URL을 입력하거나 붙여넣는다.
2. 검색 훅에는 빈 문자열을 전달해 Search API 요청을 막는다.
3. `링크 추가` CTA 또는 Enter로 trim한 URL을 `{ youtubeUrl }`로 전달한다.
4. Playlist API가 URL을 최종 검증한다.
5. 성공은 고정 성공 메시지, 실패는 기존 오류 매핑 Toast로 표시한다.

## 오류 및 경쟁 조건

- URL처럼 보이지 않는 문자열은 검색어로 처리한다.
- 절대 URL이지만 지원하지 않는 링크는 Playlist API의 `PLAYLIST_INVALID_URL`을 통해 안내한다.
- 추가 요청 중에는 결과 추가 버튼과 링크 CTA를 비활성화한다.
- 새 추가 요청을 시작할 때 이전 Toast를 교체한다.
- 패널을 닫으면 mutation observer와 Toast 상태를 reset해 늦게 완료된 요청이 Toast를 되살리지 않게 한다.
- 패널을 다시 열어도 이전 피드백은 보이지 않는다.

## 테스트 전략

### SearchPanel

- 탭이 사라지고 단일 placeholder가 표시된다.
- 일반 텍스트는 기존 debounce 검색 훅으로 전달된다.
- 절대 URL은 검색 훅에 빈 문자열을 전달한다.
- URL 모드에 `링크 추가` CTA가 표시되고 클릭/Enter가 trim한 URL을 전달한다.
- pending 중 CTA와 결과 추가 버튼이 비활성화된다.
- 검색 로딩·오류·빈 결과·결과 목록 회귀를 유지한다.
- Dialog wrapper에는 transform/overflow가 없고 visual surface에만 기존 레이아웃 클래스가 있는지 확인한다.

### SearchAddToast

- 성공·실패 variant, 아이콘, 메시지, 닫기 버튼을 확인한다.
- visible root에 중복 live role이 없고 Radix announcement가 한 번만 생성되는지 확인한다.
- 실패는 foreground, 성공은 background 우선순위를 사용한다.
- 4초 자동 닫기와 수동 닫기를 확인한다.
- 모바일 하단 중앙 및 데스크톱 우하단 responsive class를 확인한다.

### RoomPageClient

- 검색 결과와 링크 추가가 기존 request body를 유지한다.
- 두 경로의 성공·실패 Toast와 패널 유지 동작을 확인한다.
- 패널 닫기 후 Toast 제거와 재오픈 시 stale feedback 부재를 확인한다.

## 예상 변경 파일

- `apps/frontend/src/features/search/components/SearchAddToast.tsx`
- `apps/frontend/src/features/search/components/SearchAddToast.test.tsx`
- `apps/frontend/src/features/search/components/SearchPanel.tsx`
- `apps/frontend/src/features/search/components/SearchPanel.test.tsx`
- `apps/frontend/src/app/(protected)/room/[roomId]/RoomPageClient.test.tsx`
- `docs/superpowers/specs/2026-07-10-search-add-toast-design.md`

`RoomPageClient.tsx`, 공용 Toast, Search API, Playlist API, playlist hook은 인터페이스가 이미 충분하므로 변경하지 않는다.

## 완료 기준

- 데스크톱 Toast가 다이얼로그를 덮지 않고 화면 오른쪽 아래에 표시된다.
- 모바일 Toast는 기존 하단 중앙 배치를 유지한다.
- 검색/링크 탭이 없고 하나의 입력으로 두 동작을 수행한다.
- URL 입력 시 Search API를 호출하지 않는다.
- 성공/실패/자동 닫기/수동 닫기/패널 유지가 테스트된다.
- 공용 Toast와 기존 API 계약을 변경하지 않는다.
