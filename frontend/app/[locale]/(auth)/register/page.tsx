import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

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

      <form className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="username">
            {t('username')}
          </label>
          <input
            id="username"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder={t('usernamePlaceholder')}
            type="text"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">
            {t('email')}
          </label>
          <input
            id="email"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder={t('emailPlaceholder')}
            type="email"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="password">
            {t('password')}
          </label>
          <input
            id="password"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder={t('passwordPlaceholder')}
            type="password"
          />
        </div>
        <button className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground" type="button">
          {t('registerButton')}
        </button>
      </form>

      <p className="text-sm text-muted-foreground">
        {t('alreadyHaveAccount')}{' '}
        <Link className="text-foreground underline" href={`/${locale}/login`}>
          {t('loginLink')}
        </Link>
      </p>
    </main>
  )
}
