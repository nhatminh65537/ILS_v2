import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { LoginForm } from '@/components/features/auth/LoginForm'

type LoginPageProps = {
  params: Promise<{ locale: string }>
}

export default async function LoginPage({ params }: LoginPageProps) {
  const { locale } = await params
  const t = await getTranslations('auth')

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">{t('loginTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('loginSubtitle')}</p>
      </div>

      <LoginForm locale={locale} />

      <p className="text-sm text-muted-foreground">
        {t('noAccount')}{' '}
        <Link className="text-foreground underline" href={`/${locale}/register`}>
          {t('registerLink')}
        </Link>
      </p>
    </main>
  )
}
