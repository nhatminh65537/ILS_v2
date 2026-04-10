# Session Report: Slice 7 Task 7.5 — Frontend Quiz Browser

**Date:** 2026-04-10
**Slices / Areas:** Slice 7 – Quiz System (Task 7.5 Frontend)

## Summary

Implemented the user-facing Quiz Browser pages for ILS v2: a catalog page (`/quizzes`) with a sticky filter sidebar, and a detail page (`/quizzes/[id]`). The session also included a full type-alignment phase (frontend quiz types rewritten to match backend Django serializers), replacement of all native `<select>` elements with shadcn `<Select>` for theme consistency, Quizzes navigation entry added to navbar/sidebar, and a new `(catalog)` route group architecture that decouples catalog pages from the standard nav sidebar layout.

## Completed Items

### Phase 1 — Type Alignment (`src/types/quiz.types.ts`)
- Renamed `time_limit_seconds` → `time_limit_sec` on `Quiz`
- Added `quiz_point: number` and `total_questions: number` to `Quiz`
- Removed `pass_score_percent` and `is_shuffled` from `Quiz`
- Renamed `QuizQuestion.question_text: string` → `content: Record<string, unknown>`; added `score`, `status`
- Renamed `QuizQuestionOption.text` → `content: string`
- Rewrote `QuizAttempt`: `total_score`, `quiz_title`, `is_finished`, `config: Record<string, unknown>`, `quiz: number`
- Rewrote `QuizConfig` to match `QuizConfigSerializer`: `total_questions`, `time_limit_sec`, `random_question`, `random_option`, `allow_review`, `allow_retry`, `max_attempt`, `is_default`, `is_active`
- Removed `first_question` from `QuizAttemptResponse` (questions arrive via WebSocket, not REST)
- Rewrote `SubmitAnswerPayload`: `{ question_id: number; answer_data: { option_id?, option_ids?, text? } }`
- Updated `CreateQuizPayload` and `UpdateQuizPayload` to use aligned field names

### Phase 2 — MSW Fixtures & Handlers
- `quizzesFixture`: renamed to `time_limit_sec`, added `quiz_point`, `total_questions`
- `quizQuestionsFixture`: `content: { text: "..." }`, `options[].content`, added `status`, `score`, `updated_at`
- `quizAttemptsFixture`: new shape matching `UserQuizAttemptSerializer`
- POST quiz/quiz-questions handlers updated to use new field names
- `start_attempt` handler: returns `UserQuizAttemptSerializer` shape (no `first_question`)
- Added GET config handler for `/api/quiz/quizzes/{id}/config/`
- Fixed `attempt.quiz_id` reference → `attempt.quiz`

### Phase 3 — i18n Keys
- Added to `quizzes` namespace (both `en.json` and `vi.json`):
  - `catalog.subtitle`, `catalog.searchPlaceholder`
  - `detail.backToCatalog`, `detail.startSession`, `detail.noProgress`
  - `labels.timeLimit`, `labels.quizPoint`, `labels.totalQuestions`, `labels.minutes`, `labels.noLimit`, `labels.status`, plus status value labels
  - `filter.title`, `filter.reset`, `filter.tags`, `filter.timeLimit`, `filter.timeLimitAny`, `filter.timeLimit15`, `filter.timeLimit30`, `filter.timeLimitNone`
  - `empty.noResults`, `empty.noQuizzes`, `errors.loadFailed`, `errors.detailLoadFailed`

### Phase 4 — `useQuizzes` Hook (`src/hooks/useQuizzes.ts`)
- `loadQuizzes()` — calls `listQuizzes`, stores via `setQuizzes([...data.results])`
- `loadQuizDetail(id)` — calls `getQuizById` and `getQuizProgress` in parallel via `Promise.all`; gracefully handles 404 on progress (`catch(() => null)`)
- Exposes `quizzes`, `selectedQuiz`, `progress`, `isLoading`, `error`, `reset` via Zustand selectors

### Phase 5 — `QuizCard` Component
- Renders shadcn `Card` with: title (linked to `/{locale}/quizzes/{id}`), description (2-line clamp), status `Badge`, time limit (formatted as minutes), `quiz_point`, `total_questions`

### Phase 6 — `QuizCatalogClient` (two-column layout)
- Left column: `<div class="hidden w-56 shrink-0 md:block">` sticky `QuizFilterPanel` in bordered card
- Right column: quiz grid (1 → 2 → 3 columns)
- Filter state: `search`, `selectedTags: string[]`, `timeLimitFilter: TimeLimitFilter`
- `availableTags` computed via `useMemo` from fetched quizzes (no separate API needed)
- Filter pipeline: published → title search → tag intersection → time limit range

### Phase 7 — `QuizFilterPanel` Component
- Search `Input`, time limit shadcn `Select` (`any|≤15min|≤30min|no limit`), tag `Badge` pills (toggle active state), Reset button (shown only when filters are active)

