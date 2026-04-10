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

export type TimeLimitFilter = 'any' | '15' | '30' | 'none'

type QuizFilterPanelProps = {
  availableTags: string[]
  search: string
  selectedTags: string[]
  timeLimitFilter: TimeLimitFilter
  onSearchChange: (value: string) => void
  onTagToggle: (tag: string) => void
  onTimeLimitChange: (value: TimeLimitFilter) => void
  onReset: () => void
}

export function QuizFilterPanel({
  availableTags,
  search,
  selectedTags,
  timeLimitFilter,
  onSearchChange,
  onTagToggle,
  onTimeLimitChange,
  onReset,
}: QuizFilterPanelProps) {
  const t = useTranslations('quizzes')

  const hasActiveFilters = search.trim() !== '' || selectedTags.length > 0 || timeLimitFilter !== 'any'

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

      {/* Search */}
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

      {/* Time limit */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t('filter.timeLimit')}</Label>
        <Select value={timeLimitFilter} onValueChange={(v) => onTimeLimitChange(v as TimeLimitFilter)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t('filter.timeLimitAny')}</SelectItem>
            <SelectItem value="15">{t('filter.timeLimit15')}</SelectItem>
            <SelectItem value="30">{t('filter.timeLimit30')}</SelectItem>
            <SelectItem value="none">{t('filter.timeLimitNone')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tags */}
      {availableTags.length > 0 ? (
        <>
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t('filter.tags')}</Label>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => {
                const active = selectedTags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onTagToggle(tag)}
                    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
                  >
                    <Badge
                      variant={active ? 'default' : 'outline'}
                      className="cursor-pointer text-xs transition-colors"
                    >
                      {tag}
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
