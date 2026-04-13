'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
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
import { useAdminQuizzes } from '@/hooks/useAdminQuizzes'
import { ContentStatus, type Quiz } from '@/types/quiz.types'

type AdminQuizListPageClientProps = {
  locale: string
}

type StatusFilter = 'all' | ContentStatus

export function AdminQuizListPageClient({ locale }: AdminQuizListPageClientProps) {
  const t = useTranslations('adminQuizzes')
  const {
    listState,
    paginationState,
    isMutating,
    mutationErrorKey,
    loadList,
    loadPage,
    submitDelete,
  } = useAdminQuizzes()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    void loadList({ status: 'all' })
  }, [loadList])

  const filteredData = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) {
      return listState.data
    }

    return listState.data.filter((quiz) => {
      const title = quiz.title.toLowerCase()
      const description = (quiz.description ?? '').toLowerCase()
      return title.includes(query) || description.includes(query)
    })
  }, [listState.data, search])

  const handleRefresh = async () => {
    await loadList({ status: statusFilter })
  }

  const handleStatusFilter = async (value: StatusFilter) => {
    setStatusFilter(value)
    await loadList({ status: value })
  }

  const handleDelete = async (quiz: Quiz) => {
    const confirmed = window.confirm(t('confirmDelete', { title: quiz.title }))
    if (!confirmed) {
      return
    }

    await submitDelete(quiz.id)
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  return (
    <section className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>

      {mutationErrorKey ? <p className="text-sm text-destructive">{t(mutationErrorKey as Parameters<typeof t>[0])}</p> : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('listTitle')}</CardTitle>
          <Button asChild>
            <Link href={`/${locale}/admin/quizzes/new`}>{t('actions.create')}</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 text-sm"
              placeholder={t('toolbar.searchPlaceholder')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select value={statusFilter} onValueChange={(value) => void handleStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t('toolbar.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('toolbar.all')}</SelectItem>
                <SelectItem value={ContentStatus.Draft}>{t('status.draft')}</SelectItem>
                <SelectItem value={ContentStatus.Published}>{t('status.published')}</SelectItem>
                <SelectItem value={ContentStatus.Archived}>{t('status.archived')}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => void handleRefresh()} size="sm" variant="outline">
              {t('toolbar.refresh')}
            </Button>
          </div>

          {listState.errorMessageKey ? <p className="text-sm text-destructive">{t(listState.errorMessageKey as Parameters<typeof t>[0])}</p> : null}

          {listState.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('empty.noResults')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columns.title')}</TableHead>
                  <TableHead>{t('columns.status')}</TableHead>
                  <TableHead>{t('columns.totalQuestions')}</TableHead>
                  <TableHead>{t('columns.quizPoint')}</TableHead>
                  <TableHead>{t('columns.timeLimit')}</TableHead>
                  <TableHead>{t('columns.updatedAt')}</TableHead>
                  <TableHead className="text-right">{t('columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((quiz) => (
                  <TableRow key={quiz.id}>
                    <TableCell className="font-medium">{quiz.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{t(`status.${quiz.status}` as Parameters<typeof t>[0])}</Badge>
                    </TableCell>
                    <TableCell>{quiz.total_questions}</TableCell>
                    <TableCell>{quiz.quiz_point}</TableCell>
                    <TableCell>{quiz.time_limit_sec ?? 0}</TableCell>
                    <TableCell>{formatDate(quiz.updated_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/${locale}/admin/quizzes/${quiz.id}`}>{t('actions.edit')}</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/${locale}/admin/quizzes/${quiz.id}/questions`}>{t('actions.manageQuestions')}</Link>
                        </Button>
                        <Button
                          disabled={isMutating}
                          size="sm"
                          variant="destructive"
                          onClick={() => void handleDelete(quiz)}
                        >
                          {t('actions.delete')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!listState.isLoading && listState.data.length > 0 ? (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-muted-foreground">{t('pagination.total', { total: paginationState.count })}</span>
              <div className="flex items-center gap-2">
                <Button
                  disabled={!paginationState.hasPrevious || listState.isLoading}
                  size="sm"
                  variant="outline"
                  onClick={() => void loadPage(paginationState.page - 1)}
                >
                  {t('pagination.previous')}
                </Button>
                <span className="text-sm">{t('pagination.page', { page: paginationState.page })}</span>
                <Button
                  disabled={!paginationState.hasNext || listState.isLoading}
                  size="sm"
                  variant="outline"
                  onClick={() => void loadPage(paginationState.page + 1)}
                >
                  {t('pagination.next')}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  )
}
