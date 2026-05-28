import { getTranslations } from 'next-intl/server'
import { AdminAccessGate } from '@/components/layouts/AdminAccessGate'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { AdminProtectedSectionGate } from '@/components/layouts/AdminProtectedSectionGate'

type AdminProtectedLayoutProps = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function AdminProtectedLayout({
  children,
  params,
}: AdminProtectedLayoutProps) {
  const { locale } = await params
  const tCommon = await getTranslations('common')
  const tAdmin = await getTranslations('admin')
  const tSurface = await getTranslations('surface')

  return (
    <AdminAccessGate loadingLabel={tSurface('admin.loadingAccess')} locale={locale}>
      <AdminLayout
        adminHomeLabel={tSurface('admin.homeLabel')}
        brandLabel={tCommon('appName')}
        challengesLabel={tAdmin('challenges')}
        configLabel={tAdmin('config')}
        coursesLabel={tAdmin('courses')}
        dashboardLabel={tAdmin('dashboard')}
        footerText={tSurface('footerText')}
        locale={locale}
        notificationsLabel={tAdmin('notifications')}
        quizzesLabel={tAdmin('quizzes')}
        rbacLabel={tAdmin('rbac')}
        sidebarTitle={tSurface('admin.sidebarTitle')}
        statisticsLabel={tAdmin('statistics')}
        surfaceLabel={tSurface('admin.title')}
        usersLabel={tAdmin('users')}
        userPortalLabel={tSurface('admin.userPortalLabel')}
      >
        <AdminProtectedSectionGate locale={locale} loadingLabel={tSurface('admin.loadingAccess')}>
          {children}
        </AdminProtectedSectionGate>
      </AdminLayout>
    </AdminAccessGate>
  )
}
