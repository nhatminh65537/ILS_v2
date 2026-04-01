import { authHandlers } from '@/mocks/handlers/auth.handlers'
import { usersHandlers } from '@/mocks/handlers/users.handlers'
import { coursesHandlers } from '@/mocks/handlers/courses.handlers'
import { challengesHandlers } from '@/mocks/handlers/challenges.handlers'
import { quizzesHandlers } from '@/mocks/handlers/quizzes.handlers'
import { notificationsHandlers } from '@/mocks/handlers/notifications.handlers'
import { leaderboardHandlers } from '@/mocks/handlers/leaderboard.handlers'
import { rbacHandlers } from '@/mocks/handlers/rbac.handlers'
import { systemConfigHandlers } from '@/mocks/handlers/system-config.handlers'

export const handlers = [
  ...authHandlers,
  ...usersHandlers,
  ...coursesHandlers,
  ...challengesHandlers,
  ...quizzesHandlers,
  ...notificationsHandlers,
  ...leaderboardHandlers,
  ...rbacHandlers,
  ...systemConfigHandlers,
]
