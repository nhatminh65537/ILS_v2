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
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useAdminLearnCourses } from '@/hooks/useAdminLearnCourses'
import { ContentStatus, type Course } from '@/types/course.types'
import { AdminLearnCategoryDialog } from './AdminLearnCategoryDialog'
import { AdminLearnTagDialog } from './AdminLearnTagDialog'

type AdminLearnCourseListPageClientProps = {
  locale: string
}

type StatusFilter = 'all' | ContentStatus

export function AdminLearnCourseListPageClient({ locale }: AdminLearnCourseListPageClientProps) {
  const t = useTranslations('adminLearn')
  const {
    listState,
    taxonomyState,
    paginationState,
    isMutating,
    mutationErrorKey,
    loadCourseList,
    loadCoursePage,
    loadTaxonomies,
    submitArchiveCourse,
    submitPurgeCourse,
    submitStatusToggle,
    submitCreateCategory,
    submitUpdateCategory,
    submitDeleteCategory,
    submitCreateTag,
    submitUpdateTag,
    submitDeleteTag,
  } = useAdminLearnCourses()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [tagDialogOpen, setTagDialogOpen] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<Course | null>(null)
  const [purgeTarget, setPurgeTarget] = useState<Course | null>(null)

  useEffect(() => {
    void loadCourseList({ status: 'all' })
    void loadTaxonomies()
  }, [loadCourseList, loadTaxonomies])

  const handleRefresh = async () => {
    await loadCourseList({ search: search.trim(), status: statusFilter })
  }

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) {
      return
    }
    const ok = await submitArchiveCourse(archiveTarget.slug)
    if (ok) {
      setArchiveTarget(null)
    }
  }

  const handlePurgeConfirm = async () => {
    if (!purgeTarget) {
      return
    }
    const ok = await submitPurgeCourse(purgeTarget.slug)
    if (ok) {
      setPurgeTarget(null)
    }
  }

  const handleStatusToggle = async (course: Course, value: string) => {
    if (value === course.status) {
      return
    }

    await submitStatusToggle(course, value as ContentStatus)
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

      {mutationErrorKey ? <p className="text-sm text-destructive">{t(mutationErrorKey as never)}</p> : null}
      {listState.errorMessageKey ? <p className="text-sm text-destructive">{t(listState.errorMessageKey as never)}</p> : null}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>{t('list.title')}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCategoryDialogOpen(true)}>{t('taxonomy.manageCategories')}</Button>
            <Button variant="outline" onClick={() => setTagDialogOpen(true)}>{t('taxonomy.manageTags')}</Button>
            <Button asChild>
              <Link href={`/${locale}/admin/learn/courses/new`}>{t('actions.createCourse')}</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 text-sm"
              value={search}
              placeholder={t('toolbar.searchPlaceholder')}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('toolbar.statusAll')}</SelectItem>
                <SelectItem value={ContentStatus.Draft}>{t('status.draft')}</SelectItem>
                <SelectItem value={ContentStatus.Published}>{t('status.published')}</SelectItem>
                <SelectItem value={ContentStatus.Archived}>{t('status.archived')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => void handleRefresh()}>{t('actions.refresh')}</Button>
          </div>

          {listState.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Skeleton key={idx} className="h-10 w-full" />
              ))}
            </div>
          ) : listState.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('empty.noCourses')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columns.title')}</TableHead>
                  <TableHead>{t('columns.slug')}</TableHead>
                  <TableHead>{t('columns.category')}</TableHead>
                  <TableHead>{t('columns.status')}</TableHead>
                  <TableHead>{t('columns.totalLessons')}</TableHead>
                  <TableHead>{t('columns.updatedAt')}</TableHead>
                  <TableHead className="text-right">{t('columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listState.data.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">{course.title}</TableCell>
                    <TableCell>{course.slug}</TableCell>
                    <TableCell>{course.category?.name ?? '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{t(`status.${course.status}` as never)}</Badge>
                        <Select
                          value={course.status}
                          onValueChange={(value) => void handleStatusToggle(course, value)}
                        >
                          <SelectTrigger className="h-8 w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ContentStatus.Draft}>{t('status.draft')}</SelectItem>
                            <SelectItem value={ContentStatus.Published}>{t('status.published')}</SelectItem>
                            <SelectItem value={ContentStatus.Archived}>{t('status.archived')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell>{course.user_progress?.total ?? '-'}</TableCell>
                    <TableCell>{formatDate(course.updated_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/${locale}/admin/learn/courses/${course.slug}`}>{t('actions.edit')}</Link>
                        </Button>
                        {course.status !== ContentStatus.Archived ? (
                          <Button variant="outline" size="sm" disabled={isMutating} onClick={() => setArchiveTarget(course)}>
                            {t('actions.archive')}
                          </Button>
                        ) : null}
                        <Button variant="destructive" size="sm" disabled={isMutating} onClick={() => setPurgeTarget(course)}>
                          {t('actions.purge')}
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
                  size="sm"
                  variant="outline"
                  disabled={!paginationState.hasPrevious || listState.isLoading}
                  onClick={() => void loadCoursePage(paginationState.page - 1)}
                >
                  {t('pagination.previous')}
                </Button>
                <span className="text-sm">{t('pagination.page', { page: paginationState.page })}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!paginationState.hasNext || listState.isLoading}
                  onClick={() => void loadCoursePage(paginationState.page + 1)}
                >
                  {t('pagination.next')}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <AdminLearnCategoryDialog
        open={categoryDialogOpen}
        categories={taxonomyState.categories}
        isSubmitting={isMutating}
        onOpenChange={setCategoryDialogOpen}
        onCreate={submitCreateCategory}
        onUpdate={submitUpdateCategory}
        onDelete={submitDeleteCategory}
      />

      <AdminLearnTagDialog
        open={tagDialogOpen}
        tags={taxonomyState.tags}
        isSubmitting={isMutating}
        onOpenChange={setTagDialogOpen}
        onCreate={submitCreateTag}
        onUpdate={submitUpdateTag}
        onDelete={submitDeleteTag}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        title={t('confirm.archiveTitle')}
        description={archiveTarget ? t('confirm.archiveCourse', { title: archiveTarget.title }) : undefined}
        confirmLabel={t('actions.archive')}
        cancelLabel={t('actions.cancel')}
        isLoading={isMutating}
        onConfirm={handleArchiveConfirm}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
      />

      <ConfirmDialog
        open={purgeTarget !== null}
        title={t('confirm.purgeTitle')}
        description={purgeTarget ? t('confirm.purgeCourse', { title: purgeTarget.title }) : undefined}
        confirmLabel={t('actions.purge')}
        cancelLabel={t('actions.cancel')}
        variant="destructive"
        isLoading={isMutating}
        requireText={purgeTarget?.slug}
        requireTextLabel={t('confirm.purgeTypeSlug')}
        onConfirm={handlePurgeConfirm}
        onOpenChange={(open) => !open && setPurgeTarget(null)}
      />
    </section>
  )
}
