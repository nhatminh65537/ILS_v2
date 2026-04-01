'use client'

import { useTranslations } from 'next-intl'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type RbacActionToolbarProps = {
  search: string
  includeInactive: boolean
  isRefreshing: boolean
  onSearchChange: (value: string) => void
  onToggleIncludeInactive: (value: boolean) => void
  onRefresh: () => void
}

export function RbacActionToolbar({
  search,
  includeInactive,
  isRefreshing,
  onSearchChange,
  onToggleIncludeInactive,
  onRefresh,
}: RbacActionToolbarProps) {
  const t = useTranslations('adminRbac')

  return (
    <div className="flex flex-col gap-3 rounded-none bg-card p-4 ring-1 ring-foreground/10 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-col gap-2 md:max-w-sm">
        <Label htmlFor="rbac-search">{t('toolbar.searchLabel')}</Label>
        <Input
          id="rbac-search"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('toolbar.searchPlaceholder')}
          value={search}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Label className="flex items-center gap-2 text-xs text-muted-foreground" htmlFor="rbac-include-inactive">
          <input
            checked={includeInactive}
            id="rbac-include-inactive"
            onChange={(event) => onToggleIncludeInactive(event.target.checked)}
            type="checkbox"
          />
          {t('toolbar.includeInactive')}
        </Label>

        <Button disabled={isRefreshing} onClick={onRefresh} size="sm" type="button" variant="outline">
          <RotateCcw />
          {t('toolbar.refresh')}
        </Button>
      </div>
    </div>
  )
}
