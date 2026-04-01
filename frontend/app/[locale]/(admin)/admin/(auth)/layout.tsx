import { getTranslations } from 'next-intl/server'
import { GuestOnlyGate } from '@/components/layouts/AdminAccessGate'
import { AuthLayout } from '@/components/layouts/AuthLayout'

type AdminAuthLayoutProps = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function AdminAuthLayout({ children, params }: AdminAuthLayoutProps) {
  const { locale } = await params
  const tCommon = await getTranslations('common')
  const tSurface = await getTranslations('surface')

  return (
    <GuestOnlyGate loadingLabel={tCommon('loading')} redirectTo={`/${locale}/admin/rbac`}>
      <AuthLayout
        locale={locale}
        brandHref={`/${locale}/admin`}
        brandLabel={tCommon('appName')}
        footerText={tSurface('footerText')}
        homeLabel={tSurface('admin.homeLabel')}
        surfaceLabel={tSurface('admin.authTitle')}
      >
        {children}
      </AuthLayout>
    </GuestOnlyGate>
  )
}
