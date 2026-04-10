import { getTranslations } from 'next-intl/server'
import { ProfileSettingsView } from '@/components/features/profile/ProfileSettingsView'

type ProfileSettingsPageProps = {
  params: Promise<{ locale: string }>
}

export default async function ProfileSettingsPage({ params }: ProfileSettingsPageProps) {
  await params
  const t = await getTranslations('profile')

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold md:text-4xl">{t('settingsTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('settingsSubtitle')}</p>
      </header>
      <ProfileSettingsView />
    </section>
  )
}
