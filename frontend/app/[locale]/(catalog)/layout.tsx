import { getTranslations } from 'next-intl/server'
import { UserAccessGate } from '@/components/layouts/AdminAccessGate'
import { UserLayout } from '@/components/layouts/UserLayout'

type CatalogSurfaceLayoutProps = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

/**
 * Layout for feature catalog pages (quizzes, courses, challenges).
 * Auth-protected, no nav sidebar — each catalog page renders its own
 * filter panel inside the content area.
 */
export default async function CatalogSurfaceLayout({ children, params }: CatalogSurfaceLayoutProps) {
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
