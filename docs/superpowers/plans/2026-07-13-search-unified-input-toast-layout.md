# Search Unified Input and Responsive Toast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Search/Link tabs with one query-or-URL input and place playlist feedback at mobile bottom-center and desktop viewport bottom-right without duplicate screen-reader announcements.

**Architecture:** `RoomPageClient` continues to own playlist mutation and feedback state. `SearchPanel` distinguishes regular text from absolute HTTP(S) URLs, keeps the existing search hook for text, and reuses `onAddUrl` for links. `Dialog.Content` becomes an untransformed viewport wrapper containing a transformed visual surface and the Toast as siblings; `SearchAddToast` supplies its own in-dialog announcement container while still composing only the existing shared Toast primitives.

**Tech Stack:** Next.js 16, React 19, TypeScript, TanStack Query, Radix Dialog/Toast, Tailwind CSS, Lucide React, Vitest, Testing Library, MSW.

## Global Constraints

- Desktop Toast is fixed to the viewport bottom-right with 24px spacing and must not overlap the visual dialog.
- Mobile Toast keeps its current bottom-center position and safe-area spacing.
- Remove the `검색` / `링크` tabs and use one input with placeholder `YouTube 영상 검색 또는 링크 붙여넣기`.
- Regular text keeps the existing 350ms debounced Search API behavior.
- Absolute `http://` or `https://` URLs bypass Search API and use the existing Playlist URL request path.
- Playlist API remains the authority for YouTube URL validity and existing error mapping.
- Reuse the existing shared Toast primitives without modifying `apps/frontend/src/shared/components/ui/Toast.tsx`.
- Keep exact success copy `플레이리스트에 추가했어요 🎵`, `duration={4000}`, manual close, and downward swipe.
- Use Radix's single live announcement path; do not add a visible `role="status"` or `role="alert"` to Toast Root.
- Do not add dependencies, API changes, global Toast state, queues, `console.log`, or unrelated refactors.

---

### Task 1: Make SearchAddToast responsive and single-announcement

**Files:**

- Modify: `apps/frontend/src/features/search/components/SearchAddToast.test.tsx`
- Modify: `apps/frontend/src/features/search/components/SearchAddToast.tsx`

**Interfaces:**

- Consumes: `SearchAddToastFeedback`, existing shared `ToastProvider`, `Toast`, `ToastViewport`, `ToastIcon`, `ToastTitle`, and `ToastClose`.
- Produces: the existing `SearchAddToast({ feedback, onClose })` API with a local Radix announcer container, responsive viewport classes, Korean labels, and foreground/background priority.

- [ ] **Step 1: Replace role assertions with failing single-announcement and layout tests**

Update `SearchAddToast.test.tsx` so success and failure identify the visible Toast by `data-state="open"`, verify it has no explicit role, and inspect Radix's one hidden announcer:

```tsx
it('announces success once with polite priority and closes manually', async () => {
  const onClose = vi.fn();

  render(
    <SearchAddToast
      feedback={{ id: 1, variant: 'success', message: '플레이리스트에 추가했어요 🎵' }}
      onClose={onClose}
    />,
  );

  const visibleToast = (await screen.findByText('플레이리스트에 추가했어요 🎵')).closest(
    '[data-state="open"]',
  );
  const announcer = await screen.findByRole('status');

  expect(visibleToast).not.toHaveAttribute('role');
  expect(announcer).toHaveAttribute('aria-live', 'polite');
  expect(announcer).toHaveTextContent('알림 플레이리스트에 추가했어요 🎵');
  expect(screen.getAllByRole('status')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: '닫기' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('announces failure once with assertive priority', async () => {
  render(
    <SearchAddToast
      feedback={{ id: 2, variant: 'error', message: '재생할 수 없는 영상이에요.' }}
      onClose={vi.fn()}
    />,
  );

  const visibleToast = (await screen.findByText('재생할 수 없는 영상이에요.')).closest(
    '[data-state="open"]',
  );
  const announcer = await screen.findByRole('status');

  expect(visibleToast).not.toHaveAttribute('role');
  expect(announcer).toHaveAttribute('aria-live', 'assertive');
  expect(screen.getAllByRole('status')).toHaveLength(1);
});

it('keeps mobile bottom-center and moves desktop feedback to bottom-right', async () => {
  render(
    <SearchAddToast
      feedback={{ id: 3, variant: 'success', message: '플레이리스트에 추가했어요 🎵' }}
      onClose={vi.fn()}
    />,
  );

  const viewport = await screen.findByRole('region', { name: '알림 (F8)' });

  expect(viewport).toHaveClass('left-1/2', '-translate-x-1/2');
  expect(viewport).toHaveClass('lg:right-0', 'lg:left-auto', 'lg:translate-x-0', 'lg:p-6');
});
```

