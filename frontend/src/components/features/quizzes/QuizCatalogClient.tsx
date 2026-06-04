'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  listQuizCategories,
  listQuizFolderContents,
  listQuizTags,
  listQuizzes,
} from '@/services/quizzes.service'
import type {
  Quiz,
  QuizBreadcrumbCrumb,
  QuizCategory,
  QuizExplorerNode,
  QuizTag,
} from '@/types/quiz.types'
import { QuizBreadcrumb } from './QuizBreadcrumb'
import { QuizCard } from './QuizCard'
import { QuizFilterPanel, type QuizSolvedFilter } from './QuizFilterPanel'
import { QuizFolderCard } from './QuizFolderCard'

type QuizCatalogClientProps = {
  locale: string
}

const PAGE_SIZE = 12

/** Map an explorer item-node quiz summary into the Quiz shape the card expects. */
function summaryToQuiz(node: QuizExplorerNode): Quiz | null {
  const q = node.quiz
  if (!q) return null
  return {
    id: q.id,
    title: q.title,
    status: q.status,
    quiz_point: q.quiz_point,
    total_questions: q.total_questions,
    time_limit_sec: q.time_limit_sec ?? undefined,
    category_name: q.category_name ?? undefined,
    tags: q.tags ?? [],
    is_solved: q.is_solved,
    updated_at: '',
  }
}

