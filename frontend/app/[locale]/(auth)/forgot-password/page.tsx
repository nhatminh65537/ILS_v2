import { getTranslations } from 'next-intl/server'
import { ForgotPasswordForm } from '@/components/features/auth/ForgotPasswordForm'

type ForgotPasswordPageProps = {
  params: Promise<{ locale: string }>
}

export default async function ForgotPasswordPage({ params }: ForgotPasswordPageProps) {
  const { locale } = await params
  const t = await getTranslations('auth')

  return (
    <section className="w-full space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">{t('forgotPasswordTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('forgotPasswordSubtitle')}</p>
      </div>

      <ForgotPasswordForm locale={locale} />
    </section>
  )
}
