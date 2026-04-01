'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
        <select
          className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
          id="config-category"
          onChange={(event) => onCategoryChange(event.target.value)}
          value={selectedCategory}
        >
          <option value="">{t('toolbar.categoryAll')}</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <Button onClick={onRefresh} type="button" variant="outline">
        {isRefreshing ? t('toolbar.refreshing') : t('toolbar.refresh')}
      </Button>
    </section>
  )
}
