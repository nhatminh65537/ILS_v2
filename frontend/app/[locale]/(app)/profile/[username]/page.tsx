import { getTranslations } from 'next-intl/server'
import { PublicProfileView } from '@/components/features/profile/PublicProfileView'

type PublicProfilePageProps = {
  params: Promise<{ locale: string; username: string }>
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { locale, username } = await params
  const t = await getTranslations('profile')

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold md:text-4xl">{t('publicProfileTitle')}</h1>
      </header>
      <PublicProfileView locale={locale} username={username} />
    </section>
  )
}