Keep the existing fake-timer test for exact 4000ms closing.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
& 'C:\Users\dlwnd\AppData\Roaming\npm\pnpm.cmd' --filter frontend test --run src/features/search/components/SearchAddToast.test.tsx
```

Expected: FAIL because the visible Root still has a role, Radix uses the body/default English label, error priority is not explicit, and desktop right-aligned classes are absent.

- [ ] **Step 3: Implement a local announcer container and responsive viewport**

Update `SearchAddToast.tsx` with this structure:

```tsx
'use client';

import { Check, CircleAlert, X } from 'lucide-react';
import { useState } from 'react';

// existing shared Toast imports remain unchanged

export function SearchAddToast({ feedback, onClose }: SearchAddToastProps) {
  const [announcerContainer, setAnnouncerContainer] = useState<HTMLDivElement | null>(null);

  const toast =
    feedback && announcerContainer ? (
      <ToastProvider announcerContainer={announcerContainer} label="알림" swipeDirection="down">
        <Toast
          key={feedback.id}
          duration={4000}
          open
          type={feedback.variant === 'error' ? 'foreground' : 'background'}
          variant={feedback.variant}
          onOpenChange={(open) => {
            if (!open) onClose();
          }}
        >
          <ToastIcon>
            {feedback.variant === 'error' ? <CircleAlert aria-hidden /> : <Check aria-hidden />}
          </ToastIcon>
          <ToastTitle>{feedback.message}</ToastTitle>
          <ToastClose aria-label="닫기">
            <X aria-hidden />
          </ToastClose>
        </Toast>
        <ToastViewport
          label="알림 ({hotkey})"
          className="pb-[max(1rem,env(safe-area-inset-bottom))] lg:right-0 lg:left-auto lg:max-w-sm lg:translate-x-0 lg:p-6"
        />
      </ToastProvider>
    ) : null;

  return (
    <>
      <div ref={setAnnouncerContainer} data-search-add-toast-announcer />
      {toast}
    </>
  );
}
```

Do not alter the shared Toast file. The always-mounted empty container allows Radix's live region to be portaled inside the Dialog accessibility subtree before feedback arrives.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Step 2 command.

Expected: 1 file passes with success/failure single announcements, responsive positioning classes, manual close, and exact 4000ms auto-close.

- [ ] **Step 5: Commit Task 1**

```bash
git add apps/frontend/src/features/search/components/SearchAddToast.tsx apps/frontend/src/features/search/components/SearchAddToast.test.tsx
git commit -m "fix: 곡 추가 Toast 배치와 안내 개선 #52"
```

---

### Task 2: Separate the Dialog accessibility wrapper from the visual surface

**Files:**

- Modify: `apps/frontend/src/features/search/components/SearchPanel.test.tsx`
- Modify: `apps/frontend/src/features/search/components/SearchPanel.tsx`
- Modify: `apps/frontend/src/app/(protected)/room/[roomId]/RoomPageClient.test.tsx`

**Interfaces:**

- Consumes: existing `SearchPanel.feedback?: ReactNode` and `SearchAddToast` from Task 1.
- Produces: an untransformed full-viewport `Dialog.Content` with a `data-search-panel-surface` visual child and feedback as its sibling.

- [ ] **Step 1: Write failing wrapper/surface placement tests**

Replace the existing height/width assertions so they target the visual surface, and strengthen the feedback test:

```tsx
it('keeps dialog accessibility full-screen while sizing only the visual surface', () => {
  renderPanel();

  const dialog = screen.getByRole('dialog', { name: '곡 추가' });
  const surface = dialog.querySelector('[data-search-panel-surface]');

  expect(dialog).toHaveClass('fixed', 'inset-0', 'pointer-events-none');
  expect(dialog).not.toHaveClass('overflow-hidden', 'lg:-translate-x-1/2');
  expect(surface).toHaveClass(
    'pointer-events-auto',
    'h-[80dvh]',
    'max-h-[calc(100dvh-1rem)]',
    'overflow-hidden',
    'lg:w-md',
    'lg:-translate-x-1/2',
  );
});

