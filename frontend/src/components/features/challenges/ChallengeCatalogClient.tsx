'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'
import { useChallenges } from '@/hooks/useChallenges'
import { ChallengeDifficulty } from '@/types/challenge.types'
import { ChallengeCard } from './ChallengeCard'
import { ChallengeFilterPanel } from './ChallengeFilterPanel'

type ChallengeCatalogClientProps = {
  locale: string
}

export function ChallengeCatalogClient({ locale }: ChallengeCatalogClientProps) {
  const t = useTranslations('challenges')
  const { challenges, isLoading, error, loadChallenges } = useChallenges()

  const [search, setSearch] = useState('')
  const [selectedDifficulties, setSelectedDifficulties] = useState<ChallengeDifficulty[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])

  useEffect(() => {
    void loadChallenges()
  }, [loadChallenges])

  const availableCategories = useMemo(() => {
    const map = new Map<number, { id: number; name: string }>()
    for (const c of challenges) {
      const catId = typeof c.category === 'number' ? c.category : null
      if (catId !== null && !map.has(catId)) {
        map.set(catId, { id: catId, name: c.category_name ?? `Category ${catId}` })
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [challenges])

  const availableTags = useMemo(() => {
    const map = new Map<number, { id: number; name: string }>()
    for (const c of challenges) {
      for (const tag of c.tags ?? []) {
        map.set(tag.id, tag)
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [challenges])

  const visibleChallenges = useMemo(() => {
    let result = challenges
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) => c.title.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
      )
    }
    if (selectedDifficulties.length > 0) {
      result = result.filter((c) => c.difficulty && selectedDifficulties.includes(c.difficulty))
    }
    if (selectedCategoryIds.length > 0) {
      result = result.filter((c) => typeof c.category === 'number' && selectedCategoryIds.includes(c.category))
    }
    if (selectedTagIds.length > 0) {
      result = result.filter((c) => c.tags?.some((tag) => selectedTagIds.includes(tag.id)))
    }
    return result
  }, [challenges, search, selectedDifficulties, selectedCategoryIds, selectedTagIds])

  const handleDifficultyToggle = (difficulty: ChallengeDifficulty) => {
    setSelectedDifficulties((prev) =>
      prev.includes(difficulty) ? prev.filter((d) => d !== difficulty) : [...prev, difficulty]
    )
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

  const handleReset = () => {
    setSearch('')
    setSelectedDifficulties([])
    setSelectedCategoryIds([])
    setSelectedTagIds([])
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('catalog.title')}</h1>

      <div className="flex gap-6">
        <div className="hidden w-56 shrink-0 md:block">
          <ChallengeFilterPanel
            search={search}
            selectedDifficulties={selectedDifficulties}
            selectedCategoryIds={selectedCategoryIds}
            selectedTagIds={selectedTagIds}
            availableCategories={availableCategories}
            availableTags={availableTags}
            onSearchChange={setSearch}
            onDifficultyToggle={handleDifficultyToggle}
            onCategoryToggle={handleCategoryToggle}
            onTagToggle={handleTagToggle}
            onReset={handleReset}
          />
        </div>

        <section className="min-w-0 flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : visibleChallenges.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('catalog.empty')}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleChallenges.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} locale={locale} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
