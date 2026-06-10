# Session Report: Bugfix Batch — 11 User-Reported Issues

**Date:** 2026-06-11
**Slices / Areas:** Slice 5 (Learn), Slice 6 (Challenge instances), Slice 7 (Quiz), Slice 8 (Profile/Settings), Slice 11 (Leaderboard), Frontend foundation (i18n/theme), Deployment (docker-compose)

## Summary

Confirmed and fixed 11 user-reported issues spanning the user interface, quiz, leaderboard, admin, challenge-instance, and deployment areas. Each was verified in the code before fixing. Three design decisions were confirmed with the programmer: (a) instances drop the STOPPED state and "Stop" now terminates; (b) lesson mini-quiz reveal is served by a server-side endpoint (answers never shipped in the page payload); (c) theme is a small hand-written provider (no `next-themes`). Backend Django check + targeted pytest (instance/admin-users/realtime) pass; frontend `tsc`, ESLint, and production build are clean.

## Completed Items

- **[U-01]** Course-content sidebar now sorts folders-first, then lessons.
- **[U-02]** Backend `media/` persisted via a named docker volume (no data loss on redeploy).
- **[U-03]** Quiz time limit enforced server-side (authoritative) + client auto-finish with countdown UI.
- **[U-04]** Dashboard cards are actionable links (Learn/Challenge/Quiz/Leaderboard) with icons + CTA.
- **[U-05]** en/vi + light/dark settings now actually apply (middleware fix + ThemeProvider + locale URL switch + navbar toggles).
- **[U-06]** Leaderboard podium shows tied users instead of overwriting.
- **[U-07]** Leaderboard users link to their public profile.
- **[U-08]** Admin create-user 400 now surfaces the exact server reason.
- **[U-09]** Instance list supports free-text search by user/challenge name.
- **[U-10]** Lesson mini-quiz "Reveal" shows the correct answer via a server-side endpoint. (Bonus: WS session result card now also renders `correct_answer`.)
- **[U-11]** STOPPED instance state dropped; user "Stop" terminates; legacy rows migrated.

## Key Implementations

### Quiz time-limit enforcement ([U-03])
1. Backend `QuizConsumer._is_time_expired(attempt)` compares `now - attempt.started_at` against the `time_limit_sec` snapshot on `attempt.config` (≤0 = unlimited).
2. `_handle_answer` rejects a late answer (`time_expired` error) and finalizes the attempt; `_handle_next` finalizes when expired. Server is authoritative — a stalled/tampered client cannot answer past time.
3. Frontend `useQuizSession` tracks `timeLimitSec`/`timeUp`; when `elapsedSec >= timeLimitSec` it dispatches `TIME_UP` and sends `next` (server then finishes). Header switches to a countdown (red < 30s) and shows a "time up" alert.

### Lesson mini-quiz server-side reveal ([U-10])
1. Member-facing `QuizQuestionOptionSerializer` deliberately omits `is_correct`/fill-blank answers, so the FE had no correct-answer data.
2. New `LessonService.reveal_question(lesson, question_id)` validates the question belongs to the lesson's mini-quiz and returns `{correct_option_ids, correct_options, accepted_answers, explanation}`.
3. New endpoint `GET /api/learn/lessons/{id}/questions/{qid}/reveal/`; FE fetches it on the "Reveal" click and renders the correct option(s)/answer alongside the explanation. Answers stay off the initial page load.

### STOPPED state removed ([U-11])
1. `get_running_instance` only matched RUNNING, so a STOPPED instance was orphaned (no resume; restart spawned a new one) — a half-dead state.
2. `instance_stop` now calls `instance.terminate()` (TERMINATED) instead of `stop()`, freeing the partial-unique index so the user can start fresh.
3. `InstanceStatus.STOPPED` and `model.stop()` marked DEPRECATED; data migration `0016_terminate_stopped_instances` converts existing STOPPED rows → TERMINATED (sets `terminated_at`).

### en/vi + light/dark settings ([U-05])
1. The next-intl middleware lived in `proxy.ts`, which Next.js never auto-loads → moved to `frontend/middleware.ts`. Locale routing/negotiation now works (verified in build output).
2. `ThemeProvider` (no `next-themes`): lazy-inits the preference from `localStorage`, resolves `system` via `useSyncExternalStore(prefers-color-scheme)`, toggles `.dark` on `<html>`; `ThemeNoFlashScript` applies the class pre-hydration to avoid a flash.
3. `AppSettingsForm` applies the theme immediately and, on save, switches the locale segment via `@/i18n/navigation` `router.replace`. `<html lang>` is corrected to the active locale by `LocaleHtmlLang`. Navbar gets `ThemeToggle` + `LocaleToggle`.

