'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { AdminStatsOverviewDto } from '@/types/admin-stats.types'

type AdminOverviewCardsProps = {
  data: AdminStatsOverviewDto | null
  isLoading: boolean
}

export function AdminOverviewCards({ data, isLoading }: AdminOverviewCardsProps) {
  const t = useTranslations('adminStats.overview')

  const cards: { labelKey: string; value: number | undefined }[] = [
    { labelKey: 'userCount', value: data?.user_count },
    { labelKey: 'activeToday', value: data?.active_today },
    { labelKey: 'solvesWeek', value: data?.solves_week },
    { labelKey: 'registrationsWeek', value: data?.registrations_week },
    { labelKey: 'coursesPublished', value: data?.courses_published },
    { labelKey: 'challengesPublished', value: data?.challenges_published },
    { labelKey: 'quizzesPublished', value: data?.quizzes_published },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map(({ labelKey, value }) => (
        <Card key={labelKey}>
          <CardContent className="pt-4">
            {isLoading || value === undefined ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-bold">{value.toLocaleString()}</p>
            )}
            <p className="text-muted-foreground mt-1 text-sm">
              {t(labelKey as Parameters<typeof t>[0])}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