export function QuizCatalogClient({ locale }: QuizCatalogClientProps) {
  const t = useTranslations('quizzes')
  const router = useRouter()
  const searchParams = useSearchParams()

  const folderParam = searchParams.get('folder')
  const folderId = folderParam ? Number(folderParam) : null

  // Editable filter state (only applied on Apply / Reset).
  const [search, setSearch] = useState('')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [solvedFilter, setSolvedFilter] = useState<QuizSolvedFilter>('all')

  const [availableCategories, setAvailableCategories] = useState<QuizCategory[]>([])
  const [availableTags, setAvailableTags] = useState<QuizTag[]>([])

  // Applied snapshot (drives flat-search requests).
  const appliedRef = useRef<{
    search: string
    categoryIds: number[]
    tagIds: number[]
    solved: QuizSolvedFilter
  }>({ search: '', categoryIds: [], tagIds: [], solved: 'all' })

  // Flat-search mode is active when any applied filter is set.
  const [searchMode, setSearchMode] = useState(false)

  // Flat-search results + pagination.
  const [flatResults, setFlatResults] = useState<Quiz[]>([])
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ count: 0, hasNext: false, hasPrevious: false })
  const [isFlatLoading, setIsFlatLoading] = useState(false)

  // Explorer (folder) state.
  const [folderNodes, setFolderNodes] = useState<QuizExplorerNode[]>([])
  const [breadcrumb, setBreadcrumb] = useState<QuizBreadcrumbCrumb[]>([])
  const [isExplorerLoading, setIsExplorerLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)

  // Load taxonomy once for the filter universe.
  useEffect(() => {
    void (async () => {
      try {
        const [cats, tags] = await Promise.all([listQuizCategories(), listQuizTags()])
        setAvailableCategories([...cats])
        setAvailableTags([...tags])
      } catch {
        // Taxonomy is optional for the catalog.
      }
    })()
  }, [])

  const loadExplorer = useCallback(async (targetFolder: number | null) => {
    setIsExplorerLoading(true)
    setError(null)
    try {
      const data = await listQuizFolderContents(targetFolder)
      setFolderNodes([...data.nodes])
      setBreadcrumb([...data.breadcrumb])
    } catch {
      setError(t('errors.loadFailed'))
    } finally {
      setIsExplorerLoading(false)
    }
  }, [t])

  const runFlatSearch = useCallback(
    async (targetPage: number) => {
      const applied = appliedRef.current
      setIsFlatLoading(true)
      setError(null)
      try {
        const result = await listQuizzes({
          limit: PAGE_SIZE,
          offset: (targetPage - 1) * PAGE_SIZE,
          ...(applied.search.trim() ? { search: applied.search.trim() } : {}),
          ...(applied.categoryIds.length === 1 ? { category: applied.categoryIds[0] } : {}),
          ...(applied.tagIds.length > 0 ? { tags: applied.tagIds } : {}),
          ...(applied.solved !== 'all' ? { solved: applied.solved === 'solved' } : {}),
        })
        setFlatResults([...result.results])
        setPagination({ count: result.count, hasNext: Boolean(result.next), hasPrevious: Boolean(result.previous) })
        setPage(targetPage)
      } catch {
        setError(t('errors.loadFailed'))
      } finally {
        setIsFlatLoading(false)
      }
    },
    [t]
  )

  // In explorer mode, (re)load the folder whenever the URL folder changes.
  useEffect(() => {
    if (!searchMode) {
      void loadExplorer(folderId)
    }
  }, [folderId, searchMode, loadExplorer])

  const navigateToFolder = (id: number | null) => {
    const target = id == null ? `/${locale}/quizzes` : `/${locale}/quizzes?folder=${id}`
    router.push(target)
  }

  const handleApply = () => {
    appliedRef.current = {
      search,
      categoryIds: selectedCategoryIds,
      tagIds: selectedTagIds,
      solved: solvedFilter,
    }
    const anyFilter =
      search.trim() !== '' ||
      selectedCategoryIds.length > 0 ||
      selectedTagIds.length > 0 ||
      solvedFilter !== 'all'
    setSearchMode(anyFilter)
    if (anyFilter) {
      void runFlatSearch(1)
    } else {
      void loadExplorer(folderId)
    }
  }

  const handleReset = () => {
    setSearch('')
    setSelectedCategoryIds([])
    setSelectedTagIds([])
    setSolvedFilter('all')
    appliedRef.current = { search: '', categoryIds: [], tagIds: [], solved: 'all' }
    setSearchMode(false)
    void loadExplorer(folderId)
  }

  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    )
  }
  const handleTagToggle = (tagId: number) => {
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]))
  }

  const folderTiles = useMemo(() => folderNodes.filter((n) => !n.is_item), [folderNodes])
  const itemTiles = useMemo(
    () => folderNodes.filter((n) => n.is_item && n.quiz).map(summaryToQuiz).filter(Boolean) as Quiz[],
    [folderNodes]
  )
  const totalPages = Math.max(1, Math.ceil(pagination.count / PAGE_SIZE))

  return (
    <div className="flex gap-6">
      <div className="hidden w-56 shrink-0 md:block">
        <div className="sticky top-24 rounded-lg border border-border bg-card p-4">
          <QuizFilterPanel
            search={search}
            selectedCategoryIds={selectedCategoryIds}
            selectedTagIds={selectedTagIds}
            solvedFilter={solvedFilter}
            availableCategories={availableCategories}
            availableTags={availableTags}
            isLoading={isFlatLoading || isExplorerLoading}
            onSearchChange={setSearch}
            onCategoryToggle={handleCategoryToggle}
            onTagToggle={handleTagToggle}
            onSolvedChange={setSolvedFilter}
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

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {searchMode ? (
          /* ── Flat search mode ───────────────────────────────────────────── */
          <FlatSearchView
            t={t}
            locale={locale}
            results={flatResults}
            isLoading={isFlatLoading}
            page={page}
            totalPages={totalPages}
            pagination={pagination}
            onPage={(p) => void runFlatSearch(p)}
          />
        ) : (
          /* ── Explorer mode ──────────────────────────────────────────────── */
          <div className="space-y-6">
            <QuizBreadcrumb breadcrumb={breadcrumb} onNavigate={navigateToFolder} />

            {isExplorerLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            ) : folderTiles.length === 0 && itemTiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('explorer.emptyFolder')}</p>
            ) : (
              <>
                {folderTiles.length > 0 ? (
                  <div className="space-y-3">
                    <h2 className="text-sm font-medium text-muted-foreground">{t('explorer.foldersHeading')}</h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {folderTiles.map((folder) => (
                        <QuizFolderCard
                          key={folder.id}
                          title={folder.title}
                          onOpen={() => navigateToFolder(folder.id)}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {itemTiles.length > 0 ? (
                  <div className="space-y-3">
                    <h2 className="text-sm font-medium text-muted-foreground">{t('explorer.quizzesHeading')}</h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {itemTiles.map((quiz) => (
                        <QuizCard key={quiz.id} quiz={quiz} locale={locale} />
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

type FlatSearchViewProps = {
  t: ReturnType<typeof useTranslations>
  locale: string
  results: Quiz[]
  isLoading: boolean
  page: number
  totalPages: number
  pagination: { count: number; hasNext: boolean; hasPrevious: boolean }
  onPage: (page: number) => void
}

function FlatSearchView({ t, locale, results, isLoading, page, totalPages, pagination, onPage }: FlatSearchViewProps) {
  return (
    <div className="space-y-6">
      {isLoading && results.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty.noResults')}</p>
      ) : (
        <div className={isLoading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((quiz) => (
              <QuizCard key={quiz.id} quiz={quiz} locale={locale} />
            ))}
          </div>
        </div>
      )}

      {pagination.count > PAGE_SIZE ? (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">{t('catalog.pageOf', { page, total: totalPages })}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={!pagination.hasPrevious || isLoading} onClick={() => onPage(page - 1)}>
              {t('catalog.previous')}
            </Button>
            <Button variant="outline" size="sm" disabled={!pagination.hasNext || isLoading} onClick={() => onPage(page + 1)}>
              {t('catalog.next')}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
