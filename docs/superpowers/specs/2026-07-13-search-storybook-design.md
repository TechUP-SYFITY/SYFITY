# SearchPanel Storybook Design

## Goal

Add a Storybook entry for `SearchPanel` under `Features/Search/SearchPanel` while following the existing feature-story conventions. The story set must include a dedicated mobile presentation.

## Structure

- Add one colocated story file: `apps/frontend/src/features/search/components/SearchPanel.stories.tsx`.
- Use the CSF metadata pattern already used by Home, Playlist, Room, Chat, and Player stories.
- Set the metadata title to `Features/Search/SearchPanel` so Storybook creates the `Search` folder below `Features`.
- Keep `SearchPanel`, `SearchAddToast`, Storybook configuration, and production behavior unchanged.

## Stories

The file will expose these deterministic stories:

- `Default`: desktop search results using the existing search MSW handler.
- `Mobile`: the same functional panel at a 375 x 812 viewport, matching the existing `InviteCodeDialog` mobile convention.
- `Loading`: a pending search response.
- `Empty`: a successful response with no matching results.
- `Error`: a failed search response.
- `LinkInput`: the URL-add presentation, which bypasses the search request.

All stories keep the panel open, use `Chill Night` as the room name, and provide Storybook action spies for callbacks. Representative play assertions verify that the expected panel state is rendered.

## Data and Isolation

- Reuse the project-wide React Query and MSW Storybook setup.
- Create a fresh `QueryClient` in a decorator so story cache state does not leak between stories.
- Reuse the shared search handler for normal results and override only the loading, empty, and error cases at story level.
- Do not make live YouTube or backend requests.

## Verification

- Run the Storybook-focused Vitest command for the new story when supported by the current configuration.
- Run TypeScript checking and `build-storybook` to prove the story is discoverable and compiles.
- Confirm the existing server on port 6006 serves `Features/Search/SearchPanel`; restart it only if hot reload does not discover the new file.

## Non-goals

- No `SearchAddToast` story.
- No production component or API changes.
- No Storybook configuration or dependency changes.
- No unrelated refactoring.
