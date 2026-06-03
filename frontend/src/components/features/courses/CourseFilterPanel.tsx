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

export type CourseProgressFilter = 'all' | 'not_started' | 'in_progress' | 'completed'

type CourseFilterPanelProps = {
  search: string
  statusFilter: CourseStatusFilter
  progressFilter: CourseProgressFilter
  selectedCategoryIds: number[]
  selectedTagIds: number[]
  availableCategories: CourseCategory[]
  availableTags: CourseTag[]
  isLoading?: boolean
  onSearchChange: (value: string) => void
  onStatusChange: (value: CourseStatusFilter) => void
  onProgressChange: (value: CourseProgressFilter) => void
  onCategoryToggle: (categoryId: number) => void
  onTagToggle: (tagId: number) => void
  onApply: () => void
  onReset: () => void
}

export function CourseFilterPanel({
  search,
  statusFilter,
  progressFilter,
  selectedCategoryIds,
  selectedTagIds,
  availableCategories,
  availableTags,
  isLoading = false,
  onSearchChange,
  onStatusChange,
  onProgressChange,
  onCategoryToggle,
  onTagToggle,
  onApply,
  onReset,
}: CourseFilterPanelProps) {
  const t = useTranslations('courses')

  return (
    <aside className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{t('filter.title')}</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t('catalog.searchPlaceholder')}</Label>
        <Input
          placeholder={t('catalog.searchPlaceholder')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onApply()
            }
          }}
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

      <Separator />

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t('filter.progress')}</Label>
        <Select value={progressFilter} onValueChange={(v) => onProgressChange(v as CourseProgressFilter)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.progressAll')}</SelectItem>
            <SelectItem value="not_started">{t('filter.progressNotStarted')}</SelectItem>
            <SelectItem value="in_progress">{t('filter.progressInProgress')}</SelectItem>
            <SelectItem value="completed">{t('filter.progressCompleted')}</SelectItem>
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

      <Separator />

      <div className="flex gap-2">
        <Button size="sm" className="flex-1" disabled={isLoading} onClick={onApply}>
          {t('filter.apply')}
        </Button>
        <Button variant="outline" size="sm" disabled={isLoading} onClick={onReset}>
          {t('filter.reset')}
        </Button>
      </div>
    </aside>
  )
}