it('renders feedback beside the visual surface inside the dialog subtree', () => {
  renderPanel({ feedback: <p>곡 추가 피드백</p> });

  const dialog = screen.getByRole('dialog', { name: '곡 추가' });
  const surface = dialog.querySelector('[data-search-panel-surface]');
  const feedback = within(dialog).getByText('곡 추가 피드백');

  expect(dialog).toContainElement(feedback);
  expect(surface).not.toContainElement(feedback);
});
```

Update the Room integration Toast assertions to locate the visible open Toast by its message and `data-state="open"`, not by explicit `status`/`alert` roles. After closing the panel, reopen it and assert the old message is still absent.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```powershell
& 'C:\Users\dlwnd\AppData\Roaming\npm\pnpm.cmd' --filter frontend test --run src/features/search/components/SearchPanel.test.tsx "src/app/(protected)/room/[roomId]/RoomPageClient.test.tsx"
```

Expected: FAIL because the Dialog Content itself still owns transform, dimensions, and overflow, and the feedback is still nested in that same visual surface.

- [ ] **Step 3: Create the full-screen Dialog wrapper and inner visual surface**

Restructure the Portal section of `SearchPanel.tsx`:

```tsx
<DialogPrimitive.Content
  aria-describedby={undefined}
  aria-label="곡 추가"
  className="pointer-events-none fixed inset-0 z-50 outline-none"
  onOpenAutoFocus={(event) => {
    event.preventDefault();
    if (addMode === 'search') {
      searchInputRef.current?.focus();
      return;
    }

    linkInputRef.current?.focus();
  }}
>
  <div
    data-search-panel-surface
    className="pointer-events-auto absolute right-0 bottom-0 left-0 flex h-[80dvh] max-h-[calc(100dvh-1rem)] w-full animate-in flex-col overflow-hidden rounded-t-[24px] border border-white/[0.08] bg-[#101012]/95 text-white shadow-[0_-24px_80px_rgba(0,0,0,0.72)] duration-300 outline-none slide-in-from-bottom-4 lg:top-1/2 lg:right-auto lg:bottom-auto lg:left-1/2 lg:h-auto lg:max-h-[calc(100vh-8rem)] lg:w-md lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[18px] lg:shadow-[0_24px_90px_rgba(0,0,0,0.55)]"
  >
    {/* Move the current mobile handle, header, and Tabs block here without changing them. */}
  </div>
  {feedback}
</DialogPrimitive.Content>
```

Keep Overlay click close, Escape close, title, and the conditional search/link focus behavior unchanged. Only move the current visual children and classes under the new surface.

Use these exact Room integration assertion shapes so the tests select the visible Toast rather than Radix's hidden announcement:

```tsx
const successMessages = await screen.findAllByText('플레이리스트에 추가했어요 🎵');
const successToast = successMessages
  .find((message) => message.closest('[data-state="open"]'))
  ?.closest('[data-state="open"]');

expect(successToast).toHaveTextContent('플레이리스트에 추가했어요 🎵');

fireEvent.click(screen.getByRole('button', { name: '검색 패널 닫기' }));
await waitFor(() =>
  expect(screen.queryByText('플레이리스트에 추가했어요 🎵')).not.toBeInTheDocument(),
);

const [reopenSearchButton] = await screen.findAllByRole('button', { name: '추가' });
fireEvent.click(reopenSearchButton as HTMLButtonElement);
expect(screen.queryByText('플레이리스트에 추가했어요 🎵')).not.toBeInTheDocument();
```

For failure, select `재생할 수 없는 영상이에요.` with the same `[data-state="open"]` lookup and assert the close button with `within(errorToast as HTMLElement).getByRole('button', { name: '닫기' })`.

Add a delayed-request regression so closing the panel cannot restore feedback after the request finishes:

```tsx
it('패널을 닫으면 진행 중이던 곡 추가 완료가 Toast를 되살리지 않는다', async () => {
  let releaseRequest!: () => void;
  let requestCompleted = false;
  const requestGate = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });

  server.use(
    http.post('*/api/v1/rooms/:roomId/playlist', async () => {
      await requestGate;
      requestCompleted = true;
      return HttpResponse.json({ success: true, data: roomFixture.playlist[0] });
    }),
  );

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
  fireEvent.click(screen.getByRole('button', { name: '검색 패널 닫기' }));

  releaseRequest();
  await waitFor(() => expect(requestCompleted).toBe(true));
  expect(screen.queryByText('플레이리스트에 추가했어요 🎵')).not.toBeInTheDocument();
});
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Step 2 command plus Task 1's focused test.

Expected: all selected tests pass; Toast is accessible under the Dialog wrapper but outside the transformed/overflow-hidden visual surface.

- [ ] **Step 5: Commit Task 2**

```bash
git add apps/frontend/src/features/search/components/SearchPanel.tsx apps/frontend/src/features/search/components/SearchPanel.test.tsx "apps/frontend/src/app/(protected)/room/[roomId]/RoomPageClient.test.tsx"
git commit -m "fix: Toast와 곡 추가 다이얼로그 레이어 분리 #52"
```

