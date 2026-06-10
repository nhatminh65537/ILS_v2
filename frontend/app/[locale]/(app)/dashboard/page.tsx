import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ArrowRight, BookOpen, Flag, ListChecks, Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminPortalCard } from '@/components/features/dashboard/AdminPortalCard'

type DashboardPageProps = {
  params: Promise<{ locale: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params
  const t = await getTranslations('dashboard')

  const cards = [
    {
      key: 'learn',
      href: `/${locale}/courses`,
      title: t('cards.learnTitle'),
      description: t('cards.learnDescription'),
      Icon: BookOpen,
    },
    {
      key: 'challenge',
      href: `/${locale}/challenges`,
      title: t('cards.challengeTitle'),
      description: t('cards.challengeDescription'),
      Icon: Flag,
    },
    {
      key: 'quiz',
      href: `/${locale}/quizzes`,
      title: t('cards.quizTitle'),
      description: t('cards.quizDescription'),
      Icon: ListChecks,
    },
    {
      key: 'leaderboard',
      href: `/${locale}/leaderboard`,
      title: t('cards.leaderboardTitle'),
      description: t('cards.leaderboardDescription'),
      Icon: Trophy,
    },
  ] as const

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold md:text-4xl">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ key, href, title, description, Icon }) => (
          <Link key={key} href={href} className="group focus-visible:outline-none">
            <Card className="h-full transition-colors group-hover:border-primary group-hover:bg-accent/40 group-focus-visible:ring-2 group-focus-visible:ring-ring">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2">
                  <Icon className="size-5 text-muted-foreground" aria-hidden />
                  {title}
                </CardTitle>
                <ArrowRight
                  className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1"
                  aria-hidden
                />
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-muted-foreground">{description}</p>
                <span className="text-sm font-medium text-primary">{t('cards.cta')}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
        <AdminPortalCard locale={locale} />
      </section>
    </section>
  )
}
