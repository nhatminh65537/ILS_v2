'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuizzes } from '@/hooks/useQuizzes'
import { ContentStatus } from '@/types/quiz.types'
import { QuizCard } from './QuizCard'
import { QuizFilterPanel, type TimeLimitFilter } from './QuizFilterPanel'

type QuizCatalogClientProps = {
  locale: string
}

export function QuizCatalogClient({ locale }: QuizCatalogClientProps) {
  const t = useTranslations('quizzes')
  const { quizzes, isLoading, error, loadQuizzes } = useQuizzes()

  // Filter state
  const [search, setSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [timeLimitFilter, setTimeLimitFilter] = useState<TimeLimitFilter>('any')

  useEffect(() => {
    void loadQuizzes()
  }, [loadQuizzes])

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleReset = () => {
    setSearch('')
    setSelectedTags([])
    setTimeLimitFilter('any')
  }

  // Extract unique tags from all published quizzes
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>()
    quizzes
      .filter((q) => q.status === ContentStatus.Published)
      .forEach((q) => q.tags?.forEach((tag) => tagSet.add(tag.name)))
    return Array.from(tagSet).sort()
  }, [quizzes])

  const visibleQuizzes = useMemo(() => {
    const query = search.trim().toLowerCase()
    return quizzes
      .filter((q) => q.status === ContentStatus.Published)
      .filter((q) => !query || q.title.toLowerCase().includes(query))
      .filter((q) =>
        selectedTags.length === 0
          ? true
          : selectedTags.every((tag) => q.tags?.some((qt) => qt.name === tag))
      )
      .filter((q) => {
        if (timeLimitFilter === 'any') return true
        if (timeLimitFilter === 'none') return !q.time_limit_sec
        const minutes = timeLimitFilter === '15' ? 15 : 30
        return q.time_limit_sec !== undefined && q.time_limit_sec <= minutes * 60
      })
  }, [quizzes, search, selectedTags, timeLimitFilter])

  return (
    <div className="flex gap-6">
      {/* Filter panel — sticky left column */}
      <div className="hidden w-56 shrink-0 md:block">
        <div className="sticky top-24 rounded-lg border border-border bg-card p-4">
          <QuizFilterPanel
            availableTags={availableTags}
            search={search}
            selectedTags={selectedTags}
            timeLimitFilter={timeLimitFilter}
            onSearchChange={setSearch}
            onTagToggle={handleTagToggle}
            onTimeLimitChange={setTimeLimitFilter}
            onReset={handleReset}
          />
        </div>
      </div>

      {/* Main content */}
      <section className="min-w-0 flex-1 space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold md:text-4xl">{t('title')}</h1>
          <p className="text-muted-foreground">{t('catalog.subtitle')}</p>
        </header>

        {isLoading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{t('errors.loadFailed')}</p>
        ) : visibleQuizzes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {quizzes.filter((q) => q.status === ContentStatus.Published).length === 0
              ? t('empty.noQuizzes')
              : t('empty.noResults')}
          </p>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {visibleQuizzes.map((quiz) => (
              <QuizCard key={quiz.id} quiz={quiz} locale={locale} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
