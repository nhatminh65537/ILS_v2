import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { UserLayout } from '@/components/layouts/UserLayout'
import { Button } from '@/components/ui/button'

type LocaleHomeProps = {
  params: Promise<{ locale: string }>
}

export default async function LocaleHome({ params }: LocaleHomeProps) {
  const { locale } = await params
  const t = await getTranslations('home')
  const tCommon = await getTranslations('common')
  const tNav = await getTranslations('navigation')
  const tSurface = await getTranslations('surface')
  const tAdmin = await getTranslations('admin')

  return (
    <UserLayout
      adminPortalLabel={tAdmin('portalEntry')}
      brandLabel={tCommon('appName')}
      dashboardLabel={tNav('dashboard')}
      footerText={tSurface('footerText')}
      homeLabel={tNav('home')}
      quizzesLabel={tNav('quizzes')}
      locale={locale}
      profileLabel={tNav('profile')}
      showSidebar={false}
      sidebarTitle={tSurface('user.sidebarTitle')}
      surfaceLabel={tSurface('user.title')}
    >
      <section className="mx-auto flex w-full max-w-5xl flex-col justify-center gap-8 py-10 md:py-16">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">ILS v2</p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">{t('headline')}</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{t('description')}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href={`/${locale}/login`}>{t('loginCta')}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={`/${locale}/register`}>{t('registerCta')}</Link>
          </Button>
        </div>
      </section>
    </UserLayout>
  )
}
