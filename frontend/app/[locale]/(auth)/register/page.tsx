import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { RegisterForm } from '@/components/features/auth/RegisterForm'

type RegisterPageProps = {
  params: Promise<{ locale: string }>
}

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { locale } = await params
  const t = await getTranslations('auth')

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">{t('registerTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('registerSubtitle')}</p>
      </div>

      <RegisterForm locale={locale} />

      <p className="text-sm text-muted-foreground">
        {t('alreadyHaveAccount')}{' '}
        <Link className="text-foreground underline" href={`/${locale}/login`}>
          {t('loginLink')}
        </Link>
      </p>
    </main>
  )
}
