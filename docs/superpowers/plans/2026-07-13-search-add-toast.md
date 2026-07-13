# Search Add Toast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show Figma-aligned success and failure feedback when a Search panel playlist-add request finishes.

**Architecture:** Keep the playlist mutation in `RoomPageClient`, where request success and failure are already known. Add one Search-specific composition component that renders the existing shared Radix Toast primitives; do not change the shared Toast API, search API, or playlist API.

**Tech Stack:** Next.js 16, React 19, TypeScript, TanStack Query, Radix Toast, Lucide React, Vitest, Testing Library, MSW.

## Global Constraints

- Reuse `ToastProvider`, `Toast`, `ToastViewport`, `ToastIcon`, `ToastTitle`, and `ToastClose` from `@/shared/components/ui` without modifying `Toast.tsx`.
- Keep SearchPanel open after both successful and failed playlist additions.
- Use `플레이리스트에 추가했어요 🎵` for success and `getPlaylistErrorMessage(error)` for failure.
- Toast duration is exactly 4000 milliseconds; manual close and downward swipe remain enabled.
- Replace the previous Toast when a new add result arrives; do not introduce a queue or global Toast context.
- Preserve the Search API and Playlist API request behavior.
- Do not add dependencies, `console.log`, or unrelated refactors.

---

### Task 1: Search-specific Toast composition

**Files:**

- Create: `apps/frontend/src/features/search/components/SearchAddToast.tsx`
- Create: `apps/frontend/src/features/search/components/SearchAddToast.test.tsx`

**Interfaces:**

- Consumes: existing shared Toast primitive exports from `@/shared/components/ui`.
- Produces: `SearchAddToastFeedback` and `SearchAddToast({ feedback, onClose })` for `RoomPageClient`.

- [ ] **Step 1: Write the failing component tests**

```tsx
import '@testing-library/jest-dom/vitest';

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchAddToast } from './SearchAddToast';

describe('SearchAddToast', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders success feedback with the shared success Toast and closes manually', () => {
    const onClose = vi.fn();

    render(
      <SearchAddToast
        feedback={{ id: 1, variant: 'success', message: '플레이리스트에 추가했어요 🎵' }}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('플레이리스트에 추가했어요 🎵');
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders failure feedback as an alert', () => {
    render(
      <SearchAddToast
        feedback={{ id: 2, variant: 'error', message: '재생할 수 없는 영상이에요.' }}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('재생할 수 없는 영상이에요.');
  });

  it('requests close after four seconds', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    render(
      <SearchAddToast
        feedback={{ id: 3, variant: 'success', message: '플레이리스트에 추가했어요 🎵' }}
        onClose={onClose}
      />,
    );

    act(() => vi.advanceTimersByTime(4000));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter frontend test --run src/features/search/components/SearchAddToast.test.tsx`

Expected: FAIL because `./SearchAddToast` does not exist.

- [ ] **Step 3: Implement the Search-specific composition with only existing primitives**

```tsx
'use client';

import { Check, CircleAlert, X } from 'lucide-react';

import {
  Toast,
  ToastClose,
  ToastIcon,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/shared/components/ui';

export interface SearchAddToastFeedback {
  id: number;
  message: string;
  variant: 'success' | 'error';
}

interface SearchAddToastProps {
  feedback: SearchAddToastFeedback | null;
  onClose: () => void;
}

export function SearchAddToast({ feedback, onClose }: SearchAddToastProps) {
  if (!feedback) {
    return null;
  }

  const isError = feedback.variant === 'error';

  return (
    <ToastProvider swipeDirection="down">
      <Toast
        key={feedback.id}
        duration={4000}
        open
        role={isError ? 'alert' : 'status'}
        variant={feedback.variant}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <ToastIcon>{isError ? <CircleAlert aria-hidden /> : <Check aria-hidden />}</ToastIcon>
        <ToastTitle>{feedback.message}</ToastTitle>
        <ToastClose aria-label="닫기">
          <X aria-hidden />
        </ToastClose>
      </Toast>
      <ToastViewport className="pb-[max(1rem,env(safe-area-inset-bottom))] lg:pb-6" />
    </ToastProvider>
  );
}
```

