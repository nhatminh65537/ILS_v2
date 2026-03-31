## `src/components/features/`

Smart components with business logic. Organized by domain.

Directories (by slice):
- `auth/` — LoginForm, RegisterForm (Slice 1)
- `courses/` — CourseCard, CourseTree, LessonViewer (Slice 5)
- `challenges/` — ChallengeCard, ChallengeTree, FlagSubmit (Slice 6)
- `quizzes/` — QuizCard, QuizSession (Slice 7)
- `notifications/` — NotificationBell, NotificationPanel (Slice 9)

**Rule**: Feature components call services, use stores, dispatch actions. Props for data/callbacks only.
