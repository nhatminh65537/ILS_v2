'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PublicProfileResponse } from '@/types/user.types'

type ProfileStatsProps = {
  profile: PublicProfileResponse
}

export function ProfileStats({ profile }: ProfileStatsProps) {
  const t = useTranslations('profile')

  const stats = [
    { label: t('stats.learningPoints'), value: profile.total_learning_point },
    { label: t('stats.challengePoints'), value: profile.total_challenge_point },
    { label: t('stats.quizPoints'), value: profile.total_quiz_point },
    { label: t('stats.coursesCompleted'), value: profile.course_completed },
    { label: t('stats.challengesCompleted'), value: profile.challenge_completed },
    { label: t('stats.quizzesCompleted'), value: profile.quiz_completed },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-2xl font-bold">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
