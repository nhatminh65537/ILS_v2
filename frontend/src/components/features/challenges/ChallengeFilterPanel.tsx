'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ChallengeDifficulty, type ChallengeTag } from '@/types/challenge.types'

const ALL_DIFFICULTIES = [
  ChallengeDifficulty.Easy,
  ChallengeDifficulty.Medium,
  ChallengeDifficulty.Hard,
  ChallengeDifficulty.Insane,
]

type SimpleCategory = { id: number; name: string }

type ChallengeFilterPanelProps = {
  search: string
  selectedDifficulties: ChallengeDifficulty[]
  selectedCategoryIds: number[]
  selectedTagIds: number[]
  availableCategories: SimpleCategory[]
  availableTags: ChallengeTag[]
  onSearchChange: (value: string) => void
  onDifficultyToggle: (difficulty: ChallengeDifficulty) => void
  onCategoryToggle: (categoryId: number) => void
  onTagToggle: (tagId: number) => void
  onReset: () => void
}

export function ChallengeFilterPanel({
  search,
  selectedDifficulties,
  selectedCategoryIds,
  selectedTagIds,
  availableCategories,
  availableTags,
  onSearchChange,
  onDifficultyToggle,
  onCategoryToggle,
  onTagToggle,
  onReset,
}: ChallengeFilterPanelProps) {
  const t = useTranslations('challenges')

  const hasActiveFilters =
    search.trim() !== '' ||
    selectedDifficulties.length > 0 ||
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
        <Label className="text-xs text-muted-foreground">{t('filter.search')}</Label>
        <Input
          placeholder={t('filter.searchPlaceholder')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 text-sm"
        />
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
    </aside>
  )
}
