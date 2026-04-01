import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button'

type LocaleHomeProps = {
  params: Promise<{ locale: string }>
}

export default async function LocaleHome({ params }: LocaleHomeProps) {
  const { locale } = await params
  const t = await getTranslations('home')

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-16 md:px-10">
      <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">ILS v2</p>
      <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">{t('headline')}</h1>
      <p className="max-w-2xl text-lg text-muted-foreground">{t('description')}</p>
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href={`/${locale}/login`}>{t('loginCta')}</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href={`/${locale}/register`}>{t('registerCta')}</Link>
        </Button>
      </div>
    </main>
  )
}
