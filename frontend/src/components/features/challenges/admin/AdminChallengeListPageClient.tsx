'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAdminChallenges } from '@/hooks/useAdminChallenges'
import { ChallengeDifficulty, type Challenge } from '@/types/challenge.types'
import { AdminChallengeCategoryDialog } from './AdminChallengeCategoryDialog'
import { AdminChallengeTagDialog } from './AdminChallengeTagDialog'

type AdminChallengeListPageClientProps = {
  locale: string
}

const DIFFICULTY_COLORS: Record<ChallengeDifficulty, string> = {
  [ChallengeDifficulty.Easy]: 'bg-green-100 text-green-800',
  [ChallengeDifficulty.Medium]: 'bg-yellow-100 text-yellow-800',
  [ChallengeDifficulty.Hard]: 'bg-orange-100 text-orange-800',
  [ChallengeDifficulty.Insane]: 'bg-red-100 text-red-800',
}

export function AdminChallengeListPageClient({ locale }: AdminChallengeListPageClientProps) {
  const t = useTranslations('adminChallenges')
  const {
    listState,
    taxonomyState,
    paginationState,
    isMutating,
    mutationErrorKey,
    loadChallengeList,
    loadChallengePage,
    loadTaxonomies,
    submitDeleteChallenge,
    submitStatusToggle,
    submitCreateCategory,
    submitUpdateCategory,
    submitDeleteCategory,
    submitCreateTag,
    submitUpdateTag,
    submitDeleteTag,
  } = useAdminChallenges()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [tagDialogOpen, setTagDialogOpen] = useState(false)

  useEffect(() => {
    void loadChallengeList({ status: 'all' })
    void loadTaxonomies()
  }, [loadChallengeList, loadTaxonomies])

  const handleRefresh = async () => {
    await loadChallengeList({ search: search.trim(), status: statusFilter })
  }

  const handleDelete = async (challenge: Challenge) => {
    if (!window.confirm(t('confirm.deleteChallenge', { title: challenge.title }))) return
    await submitDeleteChallenge(challenge.slug)
  }

  const handleStatusToggle = async (challenge: Challenge, value: string) => {
    if (value === challenge.status) return
    await submitStatusToggle(challenge, value)
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  const getCategoryName = (challenge: Challenge) => {
    const cat = challenge.category
    if (!cat) return '-'
    if (typeof cat === 'object') return cat.name
    const found = taxonomyState.categories.find((c) => c.id === cat)
    return found?.name ?? challenge.category_name ?? String(cat)
  }

  return (
    <section className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>

      {mutationErrorKey ? <p className="text-sm text-destructive">{t(mutationErrorKey as never)}</p> : null}
      {listState.errorMessageKey ? <p className="text-sm text-destructive">{t(listState.errorMessageKey as never)}</p> : null}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>{t('list.title')}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCategoryDialogOpen(true)}>{t('taxonomy.manageCategories')}</Button>
            <Button variant="outline" onClick={() => setTagDialogOpen(true)}>{t('taxonomy.manageTags')}</Button>
            <Button asChild>
              <Link href={`/${locale}/admin/challenges/new`}>{t('actions.createChallenge')}</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 text-sm"
              value={search}
              placeholder={t('toolbar.searchPlaceholder')}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('toolbar.statusAll')}</SelectItem>
                <SelectItem value="draft">{t('status.draft')}</SelectItem>
                <SelectItem value="published">{t('status.published')}</SelectItem>
                <SelectItem value="archived">{t('status.archived')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => void handleRefresh()}>{t('actions.refresh')}</Button>
          </div>

          {listState.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, idx) => <Skeleton key={idx} className="h-10 w-full" />)}
            </div>
          ) : !listState.data || listState.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('empty.noChallenges')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columns.title')}</TableHead>
                  <TableHead>{t('columns.slug')}</TableHead>
                  <TableHead>{t('columns.category')}</TableHead>
                  <TableHead>{t('columns.difficulty')}</TableHead>
                  <TableHead>{t('columns.status')}</TableHead>
                  <TableHead>{t('columns.updatedAt')}</TableHead>
                  <TableHead className="text-right">{t('columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listState.data.map((challenge) => (
                  <TableRow key={challenge.id}>
                    <TableCell className="font-medium">{challenge.title}</TableCell>
                    <TableCell>{challenge.slug}</TableCell>
                    <TableCell>{getCategoryName(challenge)}</TableCell>
                    <TableCell>
                      {challenge.difficulty ? (
                        <Badge className={DIFFICULTY_COLORS[challenge.difficulty] ?? ''}>
                          {t(`difficulty.${challenge.difficulty}` as never)}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{t(`status.${challenge.status}` as never)}</Badge>
                        <Select value={challenge.status} onValueChange={(v) => void handleStatusToggle(challenge, v)}>
                          <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">{t('status.draft')}</SelectItem>
                            <SelectItem value="published">{t('status.published')}</SelectItem>
                            <SelectItem value="archived">{t('status.archived')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(challenge.updated_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/${locale}/admin/challenges/${challenge.slug}`}>{t('actions.edit')}</Link>
                        </Button>
                        <Button variant="destructive" size="sm" disabled={isMutating} onClick={() => void handleDelete(challenge)}>
                          {t('actions.delete')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!listState.isLoading && listState.data && listState.data.length > 0 ? (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-muted-foreground">{t('pagination.total', { total: paginationState.count })}</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={!paginationState.hasPrevious || listState.isLoading} onClick={() => void loadChallengePage(paginationState.page - 1)}>
                  {t('pagination.previous')}
                </Button>
                <span className="text-sm">{t('pagination.page', { page: paginationState.page })}</span>
                <Button size="sm" variant="outline" disabled={!paginationState.hasNext || listState.isLoading} onClick={() => void loadChallengePage(paginationState.page + 1)}>
                  {t('pagination.next')}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <AdminChallengeCategoryDialog
        open={categoryDialogOpen}
        categories={taxonomyState.categories}
        isSubmitting={isMutating}
        onOpenChange={setCategoryDialogOpen}
        onCreate={submitCreateCategory}
        onUpdate={submitUpdateCategory}
        onDelete={submitDeleteCategory}
      />

      <AdminChallengeTagDialog
        open={tagDialogOpen}
        tags={taxonomyState.tags}
        isSubmitting={isMutating}
        onOpenChange={setTagDialogOpen}
        onCreate={submitCreateTag}
        onUpdate={submitUpdateTag}
        onDelete={submitDeleteTag}
      />
    </section>
  )
}