### Leaderboard ties + profile links ([U-06]/[U-07])
1. The podium built a `Map<rank, entry>` and skipped duplicates (`!byRank.has(rank)`), hiding the 2nd of two tied users. Now it takes the top-3 *entries* (already sorted `-score, user_id` server-side, keyed by `user.id`) and renders each with its real rank's medal.
2. Table rows and podium cards wrap the user in a `Link` to `/{locale}/profile/{username}` (the public profile page already existed).

### Admin create-user error surfacing ([U-08])
1. Root cause: the serializer applies Django `AUTH_PASSWORD_VALIDATORS` to the optional password and enforces unique username/email → a weak/duplicate value returns 400 with a field-level message.
2. New `extractAdminUserErrorText` reads the DRF error body (ordered: password, username, email, role_ids, non_field_errors); the hook stores it as `mutationErrorText` and the banner shows it verbatim, falling back to the generic key.

### Instance name search ([U-09])
- Backend `ChallengeInstanceAdminView` adds `?search=` → icontains OR across `user__username/email` and `challenge__title/slug`. Frontend replaces the two id inputs with one free-text search box (Enter/Refresh); status filter triggers reload.

## Files Changed

| File | Change Summary |
|------|---------------|
| `frontend/src/components/features/courses/LessonCourseTreeSidebar.tsx` | Folder-first sort comparator |
| `docker-compose.yml` | `media:/app/media` named volume + declaration |
| `backend/realtime/consumers/quiz_consumer.py` | `_is_time_expired` + enforce in answer/next |
| `frontend/src/hooks/useQuizSession.ts` | `timeLimitSec`/`timeUp` state + auto-finish effect |
| `frontend/src/components/features/quizzes/QuizSessionClient.tsx` | Countdown + time-up alert |
| `frontend/src/components/features/quizzes/QuizAnswerResultCard.tsx` | Render `correct_answer` |
| `frontend/app/[locale]/(app)/dashboard/page.tsx` | Actionable linked cards |
| `frontend/middleware.ts` (new; `proxy.ts` removed) | next-intl middleware in the auto-loaded location |
| `frontend/src/components/providers/{ThemeProvider,LocaleHtmlLang}.tsx` (new) | Theme + `<html lang>` |
| `frontend/src/i18n/navigation.ts` (new) | Locale-aware navigation helpers |
| `frontend/src/components/layouts/{ThemeToggle,LocaleToggle,SessionNavControls}.tsx` | Navbar toggles |
| `frontend/src/components/features/profile/AppSettingsForm.tsx` | Apply theme + locale on change/save |
| `frontend/app/{layout,[locale]/layout}.tsx` | Mount providers; drive lang |
| `frontend/src/components/features/leaderboard/LeaderboardPageClient.tsx` | Podium ties + profile links |
| `frontend/src/hooks/useAdminUsers.ts`, `frontend/src/lib/admin-user-error-map.ts` (new), `.../admin-users/AdminUsersPageClient.tsx` | Surface DRF create-user error |
| `backend/api/views/challenges.py` | Instance `search` filter; `instance_stop` → terminate |
| `frontend/.../admin/AdminChallengeInstancesPageClient.tsx` | Search box; drop `stopped` filter |
| `backend/api/models.py`, `backend/api/migrations/0016_terminate_stopped_instances.py` (new) | STOPPED deprecation + data migration |
| `frontend/src/components/features/challenges/ChallengeInstancePanel.tsx` | "End"/"New instance" labels |
| `backend/api/{views/courses.py,services/lesson_service.py,urls.py}` | Lesson question reveal endpoint |
| `frontend/src/components/features/courses/LessonMiniQuizContent.tsx`, `frontend/src/{services/lessons.service.ts,types/lesson.types.ts}`, MSW | Reveal fetch + render |
| `frontend/messages/{en,vi}.json` | New i18n keys (dashboard cta/leaderboard, instance labels, session timeUp/correctAnswer, navigation toggleTheme, instances.filters.search, lessonViewer correctAnswer) |
| `docs/{BUGS,STATUS,API,DATA_MODEL}.md` | Fixed log (F50–F59), status, endpoint + enum docs |

## Notes / Caveats

- Full backend pytest suite was not run end-to-end this session (time); targeted suites (instance, admin-users, realtime) and `manage.py check` + `makemigrations --check` all pass.
- `InstanceStatus.STOPPED` enum value is intentionally retained (not removed) for legacy-data validation; it is documented DEPRECATED and no longer produced. `model.stop()` is kept only for the deployment-backend interface — do not add new callers.
- The theme no-flash relies on `suppressHydrationWarning` on `<html>` (set in the root layout) since the inline script mutates the class before hydration.
- The mini-quiz reveal MSW handler derives correctness from `quizQuestionsFixture` (which carries `is_correct`); the mapping fixtures themselves still omit it, matching the real serializer.
