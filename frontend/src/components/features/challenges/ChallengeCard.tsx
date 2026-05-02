import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChallengeDifficulty, type Challenge } from '@/types/challenge.types'

type ChallengeCardProps = {
  challenge: Challenge
  locale: string
  isSolved?: boolean
}

const DIFFICULTY_CLASS: Record<ChallengeDifficulty, string> = {
  [ChallengeDifficulty.Easy]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [ChallengeDifficulty.Medium]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [ChallengeDifficulty.Hard]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  [ChallengeDifficulty.Insane]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export function ChallengeCard({ challenge, locale, isSolved = false }: ChallengeCardProps) {
  const t = useTranslations('challenges')

  return (
    <Link href={`/${locale}/challenges/${challenge.slug}`} className="group block">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardHeader className="space-y-2 pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-base leading-snug">{challenge.title}</CardTitle>
            <div className="flex shrink-0 items-center gap-1.5">
              {isSolved ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" aria-label={t('labels.solved')} />
              ) : null}
              {challenge.difficulty ? (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_CLASS[challenge.difficulty]}`}>
                  {t(`difficulty.${challenge.difficulty}`)}
                </span>
              ) : null}
            </div>
          </div>
          {challenge.tags && challenge.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {challenge.tags.slice(0, 3).map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-3">
          {challenge.description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{challenge.description}</p>
          ) : null}

          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-muted-foreground">{t('labels.points')}</dt>
              <dd className="font-medium">{challenge.challenge_point}</dd>
            </div>
            {challenge.instance_required ? (
              <div>
                <dt className="text-muted-foreground">{t('labels.type')}</dt>
                <dd className="font-medium">{t('labels.instanceBased')}</dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>
    </Link>
  )
}
