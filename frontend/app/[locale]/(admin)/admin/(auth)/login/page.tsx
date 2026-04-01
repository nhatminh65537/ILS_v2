import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { AdminLoginForm } from '@/components/features/auth/AdminLoginForm'

type AdminLoginPageProps = {
  params: Promise<{ locale: string }>
}

export default async function AdminLoginPage({ params }: AdminLoginPageProps) {
  const { locale } = await params
  const t = await getTranslations('adminAuth')

  return (
    <section className="w-full space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <AdminLoginForm locale={locale} />

      <p className="text-sm text-muted-foreground">
        {t('userLoginHint')}{' '}
        <Link className="text-foreground underline" href={`/${locale}/login`}>
          {t('userLoginLink')}
        </Link>
      </p>
    </section>
  )
}
