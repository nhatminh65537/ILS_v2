'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'
import { useCourses } from '@/hooks/useCourses'
import { ContentStatus } from '@/types/course.types'
import { CourseCard } from './CourseCard'
import { CourseFilterPanel, type CourseStatusFilter } from './CourseFilterPanel'

type CourseCatalogClientProps = {
  locale: string
}

export function CourseCatalogClient({ locale }: CourseCatalogClientProps) {
  const t = useTranslations('courses')
  const { courses, isCatalogLoading, error, loadCourses } = useCourses()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CourseStatusFilter>('all')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])

  useEffect(() => {
    void loadCourses()
  }, [loadCourses])

  const availableCategories = useMemo(() => {
    const map = new Map<number, { id: number; name: string; description?: string }>()
    for (const course of courses) {
      if (course.category) {
        map.set(course.category.id, course.category)
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [courses])

  const availableTags = useMemo(() => {
    const map = new Map<number, { id: number; name: string; description?: string }>()
    for (const course of courses) {
      for (const tag of course.tags) {
        map.set(tag.id, tag)
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [courses])

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
    setStatusFilter('all')
    setSelectedCategoryIds([])
    setSelectedTagIds([])
  }

  const visibleCourses = useMemo(() => {
    const query = search.trim().toLowerCase()

    return courses
      .filter((course) => {
        if (statusFilter === 'all') {
          return course.status === ContentStatus.Published
        }
        return course.status === statusFilter
      })
      .filter((course) => {
        if (!query) {
          return true
        }
        return (
          course.title.toLowerCase().includes(query) ||
          (course.description ?? '').toLowerCase().includes(query)
        )
      })
      .filter((course) => {
        if (selectedCategoryIds.length === 0) {
          return true
        }
        return course.category ? selectedCategoryIds.includes(course.category.id) : false
      })
      .filter((course) => {
        if (selectedTagIds.length === 0) {
          return true
        }
        const tagIds = course.tags.map((tag) => tag.id)
        return selectedTagIds.every((id) => tagIds.includes(id))
      })
  }, [courses, search, selectedCategoryIds, selectedTagIds, statusFilter])

  return (
    <div className="flex gap-6">
      <div className="hidden w-56 shrink-0 md:block">
        <div className="sticky top-24 rounded-lg border border-border bg-card p-4">
          <CourseFilterPanel
            search={search}
            statusFilter={statusFilter}
            selectedCategoryIds={selectedCategoryIds}
            selectedTagIds={selectedTagIds}
            availableCategories={availableCategories}
            availableTags={availableTags}
            onSearchChange={setSearch}
            onStatusChange={setStatusFilter}
            onCategoryToggle={handleCategoryToggle}
            onTagToggle={handleTagToggle}
            onReset={handleReset}
          />
        </div>
      </div>

      <section className="min-w-0 flex-1 space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold md:text-4xl">{t('title')}</h1>
          <p className="text-muted-foreground">{t('catalog.subtitle')}</p>
        </header>

        {isCatalogLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{t('errors.loadFailed')}</p>
        ) : visibleCourses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {courses.filter((course) => course.status === ContentStatus.Published).length === 0
              ? t('empty.noCourses')
              : t('empty.noResults')}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCourses.map((course) => (
              <CourseCard key={course.id} course={course} locale={locale} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
