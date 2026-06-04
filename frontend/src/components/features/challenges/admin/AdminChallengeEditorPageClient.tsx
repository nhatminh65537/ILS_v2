'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAdminChallenges } from '@/hooks/useAdminChallenges'
import type { UpdateChallengePayload } from '@/types/challenge.types'
import { AdminChallengeMetadataTab } from './AdminChallengeMetadataTab'
import { AdminChallengeFlagsTab } from './AdminChallengeFlagsTab'

type AdminChallengeEditorPageClientProps = {
  locale: string
  slug: string
}

export function AdminChallengeEditorPageClient({ locale, slug }: AdminChallengeEditorPageClientProps) {
  const t = useTranslations('adminChallenges')
  const {
    detailState,
    taxonomyState,
    isMutating,
    mutationErrorKey,
    loadChallengeDetail,
    loadTaxonomies,
    submitUpdateChallenge,
  } = useAdminChallenges()

  useEffect(() => {
    void loadChallengeDetail(slug)
    void loadTaxonomies()
  }, [loadChallengeDetail, loadTaxonomies, slug])

  return (
    <section className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{t('editor.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('editor.subtitle')}</p>
        <Link className="text-xs underline" href={`/${locale}/admin/challenges`}>
          {t('navigation.backToExplorer')}
        </Link>
      </header>

      {detailState.errorMessageKey ? <p className="text-sm text-destructive">{t(detailState.errorMessageKey as never)}</p> : null}
      {mutationErrorKey ? <p className="text-sm text-destructive">{t(mutationErrorKey as never)}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>
            {detailState.data ? detailState.data.title : t('editor.loadingTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {detailState.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : detailState.data ? (
            <Tabs defaultValue="metadata" className="space-y-4">
              <TabsList>
                <TabsTrigger value="metadata">{t('tabs.metadata')}</TabsTrigger>
                <TabsTrigger value="flags">{t('tabs.flags')}</TabsTrigger>
              </TabsList>
              <TabsContent value="metadata" className="space-y-4">
                <AdminChallengeMetadataTab
                  challenge={detailState.data}
                  categories={taxonomyState.categories}
                  tags={taxonomyState.tags}
                  isSubmitting={isMutating}
                  onSubmit={(payload) => submitUpdateChallenge(slug, payload as UpdateChallengePayload)}
                />
              </TabsContent>
              <TabsContent value="flags" className="space-y-4">
                <AdminChallengeFlagsTab slug={slug} />
              </TabsContent>
            </Tabs>
          ) : (
            <p className="text-sm text-muted-foreground">{t('empty.noChallenge')}</p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
