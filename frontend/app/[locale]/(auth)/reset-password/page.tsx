import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { ResetPasswordForm } from '@/components/features/auth/ResetPasswordForm'

type ResetPasswordPageProps = {
  params: Promise<{ locale: string }>
}

export default async function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const { locale } = await params
  const t = await getTranslations('auth')

  return (
    <section className="w-full space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">{t('resetPasswordTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('resetPasswordSubtitle')}</p>
      </div>

      {/* useSearchParams in ResetPasswordForm requires a Suspense boundary. */}
      <Suspense fallback={null}>
        <ResetPasswordForm locale={locale} />
      </Suspense>
    </section>
  )
}
