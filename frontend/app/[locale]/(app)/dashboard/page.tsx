import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminPortalCard } from '@/components/features/dashboard/AdminPortalCard'

type DashboardPageProps = {
  params: Promise<{ locale: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params
  const t = await getTranslations('dashboard')

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold md:text-4xl">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('cards.learnTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t('cards.learnDescription')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('cards.challengeTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t('cards.challengeDescription')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('cards.quizTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t('cards.quizDescription')}</p>
          </CardContent>
        </Card>
        <AdminPortalCard locale={locale} />
      </section>
    </section>
  )
}
