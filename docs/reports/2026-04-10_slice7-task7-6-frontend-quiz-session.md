# Session Report: Slice 7 Task 7.6 — Frontend WebSocket Quiz Session

**Date:** 2026-04-10
**Slices / Areas:** Slice 7 – Frontend Quiz Session (WebSocket)

---

## Summary

Implemented the full interactive quiz-taking session UI at `/quizzes/[id]/session`. The session connects to the backend Django Channels WebSocket consumer (`/ws/quiz/{quiz_id}/`) via a `useQuizSession` hook that drives a `useReducer` state machine through the complete protocol: connect → first-message JWT auth → start → question/answer/next loop → finish. All three question types (single_choice, multi_choice, fill_blank) are rendered with shadcn/ui components. An MSW v2 WebSocket mock handler simulates the full protocol for local development. Two bugs discovered during testing were diagnosed and fixed.

---

## Completed Items

- WS message type interfaces added to `src/types/quiz.types.ts` (`WsAuthMessage`, `WsQuestionEvent`, `WsAnswerResultEvent`, `WsFinishEvent`, `WsErrorEvent`, `SessionQuestion`, `SessionProgress`)
- i18n keys added under `quizzes.session.*` in `messages/en.json` and `messages/vi.json`
- `src/hooks/useQuizSession.ts` — WebSocket state machine hook
- `src/components/features/quizzes/QuizQuestionView.tsx` — polymorphic question renderer
- `src/components/features/quizzes/QuizAnswerResultCard.tsx` — post-answer feedback card
- `src/components/features/quizzes/QuizFinishScreen.tsx` — session summary screen
- `src/components/features/quizzes/QuizSessionClient.tsx` — top-level session container
- `app/[locale]/(catalog)/quizzes/[id]/session/page.tsx` — RSC page wrapper
- `src/mocks/handlers/quiz-ws.handlers.ts` — MSW v2 WebSocket mock
- `src/mocks/handlers/index.ts` — registered WS handlers
- shadcn `radio-group`, `checkbox`, `progress` components installed
- Bug fix: MSW URL pattern changed from glob to env-var-derived exact URL
- Bug fix: `onclose` handler now uses local closure variable (not stateRef) and surfaces auth-rejection closes as errors
- `tsc --noEmit` and `next build` both pass clean

---

## Key Implementations

### `useQuizSession` Hook — State Machine

1. `useReducer` with states: `idle → connecting → authenticating → active → finished | error`
2. `useEffect` creates `new WebSocket(wsUrl)` on mount; `wsUrl` derived from `NEXT_PUBLIC_API_URL` with scheme replace (`http→ws`)
3. `onopen` → dispatches `AUTHENTICATING`, sends `{type:"auth", token}` from `localStorage`
4. `onmessage` → parses JSON, switches on `msg.type`: `auth_ok` dispatches `AUTH_OK` + auto-sends `{action:"start"}`; `question` → `QUESTION`; `answer_result` → `ANSWER_RESULT`; `finish` → `FINISH`; `error` → `ERROR`
5. Local `wsStatus` variable in closure mirrors state synchronously — used by `onclose` to detect auth-rejection (clean close during authenticating phase)
6. Elapsed timer: `setInterval(1s)` only while `status === 'active'`; exposed as `elapsedSec`
7. `sendAnswer` / `sendNext` guard on `stateRef.current.questionPhase` to prevent double-submit

### MSW v2 WebSocket Mock

1. `ws.link(\`${wsBase}/ws/quiz/:quizId/\`)` — URL derived from `NEXT_PUBLIC_API_URL` (same as hook), guaranteeing pattern match
2. `connection` handler: filters fixture questions by `quizId`, tracks `questionIndex`, `totalScore`, `authenticated` in closure
3. `message` handler: dispatches on `msg.type`/`msg.action`; `auth` → `auth_ok`; `start` → first question; `answer` → scores via `isCorrect()` helper + sends `answer_result`; `next` → next question or `finish`
4. `isCorrect()` handles all three question types; fill_blank accepts any non-empty text as correct for mock

### Bug: MSW URL Pattern Mismatch

- **Root cause:** `ws://*/ws/quiz/:quizId/` — MSW's URL pattern matching cannot reliably resolve `*` as a hostname wildcard; the pattern may fail to match `ws://localhost:8000/...`
- **Fix:** Pattern derived from `process.env.NEXT_PUBLIC_API_URL` → `ws://localhost:8000/ws/quiz/:quizId/` — exact, deterministic match

### Bug: Silent "Authenticating..." Deadlock

- **Root cause:** When the backend (running in parallel) rejects an empty JWT with close code 4001 (`wasClean=true`), the old `onclose` guard (`if (!event.wasClean)`) silently discarded the close event, leaving the UI permanently stuck
- **Fix:** Replaced `stateRef.current.status` check (post-render delay) with a synchronous local `wsStatus` variable updated inside each event handler. `onclose` now always dispatches `ERROR` unless already in `finished`/`error` state

---

## Files Changed

| File | Change Summary |
|------|---------------|
| `src/types/quiz.types.ts` | Added WS message type interfaces + `SessionQuestion`/`SessionProgress` |
| `messages/en.json` | Added `quizzes.session.*` keys + `quizzes.errors.connectionFailed/authFailed/sessionError` |
| `messages/vi.json` | Added same keys in Vietnamese |
| `src/hooks/useQuizSession.ts` | NEW — WS hook with state machine, auth, local wsStatus tracker |
| `src/components/features/quizzes/QuizQuestionView.tsx` | NEW — single/multi/fill_blank renderer |
| `src/components/features/quizzes/QuizAnswerResultCard.tsx` | NEW — answer feedback card |
| `src/components/features/quizzes/QuizFinishScreen.tsx` | NEW — finish summary with score/duration |
| `src/components/features/quizzes/QuizSessionClient.tsx` | NEW — session container/orchestrator |
| `app/[locale]/(catalog)/quizzes/[id]/session/page.tsx` | NEW — RSC page wrapper |
| `src/mocks/handlers/quiz-ws.handlers.ts` | NEW — MSW v2 ws mock (full protocol) |
| `src/mocks/handlers/index.ts` | Added `quizWsHandlers` registration |
| `src/components/ui/radio-group.tsx` | NEW — installed via shadcn |
| `src/components/ui/checkbox.tsx` | NEW — installed via shadcn |
| `src/components/ui/progress.tsx` | NEW — installed via shadcn |

---

## Notes / Caveats

- Task 7.7 (Frontend quiz editor for admin/editor surface) is the remaining Slice 7 task — not yet started.
- The MSW WS mock scores fill_blank questions as "correct" for any non-empty input. Real backend applies case-sensitive/case-insensitive comparison against stored answers.
- Pre-existing lint errors in `playwright.integration.test.ts` and `AdminAccessGate.tsx` (`@typescript-eslint/no-explicit-any`) are unrelated to this task and were present before this session.
- `tsc --noEmit` passes clean; `next build` passes clean.
