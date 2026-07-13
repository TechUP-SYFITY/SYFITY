# Search 곡 추가 Toast 설계

## 배경

GitHub 이슈 #52는 Room의 Search 화면에서 검색 결과를 재생목록에 추가한 결과를 성공 또는 실패 Toast로 즉시 알려 주는 작업이다. 구현 브랜치 `feat/search-add-toast-52`는 최신 `dev`를 병합했으며, PR #50에서 반영한 Search UI, Playlist 추가 연결, 오류 메시지 매핑을 포함한다.

Figma 기준 노드는 `77:7407`이다. Toast는 Search UI보다 높은 레이어의 화면 하단 중앙에 표시하며 성공/실패 아이콘, 메시지, 닫기 버튼을 제공한다.

## 목표

- Playlist 추가 성공 시 `플레이리스트에 추가했어요 🎵` 성공 Toast를 표시한다.
- Playlist 추가 실패 시 `getPlaylistErrorMessage()`가 반환한 사용자용 메시지를 실패 Toast로 표시한다.
- 기존 공용 Toast primitive를 수정하지 않고 최대한 재사용한다.
- 데스크톱과 모바일에서 Search UI의 주요 조작을 가리지 않는 하단 중앙 배치를 사용한다.
- Toast 자동 닫힘, 수동 닫기, 아래 방향 스와이프 닫기를 지원한다.
- 연속으로 곡을 추가해도 각 결과마다 Toast 표시 시간이 다시 시작된다.

## 비목표

- YouTube 검색 요청, Playlist 추가 API, mutation hook의 동작을 변경하지 않는다.
- 전역 Toast context나 새로운 공용 Toast 시스템을 만들지 않는다.
- 공용 `Toast.tsx`를 교체하거나 스타일 API를 변경하지 않는다.
- 성공 후 SearchPanel을 닫거나 검색 결과의 추가 버튼 상태를 변경하지 않는다.
- Search 이외 화면에 Toast를 적용하지 않는다.

## 아키텍처와 컴포넌트

### RoomPageClient

`RoomPageClient`는 기존처럼 `useAddPlaylistItem(roomId)` mutation을 소유한다. 여기에 현재 Toast 피드백 상태를 추가한다. 피드백은 고유 ID, `success | error` variant, 메시지를 가진다.

검색 결과 추가 시 기존 피드백을 초기화한 뒤 mutation을 실행한다. mutation의 `onSuccess`와 `onError` 콜백에서 새 고유 ID를 가진 피드백을 만든다. SearchPanel을 닫을 때 mutation 상태와 Toast 상태를 함께 초기화한다.

### SearchAddToast

Search 기능 폴더에 Search 전용 `SearchAddToast` 컴포넌트를 둔다. 이 컴포넌트는 다음 공용 primitive를 조합한다.

- `ToastProvider`
- `Toast`
- `ToastViewport`
- `ToastIcon`
- `ToastTitle`
- `ToastClose`

컴포넌트 입력은 현재 피드백과 닫기 콜백으로 제한한다. 성공에는 체크 아이콘, 실패에는 경고 아이콘, 공통 닫기 버튼에는 X 아이콘을 사용한다. 피드백 고유 ID를 Toast key로 사용해 동일한 메시지가 연속 발생해도 Radix Toast의 duration이 다시 시작되게 한다.

### SearchPanel

기존 `addErrorMessage` 인라인 오류 영역은 제거한다. Playlist 추가 실패는 `SearchAddToast`의 실패 Toast로 표시해 같은 오류가 중복 노출되지 않게 한다. 검색 API 자체의 오류 상태 UI는 기존대로 유지한다.

## 데이터 흐름

1. 사용자가 검색 결과의 `추가` 버튼을 누른다.
2. `RoomPageClient`가 기존 Toast를 닫고 `addSearchResult.mutate()`를 실행한다.
3. 요청이 성공하면 성공 피드백을 생성한다.
4. 요청이 실패하면 `getPlaylistErrorMessage(error)`로 메시지를 만든 뒤 실패 피드백을 생성한다.
5. `SearchAddToast`가 피드백 variant에 맞는 Toast를 표시한다.
6. 4초가 지나거나 사용자가 닫기 또는 아래 방향 스와이프를 수행하면 피드백을 초기화한다.
7. 성공 후에도 SearchPanel은 열린 상태를 유지해 추가 검색과 곡 추가를 계속할 수 있다.

## 배치와 접근성

- 공용 `ToastViewport`의 fixed 하단 중앙 배치와 `z-100`을 사용해 `z-50` SearchPanel보다 위에 표시한다.
- Search 전용 `className`으로 모바일 safe area 하단 여백과 데스크톱 하단 간격만 보완한다.
- 성공 Toast는 `role="status"`, 실패 Toast는 `role="alert"`를 사용한다.
- 닫기 버튼에는 `aria-label="닫기"`를 제공한다.
- 아이콘은 장식 요소로 처리하고 메시지가 상태를 완전히 설명하게 한다.

## 오류 처리

- 알려진 API 오류는 기존 `getPlaylistErrorMessage()` 매핑을 그대로 사용한다.
- 네트워크 오류와 알 수 없는 오류도 기존 기본 메시지 경로를 사용한다.
- 새 Toast가 발생하면 이전 Toast를 교체한다. 이 범위에서는 Toast queue를 만들지 않는다.
- SearchPanel을 닫았다가 다시 열면 이전 성공/실패 피드백이 남지 않는다.

## 테스트 전략

### SearchAddToast 단위 테스트

- 성공 variant가 성공 메시지, 체크 아이콘, `status` 역할로 표시되는지 확인한다.
- 실패 variant가 오류 메시지, 경고 아이콘, `alert` 역할로 표시되는지 확인한다.
- 닫기 버튼으로 Toast가 사라지는지 확인한다.
- 4초 duration 이후 자동으로 닫히는지 fake timer로 확인한다.

### RoomPageClient 통합 테스트

- Playlist 추가 API 성공 후 성공 Toast가 표시되는지 확인한다.
- Playlist 추가 API 실패 후 매핑된 실패 Toast가 표시되는지 확인한다.
- 요청 경로에 invite code가 아니라 실제 Room ID가 사용되는 기존 검증을 유지한다.
- SearchPanel을 닫으면 Toast가 제거되고 다시 열 때 이전 피드백이 보이지 않는지 확인한다.

### 회귀 검증

- SearchPanel, PlaylistPanel, Playlist hook, 오류 메시지 관련 테스트를 실행한다.
- Frontend TypeScript, ESLint, Next.js 프로덕션 빌드를 실행한다.

## 예상 변경 파일

- `apps/frontend/src/features/search/components/SearchAddToast.tsx`
- `apps/frontend/src/features/search/components/SearchAddToast.test.tsx`
- `apps/frontend/src/features/search/components/SearchPanel.tsx`
- `apps/frontend/src/features/search/components/SearchPanel.test.tsx`
- `apps/frontend/src/app/(protected)/room/[roomId]/RoomPageClient.tsx`
- `apps/frontend/src/app/(protected)/room/[roomId]/RoomPageClient.test.tsx`

## 완료 기준

- 성공과 실패 Toast가 Figma의 주요 구조와 배치를 반영한다.
- 공용 Toast primitive를 수정하지 않고 재사용한다.
- 성공/실패 메시지와 닫힘 동작이 테스트로 검증된다.
- Search, YouTube 검색 API, Playlist 추가 API 동작에는 회귀가 없다.
- console.log와 불필요한 주석을 추가하지 않는다.