---

### Task 3: Replace Search/Link tabs with one query-or-URL input

**Files:**

- Modify: `apps/frontend/src/features/search/components/SearchPanel.test.tsx`
- Modify: `apps/frontend/src/features/search/components/SearchPanel.tsx`
- Modify: `apps/frontend/src/app/(protected)/room/[roomId]/RoomPageClient.test.tsx`

**Interfaces:**

- Consumes: existing `SearchPanelProps.onAddResult(result)` and `SearchPanelProps.onAddUrl(youtubeUrl)`.
- Produces: local `isAbsoluteHttpUrl(value: string): boolean`; one controlled `query` input; URL form submit through unchanged `onAddUrl`.

- [ ] **Step 1: Replace tab tests with failing unified-input tests**

Update the Figma panel test to expect the new placeholder and no tabs:

```tsx
expect(screen.getByPlaceholderText('YouTube 영상 검색 또는 링크 붙여넣기')).toBeTruthy();
expect(screen.queryByRole('tab')).toBeNull();
expect(useYoutubeSearchQueryMock).toHaveBeenCalledWith('Coldplay');
```

Replace keyboard tab and link-tab tests with these behaviors:

```tsx
it('bypasses search and submits a trimmed absolute URL', () => {
  const onAddUrl = vi.fn();
  renderPanel({ initialQuery: '', onAddUrl });

  const input = screen.getByPlaceholderText('YouTube 영상 검색 또는 링크 붙여넣기');
  fireEvent.change(input, { target: { value: '  https://youtu.be/yellow  ' } });

  expect(useYoutubeSearchQueryMock).toHaveBeenLastCalledWith('');
  expect(screen.queryByText('검색 결과 1개')).not.toBeInTheDocument();
  expect(screen.getByText('https://youtu.be/yellow')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '링크 추가' }));
  expect(onAddUrl).toHaveBeenCalledWith('https://youtu.be/yellow');
});

it('submits a URL form with Enter behavior but ignores text submit', () => {
  const onAddUrl = vi.fn();
  renderPanel({ initialQuery: '', onAddUrl });

  const input = screen.getByPlaceholderText('YouTube 영상 검색 또는 링크 붙여넣기');
  const form = input.closest('form');

  fireEvent.change(input, { target: { value: 'Coldplay' } });
  fireEvent.submit(form as HTMLFormElement);
  expect(onAddUrl).not.toHaveBeenCalled();

  fireEvent.change(input, { target: { value: 'https://youtube.com/watch?v=yellow' } });
  fireEvent.submit(form as HTMLFormElement);
  expect(onAddUrl).toHaveBeenCalledWith('https://youtube.com/watch?v=yellow');
});

it('disables the link CTA while a playlist add is pending', () => {
  renderPanel({ initialQuery: 'https://youtu.be/yellow', isAddPending: true, onAddUrl: vi.fn() });

  expect(screen.getByRole('button', { name: '링크 추가' })).toBeDisabled();
});
```

Update all Room integration queries from the old placeholders to the new one. Remove the link-tab click before entering the URL, then keep the request body and success Toast assertions.

- [ ] **Step 2: Run SearchPanel and Room tests and verify RED**

Run:

```powershell
& 'C:\Users\dlwnd\AppData\Roaming\npm\pnpm.cmd' --filter frontend test --run src/features/search/components/SearchPanel.test.tsx "src/app/(protected)/room/[roomId]/RoomPageClient.test.tsx"
```

Expected: FAIL because the old tabs and separate link input still exist, URL input still leaves Search query active, and the unified placeholder/form are absent.

- [ ] **Step 3: Implement URL detection and the single form**

In `SearchPanel.tsx`, remove `AddMode`, `Tabs` imports, `addMode`, `youtubeUrl`, and `linkInputRef`. Add:

```tsx
const trimmedQuery = query.trim();
const isLinkInput = isAbsoluteHttpUrl(trimmedQuery);
const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_DELAY);
const searchQuery = useYoutubeSearchQuery(isOpen && !isLinkInput ? debouncedQuery.trim() : '');

const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();

  if (!isLinkInput || !onAddUrl || isAddPending) {
    return;
  }

  onAddUrl(trimmedQuery);
};
```

Add the local parser below the constants:

```tsx
function isAbsoluteHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
```

Replace the Tabs block with one form. Keep the existing search input styling, clear button, result/loading/error/empty/idle components, and switch the leading icon between `Link2` and `Search`:

