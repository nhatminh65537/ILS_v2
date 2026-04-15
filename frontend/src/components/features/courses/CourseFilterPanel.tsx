'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ContentStatus, type CourseCategory, type CourseTag } from '@/types/course.types'

export type CourseStatusFilter = 'all' | ContentStatus

type CourseFilterPanelProps = {
  search: string
  statusFilter: CourseStatusFilter
  selectedCategoryIds: number[]
  selectedTagIds: number[]
  availableCategories: CourseCategory[]
  availableTags: CourseTag[]
  onSearchChange: (value: string) => void
  onStatusChange: (value: CourseStatusFilter) => void
  onCategoryToggle: (categoryId: number) => void
  onTagToggle: (tagId: number) => void
  onReset: () => void
}

export function CourseFilterPanel({
  search,
  statusFilter,
  selectedCategoryIds,
  selectedTagIds,
  availableCategories,
  availableTags,
  onSearchChange,
  onStatusChange,
  onCategoryToggle,
  onTagToggle,
  onReset,
}: CourseFilterPanelProps) {
  const t = useTranslations('courses')

  const hasActiveFilters =
    search.trim() !== '' ||
    statusFilter !== 'all' ||
    selectedCategoryIds.length > 0 ||
    selectedTagIds.length > 0

  return (
    <aside className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{t('filter.title')}</p>
        {hasActiveFilters ? (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onReset}>
            {t('filter.reset')}
          </Button>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t('catalog.searchPlaceholder')}</Label>
        <Input
          placeholder={t('catalog.searchPlaceholder')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      <Separator />

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t('filter.status')}</Label>
        <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as CourseStatusFilter)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.statusAll')}</SelectItem>
            <SelectItem value={ContentStatus.Published}>{t('filter.statusPublished')}</SelectItem>
            <SelectItem value={ContentStatus.Draft}>{t('filter.statusDraft')}</SelectItem>
            <SelectItem value={ContentStatus.Archived}>{t('filter.statusArchived')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {availableCategories.length > 0 ? (
        <>
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t('filter.categories')}</Label>
            <div className="flex flex-wrap gap-1.5">
              {availableCategories.map((category) => {
                const active = selectedCategoryIds.includes(category.id)
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => onCategoryToggle(category.id)}
                    className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Badge variant={active ? 'default' : 'outline'} className="cursor-pointer text-xs transition-colors">
                      {category.name}
                    </Badge>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      ) : null}

      {availableTags.length > 0 ? (
        <>
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t('filter.tags')}</Label>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => {
                const active = selectedTagIds.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => onTagToggle(tag.id)}
                    className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Badge variant={active ? 'default' : 'outline'} className="cursor-pointer text-xs transition-colors">
                      {tag.name}
                    </Badge>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      ) : null}
    </aside>
  )
}
