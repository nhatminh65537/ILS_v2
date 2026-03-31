import { getTranslations } from 'next-intl/server'

export default async function DashboardPage() {
  const t = await getTranslations('dashboard')

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold md:text-4xl">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-medium">{t('cards.learnTitle')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t('cards.learnDescription')}</p>
        </article>
        <article className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-medium">{t('cards.challengeTitle')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t('cards.challengeDescription')}</p>
        </article>
        <article className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-medium">{t('cards.quizTitle')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t('cards.quizDescription')}</p>
        </article>
      </section>
    </main>
  )
}