```tsx
<form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
  <div className="border-b border-white/[0.07] px-4 py-4">
    <div className="relative">
      {isLinkInput ? (
        <Link2
          className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-white/45"
          aria-hidden
        />
      ) : (
        <Search
          className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-white/45"
          aria-hidden
        />
      )}
      <input
        ref={searchInputRef}
        className="h-[46px] w-full rounded-[18px] border border-white/[0.08] bg-white/[0.07] pr-11 pl-10 text-sm text-white transition outline-none placeholder:text-white/38 focus:border-[#72f4a4]/45 focus:bg-white/[0.09]"
        placeholder="YouTube 영상 검색 또는 링크 붙여넣기"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {/* existing query clear button */}
    </div>
  </div>
  <div className="min-h-[280px] flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {isLinkInput ? (
      <SearchPanelLinkInput
        url={trimmedQuery}
        isAddPending={isAddPending}
        canAdd={Boolean(onAddUrl)}
      />
    ) : (
      <>{/* existing loading, error, results, empty, and idle branches */}</>
    )}
  </div>
</form>
```

Implement the URL state without a second state variable:

```tsx
function SearchPanelLinkInput({
  canAdd,
  isAddPending,
  url,
}: {
  canAdd: boolean;
  isAddPending: boolean;
  url: string;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#72f4a4]/20 bg-[#72f4a4]/10 text-[#72f4a4]">
        <Link2 className="h-6 w-6" aria-hidden />
      </span>
      <p className="mt-4 text-sm font-bold text-white">이 링크를 플레이리스트에 추가할까요?</p>
      <p className="mt-2 max-w-full truncate text-xs text-white/45">{url}</p>
      <button
        className="mt-5 flex h-11 items-center justify-center gap-2 rounded-[18px] bg-[#72f4a4] px-6 text-sm font-bold text-black transition hover:bg-[#8af7b5] disabled:cursor-not-allowed disabled:opacity-45"
        type="submit"
        disabled={!canAdd || isAddPending}
        aria-label="링크 추가"
      >
        {isAddPending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Plus className="h-4 w-4" aria-hidden />
        )}
        링크 추가
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```powershell
& 'C:\Users\dlwnd\AppData\Roaming\npm\pnpm.cmd' --filter frontend test --run src/features/search/components/SearchAddToast.test.tsx src/features/search/components/SearchPanel.test.tsx "src/app/(protected)/room/[roomId]/RoomPageClient.test.tsx"
```

Expected: all three files pass; normal search, URL bypass, click/form submit, payloads, feedback, focus, close, and pending behavior are covered.

- [ ] **Step 5: Commit Task 3**

```bash
git add apps/frontend/src/features/search/components/SearchPanel.tsx apps/frontend/src/features/search/components/SearchPanel.test.tsx "apps/frontend/src/app/(protected)/room/[roomId]/RoomPageClient.test.tsx"
git commit -m "feat: 곡 추가 검색과 링크 입력 통합 #52"
```

---

### Task 4: Regression verification

**Files:**

- Verify only; no source changes.

**Interfaces:**

- Consumes: completed Tasks 1–3.
- Produces: fresh evidence for Search, Playlist, Toast, lint, TypeScript build, and branch scope.

- [ ] **Step 1: Run focused Search and Playlist regression tests**

```powershell
& 'C:\Users\dlwnd\AppData\Roaming\npm\pnpm.cmd' --filter frontend test --run src/features/search src/features/playlist "src/app/(protected)/room/[roomId]/RoomPageClient.test.tsx"
```

Expected: all selected files and tests pass with zero failures.

- [ ] **Step 2: Run the full frontend suite**

```powershell
& 'C:\Users\dlwnd\AppData\Roaming\npm\pnpm.cmd' --filter frontend test --run
```

Expected: all frontend test files and tests pass. If the known first-run Vite optimizer reload recurs, record it and require an immediate clean rerun before completion.

- [ ] **Step 3: Run frontend lint**

```powershell
& 'C:\Users\dlwnd\AppData\Roaming\npm\pnpm.cmd' --filter frontend lint
```

Expected: exit code 0 with no ESLint errors.

- [ ] **Step 4: Run the production build**

```powershell
& 'C:\Users\dlwnd\AppData\Roaming\npm\pnpm.cmd' --filter frontend build
```

Expected: Next.js compilation, TypeScript, page generation, and optimization complete with exit code 0.

- [ ] **Step 5: Verify scope**

```powershell
git diff --check dev...HEAD
git status --short
```

Expected: no whitespace errors, no tracked working-tree changes, and only the user's pre-existing untracked paths plus `.superpowers/` scratch data.