- [ ] **Step 4: Run the component tests to verify they pass**

Run: `pnpm --filter frontend test --run src/features/search/components/SearchAddToast.test.tsx`

Expected: 1 test file and 3 tests pass.

- [ ] **Step 5: Commit the component**

```bash
git add apps/frontend/src/features/search/components/SearchAddToast.tsx apps/frontend/src/features/search/components/SearchAddToast.test.tsx
git commit -m "feat: Search 곡 추가 Toast 컴포넌트 구현 #52"
```

### Task 2: Connect playlist-add results and remove duplicated inline feedback

**Files:**

- Modify: `apps/frontend/src/app/(protected)/room/[roomId]/RoomPageClient.tsx`
- Modify: `apps/frontend/src/app/(protected)/room/[roomId]/RoomPageClient.test.tsx`
- Modify: `apps/frontend/src/features/search/components/SearchPanel.tsx`
- Modify: `apps/frontend/src/features/search/components/SearchPanel.test.tsx`

**Interfaces:**

- Consumes: `SearchAddToastFeedback` and `SearchAddToast` from Task 1; `AddPlaylistItemRequest`; existing `getPlaylistErrorMessage(error)`.
- Produces: success/error Toast behavior for both search-result and link playlist additions while the SearchPanel remains open.

- [ ] **Step 1: Change integration tests to require Toast feedback**

Add a successful search-result test to `RoomPageClient.test.tsx`:

```tsx
it('검색 결과 곡 추가 성공 Toast를 표시하고 SearchPanel을 유지한다', async () => {
  const Wrapper = createWrapper();

  render(
    <Wrapper>
      <RoomPageClient roomId={roomFixture.room.id} />
    </Wrapper>,
  );

  const [openSearchButton] = await screen.findAllByRole('button', { name: '추가' });
  fireEvent.click(openSearchButton as HTMLButtonElement);
  fireEvent.change(screen.getByPlaceholderText('YouTube 영상 검색'), {
    target: { value: 'Night Changes' },
  });
  fireEvent.click(await screen.findByRole('button', { name: 'Night Changes 추가' }));

  expect(await screen.findByRole('status')).toHaveTextContent('플레이리스트에 추가했어요 🎵');
  expect(screen.getByRole('dialog', { name: '곡 추가' })).toBeInTheDocument();
});
```

Update the existing failed-add test to assert the failure Toast and confirm the panel remains open:

```tsx
expect(await screen.findByRole('alert')).toHaveTextContent('재생할 수 없는 영상이에요.');
expect(screen.getByRole('dialog', { name: '곡 추가' })).toBeInTheDocument();
expect(requestedRoomId).toBe(roomFixture.room.id);
```

Add a stale-feedback cleanup assertion after a success:

```tsx
fireEvent.click(screen.getByRole('button', { name: '검색 패널 닫기' }));
await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
```

Delete the SearchPanel unit test named `renders a playlist add error inside the search panel`; the prop and duplicated inline alert will no longer exist.

- [ ] **Step 2: Run integration tests to verify they fail**

Run: `pnpm --filter frontend test --run "src/app/(protected)/room/[roomId]/RoomPageClient.test.tsx" src/features/search/components/SearchPanel.test.tsx`

Expected: FAIL because success feedback is absent and playlist failures still render through `addErrorMessage` inside SearchPanel.

- [ ] **Step 3: Wire per-request mutation feedback in RoomPageClient**

Add `useRef` to the React imports, import `AddPlaylistItemRequest`, `SearchAddToast`, and `SearchAddToastFeedback`, then add this state and helper inside `RoomPageClient`:

```tsx
const [toastFeedback, setToastFeedback] = useState<SearchAddToastFeedback | null>(null);
const toastIdRef = useRef(0);

const showAddToast = (variant: SearchAddToastFeedback['variant'], message: string) => {
  toastIdRef.current += 1;
  setToastFeedback({ id: toastIdRef.current, message, variant });
};

const addPlaylistItem = (body: AddPlaylistItemRequest) => {
  setToastFeedback(null);
  addSearchResult.reset();
  addSearchResult.mutate(body, {
    onError: (error) => showAddToast('error', getPlaylistErrorMessage(error)),
    onSuccess: () => showAddToast('success', '플레이리스트에 추가했어요 🎵'),
  });
};
```

Use the helper from both existing add paths:

```tsx
const handleAddSearchResult = (result: YoutubeSearchResult) => {
  if (!hasJoinedRoom) return;
  addPlaylistItem({ videoId: result.videoId });
};

const handleAddYoutubeUrl = (youtubeUrl: string) => {
  if (!hasJoinedRoom) return;
  addPlaylistItem({ youtubeUrl });
};
```

Clear feedback with panel cleanup and render the Toast composition next to SearchPanel:

```tsx
const handleCloseSearch = () => {
  addSearchResult.reset();
  setToastFeedback(null);
  setIsSearchPanelOpen(false);
};

<SearchAddToast feedback={toastFeedback} onClose={() => setToastFeedback(null)} />;
```

- [ ] **Step 4: Remove the duplicated SearchPanel playlist-error prop and markup**

Remove `addErrorMessage` from `SearchPanelProps`, its destructuring, and this block from `SearchPanel.tsx`:

```tsx
{
  addErrorMessage ? (
    <p
      className="flex items-center gap-2 border-b border-red-300/15 bg-red-400/10 px-4 py-3 text-xs text-red-200"
      role="alert"
    >
      <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
      {addErrorMessage}
    </p>
  ) : null;
}
```

Remove the now-unused `CircleAlert` import and stop passing `addErrorMessage` from `RoomPageClient`.

- [ ] **Step 5: Run the focused tests to verify they pass**

Run: `pnpm --filter frontend test --run src/features/search/components/SearchAddToast.test.tsx src/features/search/components/SearchPanel.test.tsx "src/app/(protected)/room/[roomId]/RoomPageClient.test.tsx"`

Expected: 3 test files pass, including success, mapped failure, manual close, automatic close, and panel persistence assertions.

- [ ] **Step 6: Commit the integration**

```bash
git add "apps/frontend/src/app/(protected)/room/[roomId]/RoomPageClient.tsx" "apps/frontend/src/app/(protected)/room/[roomId]/RoomPageClient.test.tsx" apps/frontend/src/features/search/components/SearchPanel.tsx apps/frontend/src/features/search/components/SearchPanel.test.tsx
git commit -m "feat: 곡 추가 성공 실패 Toast 연결 #52"
```

### Task 3: Regression verification

**Files:**

- Verify only; no new source files.

**Interfaces:**

- Consumes: completed Tasks 1 and 2.
- Produces: evidence that Search, playlist mutation, shared Toast usage, lint, and production build remain valid.

- [ ] **Step 1: Run Search and playlist regression tests**

Run: `pnpm --filter frontend test --run src/features/search src/features/playlist "src/app/(protected)/room/[roomId]/RoomPageClient.test.tsx"`

Expected: all selected test files and tests pass with zero failures.

- [ ] **Step 2: Run frontend lint**

Run: `pnpm --filter frontend lint`

Expected: exit code 0 with no ESLint errors.

- [ ] **Step 3: Run the frontend production build**

Run: `pnpm --filter frontend build`

Expected: exit code 0 and a successful Next.js production build.

- [ ] **Step 4: Verify scope and working tree**

Run: `git diff --check dev...HEAD && git status --short`

Expected: no whitespace errors; only the user's pre-existing untracked paths remain unstaged.
