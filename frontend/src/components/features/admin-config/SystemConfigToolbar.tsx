'use client'

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

const ALL_CATEGORIES_VALUE = '__ALL_CATEGORIES__'

type SystemConfigToolbarProps = {
  categories: readonly string[]
  search: string
  selectedCategory: string
  isRefreshing: boolean
  onSearchChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onRefresh: () => void
  t: (key: string) => string
}

export function SystemConfigToolbar({
  categories,
  search,
  selectedCategory,
  isRefreshing,
  onSearchChange,
  onCategoryChange,
  onRefresh,
  t,
}: SystemConfigToolbarProps) {
  const categorySelectValue =
    selectedCategory === '' ? ALL_CATEGORIES_VALUE : selectedCategory
  const selectableCategories = categories.filter(
    (category) => category.trim().length > 0
  )

  const handleCategoryChange = (value: string) => {
    onCategoryChange(value === ALL_CATEGORIES_VALUE ? '' : value)
  }

  return (
    <section className="grid gap-3 rounded-none border border-border p-4 md:grid-cols-[1fr_220px_auto] md:items-end">
      <div className="space-y-1">
        <Label htmlFor="config-search">{t('toolbar.searchLabel')}</Label>
        <Input
          id="config-search"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('toolbar.searchPlaceholder')}
          value={search}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="config-category">{t('toolbar.categoryLabel')}</Label>
        <Select value={categorySelectValue} onValueChange={handleCategoryChange}>
          <SelectTrigger id="config-category" className="h-8 text-xs">
            <SelectValue placeholder={t('toolbar.categoryAll')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES_VALUE}>{t('toolbar.categoryAll')}</SelectItem>
            {selectableCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={onRefresh} type="button" variant="outline">
        {isRefreshing ? t('toolbar.refreshing') : t('toolbar.refresh')}
      </Button>
    </section>
  )
}
