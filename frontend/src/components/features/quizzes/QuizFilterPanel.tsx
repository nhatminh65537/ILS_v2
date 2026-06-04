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
import type { QuizTag } from '@/types/quiz.types'

export type QuizSolvedFilter = 'all' | 'solved' | 'unsolved'

type SimpleCategory = { id: number; name: string }

type QuizFilterPanelProps = {
  search: string
  selectedCategoryIds: number[]
  selectedTagIds: number[]
  solvedFilter: QuizSolvedFilter
  availableCategories: SimpleCategory[]
  availableTags: QuizTag[]
  isLoading?: boolean
  onSearchChange: (value: string) => void
  onCategoryToggle: (categoryId: number) => void
  onTagToggle: (tagId: number) => void
  onSolvedChange: (value: QuizSolvedFilter) => void
  onApply: () => void
  onReset: () => void
}

export function QuizFilterPanel({
  search,
  selectedCategoryIds,
  selectedTagIds,
  solvedFilter,
  availableCategories,
  availableTags,
  isLoading = false,
  onSearchChange,
  onCategoryToggle,
  onTagToggle,
  onSolvedChange,
  onApply,
  onReset,
}: QuizFilterPanelProps) {
  const t = useTranslations('quizzes')

  return (
    <aside className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{t('filter.title')}</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t('filter.search')}</Label>
        <Input
          placeholder={t('filter.searchPlaceholder')}
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
        <Label className="text-xs text-muted-foreground">{t('filter.solved')}</Label>
        <Select value={solvedFilter} onValueChange={(v) => onSolvedChange(v as QuizSolvedFilter)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.solvedAll')}</SelectItem>
            <SelectItem value="solved">{t('filter.solvedYes')}</SelectItem>
            <SelectItem value="unsolved">{t('filter.solvedNo')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {availableCategories.length > 0 ? (
        <>
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t('filter.category')}</Label>
            <div className="flex flex-wrap gap-1.5">
              {availableCategories.map((cat) => {
                const active = selectedCategoryIds.includes(cat.id)
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onCategoryToggle(cat.id)}
                    className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Badge variant={active ? 'default' : 'outline'} className="cursor-pointer text-xs transition-colors">
                      {cat.name}
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