### Phase 8 — `QuizDetailClient` Component
- Displays: title, description, `quiz_point`, `total_questions`, `time_limit_sec`, status badge
- Progress card: `best_score`, `attempt_count` or "Not attempted yet" state
- "Start quiz session" `Link` → `/{locale}/quizzes/{id}/session`
- Loading skeleton + error state

### Phase 9 — `(catalog)` Route Group Architecture
- Created `app/[locale]/(catalog)/layout.tsx`: `UserAccessGate` + `UserLayout` with `showSidebar={false}`
- Moved quiz pages from `(app)/quizzes/` → `(catalog)/quizzes/` and `(catalog)/quizzes/[id]/`
- `QuizCatalogClient` renders its own two-column layout (filter left, content right) instead of relying on a layout sidebar
- This pattern is designed to scale to future `/courses` and `/challenges` catalog pages

### Phase 10 — Native `<select>` → shadcn `<Select>` Migration
- `SystemConfigToolbar.tsx`: category filter select replaced
- `PermissionAssignmentPanel.tsx`: permission picker replaced (`String` ↔ `Number` conversion for value)
- `UserRoleAssignmentPanel.tsx`: role picker replaced
- `AppSettingsForm.tsx` (profile/settings): language and theme selects replaced

### Phase 11 — Navigation
- `UserLayout`: added `quizzesLabel` prop; Quizzes link added to both sidebar and top navbar
- All call sites updated: `app/[locale]/(app)/layout.tsx`, `app/[locale]/(catalog)/layout.tsx`, `app/[locale]/page.tsx`

### Phase 12 — Service Additions
- `getQuizConfig(id)` → `GET /api/quiz/quizzes/{id}/config/` added to `quizzes.service.ts`

## Architecture Decision — `(catalog)` Route Group

The key challenge was: some pages need the standard navigation sidebar (`/dashboard`), while catalog pages need a content filter panel in place of the sidebar. Two options were considered:

- **Option A** — Layout prop to inject sidebar content: complex prop drilling through layout hierarchy
- **Option B** — Separate route group `(catalog)` with `showSidebar={false}`, each catalog page renders its own internal two-column layout

**Option B was chosen.** The `(catalog)` route group provides a layout shell (auth gate + topnav only), and each catalog page client renders a `flex gap-6` two-column layout internally. This is self-contained, scales to future catalog pages (courses, challenges), and avoids prop drilling through layout files.

## Bugs Encountered and Fixed

| Bug | Cause | Fix |
|-----|-------|-----|
| `readonly Quiz[]` not assignable to `Quiz[]` | `PaginatedResponse.results` is `readonly` | `setQuizzes([...data.results])` |
| MSW POST handler used old field names | Fixtures updated but handlers were not | Updated POST quiz/quiz-questions handlers |
| Missing `quizzesLabel` prop type error | `UserLayout` required new prop everywhere | Added prop to all 3 call sites |
| `tsc` errors for deleted `(app)/quizzes/` routes | Stale `.next/dev/types/` cache | `rm -rf .next` |
| `attempt.quiz_id` reference error in handler | Field renamed to `quiz` in attempt type | Updated handler reference |

## Verification

- `npx tsc --noEmit` — 0 errors
- `npm run lint` — clean
- `npm run build` — successful (all pages generated)

## Files Changed

**New:**
- `frontend/app/[locale]/(catalog)/layout.tsx`
- `frontend/app/[locale]/(catalog)/quizzes/page.tsx`
- `frontend/app/[locale]/(catalog)/quizzes/[id]/page.tsx`
- `frontend/src/components/features/quizzes/QuizCard.tsx`
- `frontend/src/components/features/quizzes/QuizCatalogClient.tsx`
- `frontend/src/components/features/quizzes/QuizDetailClient.tsx`
- `frontend/src/components/features/quizzes/QuizFilterPanel.tsx`
- `frontend/src/components/ui/select.tsx`
- `frontend/src/hooks/useQuizzes.ts`

**Modified:**
- `frontend/src/types/quiz.types.ts`
- `frontend/src/services/quizzes.service.ts`
- `frontend/src/mocks/data/fixtures.ts`
- `frontend/src/mocks/handlers/quizzes.handlers.ts`
- `frontend/src/components/layouts/UserLayout.tsx`
- `frontend/src/components/layouts/SessionNavControls.tsx`
- `frontend/src/components/features/admin-config/SystemConfigToolbar.tsx`
- `frontend/src/components/features/rbac/PermissionAssignmentPanel.tsx`
- `frontend/src/components/features/rbac/UserRoleAssignmentPanel.tsx`
- `frontend/messages/en.json`
- `frontend/messages/vi.json`
- `frontend/app/[locale]/(app)/layout.tsx`
- `frontend/app/[locale]/page.tsx`

**Deleted:**
- `frontend/app/[locale]/(app)/quizzes/` (entire directory — moved to `(catalog)`)
