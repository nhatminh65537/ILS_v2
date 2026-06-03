'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCourses } from '@/hooks/useCourses'
import { listLearnCategories, listLearnTags } from '@/services/courses.service'
import { type CourseCategory, type CourseListParams, type CourseTag } from '@/types/course.types'
import { CourseCard } from './CourseCard'
import { CourseFilterPanel, type CourseProgressFilter, type CourseStatusFilter } from './CourseFilterPanel'

type CourseCatalogClientProps = {
  locale: string
}

const PAGE_SIZE = 12

export function CourseCatalogClient({ locale }: CourseCatalogClientProps) {
  const t = useTranslations('courses')
  const { courses, isCatalogLoading, error, loadCourses } = useCourses()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CourseStatusFilter>('all')
  const [progressFilter, setProgressFilter] = useState<CourseProgressFilter>('all')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])

  const [availableCategories, setAvailableCategories] = useState<CourseCategory[]>([])
  const [availableTags, setAvailableTags] = useState<CourseTag[]>([])

  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<{ count: number; hasNext: boolean; hasPrevious: boolean }>({
    count: 0,
    hasNext: false,
    hasPrevious: false,
  })
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  // Snapshot of the filters that were actually applied (drives requests). The
  // editable filter state above only takes effect when "Apply" is pressed.
  const appliedRef = useRef<{ search: string; status: CourseStatusFilter; categoryIds: number[]; tagIds: number[] }>({
    search: '',
    status: 'all',
    categoryIds: [],
    tagIds: [],
  })

  const runQuery = useCallback(
    async (targetPage: number) => {
      const applied = appliedRef.current
      const params: CourseListParams = {
        limit: PAGE_SIZE,
        offset: (targetPage - 1) * PAGE_SIZE,
        ...(applied.search.trim() ? { search: applied.search.trim() } : {}),
        ...(applied.status !== 'all' ? { status: applied.status } : {}),
        ...(applied.categoryIds.length === 1 ? { category: applied.categoryIds[0] } : {}),
        ...(applied.tagIds.length > 0 ? { tags: applied.tagIds.join(',') } : {}),
      }

      const result = await loadCourses(params)
      setPagination({
        count: result.count,
        hasNext: Boolean(result.next),
        hasPrevious: Boolean(result.previous),
      })
      setPage(targetPage)
      setHasLoadedOnce(true)
    },
    [loadCourses]
  )

  // Initial load + taxonomy for filter options.
  useEffect(() => {
    void runQuery(1)
    void (async () => {
      try {
        const [cats, tags] = await Promise.all([listLearnCategories(), listLearnTags()])
        setAvailableCategories([...cats.items])
        setAvailableTags([...tags.items])
      } catch {
        // Taxonomy is optional for the catalog; ignore load failures.
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleApply = () => {
    appliedRef.current = {
      search,
      status: statusFilter,
      categoryIds: selectedCategoryIds,
      tagIds: selectedTagIds,
    }
    void runQuery(1)
  }

  const handleReset = () => {
    setSearch('')
    setStatusFilter('all')
    setProgressFilter('all')
    setSelectedCategoryIds([])
    setSelectedTagIds([])
    appliedRef.current = { search: '', status: 'all', categoryIds: [], tagIds: [] }
    void runQuery(1)
  }

  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    )
  }

  const handleTagToggle = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const totalPages = Math.max(1, Math.ceil(pagination.count / PAGE_SIZE))
  // Progress filter is applied client-side over the current page (the API has
  // no progress query param). 'not_started' = no progress or nothing completed,
  // 'in_progress' = some but not all lessons done, 'completed' = all done.
  const visibleCourses = courses.filter((course) => {
    if (progressFilter === 'all') {
      return true
    }
    const progress = course.user_progress
    const completed = progress?.completed ?? 0
    const total = progress?.total ?? 0
    if (progressFilter === 'not_started') {
      return completed === 0
    }
    if (progressFilter === 'in_progress') {
      return completed > 0 && completed < total
    }
    // completed
    return total > 0 && completed >= total
  })
  // Only show full skeletons on the very first load; subsequent filter/page
  // requests keep the existing grid mounted (smooth, no flicker).
  const showInitialSkeletons = isCatalogLoading && !hasLoadedOnce

  return (
    <div className="flex gap-6">
      <div className="hidden w-56 shrink-0 md:block">
        <div className="sticky top-24 rounded-lg border border-border bg-card p-4">
          <CourseFilterPanel
            search={search}
            statusFilter={statusFilter}
            progressFilter={progressFilter}
            selectedCategoryIds={selectedCategoryIds}
            selectedTagIds={selectedTagIds}
            availableCategories={availableCategories}
            availableTags={availableTags}
            isLoading={isCatalogLoading}
            onSearchChange={setSearch}
            onStatusChange={setStatusFilter}
            onProgressChange={setProgressFilter}
            onCategoryToggle={handleCategoryToggle}
            onTagToggle={handleTagToggle}
            onApply={handleApply}
            onReset={handleReset}
          />
        </div>
      </div>

      <section className="min-w-0 flex-1 space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold md:text-4xl">{t('title')}</h1>
          <p className="text-muted-foreground">{t('catalog.subtitle')}</p>
        </header>

        {showInitialSkeletons ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{t('errors.loadFailed')}</p>
        ) : visibleCourses.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty.noResults')}</p>
        ) : (
          <div className={isCatalogLoading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleCourses.map((course) => (
                <CourseCard key={course.id} course={course} locale={locale} />
              ))}
            </div>
          </div>
        )}

        {pagination.count > PAGE_SIZE ? (
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-muted-foreground">
              {t('catalog.pageOf', { page, total: totalPages })}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasPrevious || isCatalogLoading}
                onClick={() => void runQuery(page - 1)}
              >
                {t('catalog.previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasNext || isCatalogLoading}
                onClick={() => void runQuery(page + 1)}
              >
                {t('catalog.next')}
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
