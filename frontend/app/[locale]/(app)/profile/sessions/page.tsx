import { getTranslations } from 'next-intl/server'
import { ProfileSessionsView } from '@/components/features/profile/ProfileSessionsView'

type ProfileSessionsPageProps = {
  params: Promise<{ locale: string }>
}

export default async function ProfileSessionsPage({ params }: ProfileSessionsPageProps) {
  const { locale } = await params
  const t = await getTranslations('profile')

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold md:text-4xl">{t('sessions.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('sessions.subtitle')}</p>
      </header>
      <ProfileSessionsView locale={locale} />
    </section>
  )
}
