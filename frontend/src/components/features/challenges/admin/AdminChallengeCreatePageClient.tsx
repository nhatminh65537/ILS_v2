'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAdminChallenges } from '@/hooks/useAdminChallenges'
import type { CreateChallengePayload } from '@/types/challenge.types'
import { AdminChallengeForm } from './AdminChallengeForm'

type AdminChallengeCreatePageClientProps = {
  locale: string
}

export function AdminChallengeCreatePageClient({ locale }: AdminChallengeCreatePageClientProps) {
  const t = useTranslations('adminChallenges')
  const router = useRouter()
  const {
    taxonomyState,
    isMutating,
    mutationErrorKey,
    loadTaxonomies,
    submitCreateChallenge,
  } = useAdminChallenges()

  useEffect(() => {
    void loadTaxonomies()
  }, [loadTaxonomies])

  const handleSubmit = async (payload: CreateChallengePayload) => {
    const created = await submitCreateChallenge(payload)
    if (created?.slug) {
      router.push(`/${locale}/admin/challenges/${created.slug}`)
    }
  }

  return (
    <section className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{t('create.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('create.subtitle')}</p>
        <Link className="text-xs underline" href={`/${locale}/admin/challenges`}>
          {t('navigation.backToList')}
        </Link>
      </header>

      {mutationErrorKey ? <p className="text-sm text-destructive">{t(mutationErrorKey as never)}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('create.formTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminChallengeForm
            mode="create"
            categories={taxonomyState.categories}
            tags={taxonomyState.tags}
            isSubmitting={isMutating}
            submitLabel={t('actions.createChallenge')}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>
    </section>
  )
}
