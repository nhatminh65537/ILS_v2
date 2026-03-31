import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

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
          {t('loginButton')}
        </button>
      </form>

      <p className="text-sm text-muted-foreground">
        {t('noAccount')}{' '}
        <Link className="text-foreground underline" href={`/${locale}/register`}>
          {t('registerLink')}
        </Link>
      </p>
    </main>
  )
}
