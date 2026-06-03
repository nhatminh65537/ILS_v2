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
import { ChallengeDifficulty, type ChallengeTag } from '@/types/challenge.types'

const ALL_DIFFICULTIES = [
  ChallengeDifficulty.Easy,
  ChallengeDifficulty.Medium,
  ChallengeDifficulty.Hard,
  ChallengeDifficulty.Insane,
]

export type ChallengeSolvedFilter = 'all' | 'solved' | 'unsolved'

type SimpleCategory = { id: number; name: string }

type ChallengeFilterPanelProps = {
  search: string
  selectedDifficulties: ChallengeDifficulty[]
  selectedCategoryIds: number[]
  selectedTagIds: number[]
  solvedFilter: ChallengeSolvedFilter
  availableCategories: SimpleCategory[]
  availableTags: ChallengeTag[]
  isLoading?: boolean
  onSearchChange: (value: string) => void
  onDifficultyToggle: (difficulty: ChallengeDifficulty) => void
  onCategoryToggle: (categoryId: number) => void
  onTagToggle: (tagId: number) => void
  onSolvedChange: (value: ChallengeSolvedFilter) => void
  onApply: () => void
  onReset: () => void
}

export function ChallengeFilterPanel({
  search,
  selectedDifficulties,
  selectedCategoryIds,
  selectedTagIds,
  solvedFilter,
  availableCategories,
  availableTags,
  isLoading = false,
  onSearchChange,
  onDifficultyToggle,
  onCategoryToggle,
  onTagToggle,
  onSolvedChange,
  onApply,
  onReset,
}: ChallengeFilterPanelProps) {
  const t = useTranslations('challenges')

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
        <Select value={solvedFilter} onValueChange={(v) => onSolvedChange(v as ChallengeSolvedFilter)}>
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

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">{t('filter.difficulty')}</Label>
        <div className="flex flex-wrap gap-1.5">
          {ALL_DIFFICULTIES.map((diff) => {
            const active = selectedDifficulties.includes(diff)
            return (
              <button
                key={diff}
                type="button"
                onClick={() => onDifficultyToggle(diff)}
                className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Badge variant={active ? 'default' : 'outline'} className="cursor-pointer text-xs transition-colors">
                  {t(`difficulty.${diff}`)}
                </Badge>
              </button>
            )
          })}
        </div>
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
