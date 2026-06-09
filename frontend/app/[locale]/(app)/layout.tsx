import { getTranslations } from 'next-intl/server'
import { UserAccessGate } from '@/components/layouts/AdminAccessGate'
import { UserLayout } from '@/components/layouts/UserLayout'

type UserSurfaceLayoutProps = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function UserSurfaceLayout({ children, params }: UserSurfaceLayoutProps) {
  const { locale } = await params
  const tCommon = await getTranslations('common')
  const tNav = await getTranslations('navigation')
  const tSurface = await getTranslations('surface')
  const tAdmin = await getTranslations('admin')

  return (
    <UserAccessGate loadingLabel={tSurface('user.loadingAccess')} locale={locale}>
      <UserLayout
        adminPortalLabel={tAdmin('portalEntry')}
        brandLabel={tCommon('appName')}
        challengesLabel={tNav('challenges')}
        coursesLabel={tNav('courses')}
        dashboardLabel={tNav('dashboard')}
        footerText={tSurface('footerText')}
        homeLabel={tNav('home')}
        leaderboardLabel={tNav('leaderboard')}
        locale={locale}
        profileLabel={tNav('profile')}
        quizzesLabel={tNav('quizzes')}
        showSidebar={false}
        sidebarTitle={tSurface('user.sidebarTitle')}
        surfaceLabel={tSurface('user.title')}
      >
        {children}
      </UserLayout>
    </UserAccessGate>
  )
}
