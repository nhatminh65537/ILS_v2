'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { AdminOverviewCards } from '@/components/features/admin-stats/AdminOverviewCards'
import { useAdminStats } from '@/hooks/useAdminStats'
import type { AdminStatsUserDetailDto } from '@/types/admin-stats.types'

type AdminStatsPageClientProps = {
  locale: string
}

function formatTs(iso: string | null, locale: string, never: string): string {
  if (!iso) return never
  return new Date(iso).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')
}

function UserDetailSection({
  data,
  locale,
}: {
  data: AdminStatsUserDetailDto
  locale: string
}) {
  const t = useTranslations('adminStats.userDetail')
  const never = t('never')

  return (
    <div className="space-y-4">
      {/* User header */}
      <div className="flex items-center gap-3">
        <div>
          <p className="font-semibold">{data.user.display_name ?? data.user.username}</p>
          <p className="text-muted-foreground text-sm">@{data.user.username}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Points */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('points.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                {(
                  [
                    ['points.learning', data.points.learning],
                    ['points.challenge', data.points.challenge],
                    ['points.quiz', data.points.quiz],
                    ['points.total', data.points.total],
                  ] as [string, number][]
                ).map(([key, val]) => (
                  <tr key={key} className="border-b last:border-0">
                    <td className="text-muted-foreground py-1">
                      {t(key as Parameters<typeof t>[0])}
                    </td>
                    <td className="py-1 text-right font-medium">{val.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Completion */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('completion.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                {(
                  [
                    ['completion.coursesStarted', data.completion.courses_started],
                    ['completion.coursesCompleted', data.completion.courses_completed],
                    ['completion.lessonsStarted', data.completion.lessons_started],
                    ['completion.lessonsCompleted', data.completion.lessons_completed],
                    ['completion.challengesCompleted', data.completion.challenges_completed],
                    ['completion.challengeSubmits', data.completion.challenge_submits],
                    ['completion.challengeCorrectSubmits', data.completion.challenge_correct_submits],
                    ['completion.quizzesCompleted', data.completion.quizzes_completed],
                    ['completion.quizAttempts', data.completion.quiz_attempts],
                    ['completion.quizBestScore', data.completion.quiz_best_score],
                  ] as [string, number][]
                ).map(([key, val]) => (
                  <tr key={key} className="border-b last:border-0">
                    <td className="text-muted-foreground py-1">
                      {t(key as Parameters<typeof t>[0])}
                    </td>
                    <td className="py-1 text-right font-medium">{val.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('activity.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                {(
                  [
                    ['activity.lastActive', data.activity.last_active_at],
                    ['activity.lastCourseStarted', data.activity.last_course_started_at],
                    ['activity.lastCourseCompleted', data.activity.last_course_completed_at],
                    ['activity.lastLessonStarted', data.activity.last_lesson_started_at],
                    ['activity.lastLessonCompleted', data.activity.last_lesson_completed_at],
                    ['activity.lastChallengeCompleted', data.activity.last_challenge_completed_at],
                    ['activity.lastQuizAttempted', data.activity.last_quiz_attempted_at],
                    ['activity.lastQuizCompleted', data.activity.last_quiz_completed_at],
                  ] as [string, string | null][]
                ).map(([key, val]) => (
                  <tr key={key} className="border-b last:border-0">
                    <td className="text-muted-foreground py-1">
                      {t(key as Parameters<typeof t>[0])}
                    </td>
                    <td className="py-1 text-right text-xs">{formatTs(val, locale, never)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Sessions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('sessions.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                {(
                  [
                    ['sessions.total', data.sessions.total],
                    ['sessions.active', data.sessions.active],
                    ['sessions.revoked', data.sessions.revoked],
                  ] as [string, number][]
                ).map(([key, val]) => (
                  <tr key={key} className="border-b last:border-0">
                    <td className="text-muted-foreground py-1">
                      {t(key as Parameters<typeof t>[0])}
                    </td>
                    <td className="py-1 text-right font-medium">{val}</td>
                  </tr>
                ))}
                {(
                  [
                    ['sessions.latestLastUsed', data.sessions.latest_last_used_at],
                    ['sessions.latestExpires', data.sessions.latest_expires_at],
                  ] as [string, string | null][]
                ).map(([key, val]) => (
                  <tr key={key} className="border-b last:border-0">
                    <td className="text-muted-foreground py-1">
                      {t(key as Parameters<typeof t>[0])}
                    </td>
                    <td className="py-1 text-right text-xs">{formatTs(val, locale, never)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function AdminStatsPageClient({ locale }: AdminStatsPageClientProps) {
  const t = useTranslations('adminStats')

  const { overviewState, userDetailState, searchQuery, setSearchQuery, loadOverview, searchUser } =
    useAdminStats()

  useEffect(() => {
    void loadOverview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = () => {
    void searchUser(searchQuery)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>
      </div>

      {/* Overview error */}
      {overviewState.errorMessageKey && (
        <p className="text-destructive text-sm">
          {t(overviewState.errorMessageKey as Parameters<typeof t>[0])}
        </p>
      )}

      {/* Overview cards */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">{t('overview.title')}</h2>
        <AdminOverviewCards data={overviewState.data} isLoading={overviewState.isLoading} />
      </section>

      {/* User search */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('search.label')}</h2>
        <div className="flex max-w-sm items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="user-search">{t('search.label')}</Label>
            <Input
              id="user-search"
              placeholder={t('search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={userDetailState.isLoading || !searchQuery.trim()}
          >
            {userDetailState.isLoading ? t('search.searching') : t('search.button')}
          </Button>
        </div>

        {/* User detail error */}
        {userDetailState.errorMessageKey && (
          <p className="text-destructive text-sm">
            {t(userDetailState.errorMessageKey as Parameters<typeof t>[0])}
          </p>
        )}

        {/* User detail skeleton */}
        {userDetailState.isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        )}

        {/* User detail content */}
        {!userDetailState.isLoading && userDetailState.data && (
          <div className="space-y-4">
            <h3 className="font-medium">{t('userDetail.title')}</h3>
            <UserDetailSection data={userDetailState.data} locale={locale} />
          </div>
        )}
      </section>
    </div>
  )
}
