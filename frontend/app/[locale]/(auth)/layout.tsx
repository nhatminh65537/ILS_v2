import { getTranslations } from 'next-intl/server'
import { AuthLayout } from '@/components/layouts/AuthLayout'
import { GuestOnlyGate } from '@/components/layouts/AdminAccessGate'

type UserAuthLayoutProps = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function UserAuthLayout({ children, params }: UserAuthLayoutProps) {
  const { locale } = await params
  const tCommon = await getTranslations('common')
  const tNav = await getTranslations('navigation')
  const tSurface = await getTranslations('surface')

  return (
    <GuestOnlyGate loadingLabel={tCommon('loading')} redirectTo={`/${locale}/dashboard`}>
      <AuthLayout
        locale={locale}
        brandHref={`/${locale}`}
        brandLabel={tCommon('appName')}
        footerText={tSurface('footerText')}
        homeLabel={tNav('home')}
        surfaceLabel={tSurface('user.authTitle')}
      >
        {children}
      </AuthLayout>
    </GuestOnlyGate>
  )
}
