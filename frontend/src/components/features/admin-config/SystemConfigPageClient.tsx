'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSystemConfig } from '@/hooks/useSystemConfig'
import type { SystemConfigDto } from '@/types/admin.types'
import { SystemConfigCategoryAccordion } from './SystemConfigCategoryAccordion'
import { SystemConfigRowEditor } from './SystemConfigRowEditor'
import { SystemConfigToolbar } from './SystemConfigToolbar'

type SystemConfigPageClientProps = {
  locale: string
}

export function SystemConfigPageClient({ locale }: SystemConfigPageClientProps) {
  const t = useTranslations('adminConfig')
  const tRoot = useTranslations()

  const {
    groupedConfigs,
    categoryOrder,
    isLoading,
    isLoadingCapabilities,
    loadErrorMessageKey,
    capabilitiesErrorMessageKey,
    capabilities,
    editingValues,
    rowErrorMessageKeys,
    revealedSecretValues,
    loadConfigs,
    loadCapabilities,
    refreshCategory,
    startEdit,
    cancelEdit,
    updateEditValue,
    submitUpdate,
    requestSecretReveal,
    isSavingKey,
  } = useSystemConfig()

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [actionMessageKey, setActionMessageKey] = useState<string | null>(null)
  const [pendingSecretConfig, setPendingSecretConfig] = useState<SystemConfigDto | null>(null)

  useEffect(() => {
    void loadCapabilities()
    void loadConfigs()
  }, [loadCapabilities, loadConfigs])

  const visibleGroups = useMemo(() => {
    const query = search.trim().toLowerCase()

    const groups = categoryOrder
      .map((category) => ({
        category,
        configs: groupedConfigs[category] ?? [],
      }))
      .filter((group) => !selectedCategory || group.category === selectedCategory)
      .map((group) => {
        if (!query) {
          return {
            category: group.category,
            configs: [...group.configs].sort((left, right) => left.key.localeCompare(right.key)),
          }
        }

        const filteredConfigs = group.configs
          .filter((config) => {
            const key = config.key.toLowerCase()
            const description = config.description.toLowerCase()
            return key.includes(query) || description.includes(query)
          })
          .sort((left, right) => left.key.localeCompare(right.key))

        return {
          category: group.category,
          configs: filteredConfigs,
        }
      })
      .filter((group) => group.configs.length > 0)

    return groups
  }, [categoryOrder, groupedConfigs, search, selectedCategory])

  const runSave = async (config: SystemConfigDto) => {
    const result = await submitUpdate(config)
    if (!result.success) {
      setActionMessageKey(result.messageKey ?? 'adminConfig.errors.unknown')
      return
    }

    setActionMessageKey('adminConfig.status.saveSuccess')
  }

  const handleSave = (config: SystemConfigDto) => {
    if (config.value_type === 'secret') {
      setPendingSecretConfig(config)
      return
    }

    void runSave(config)
  }

  const handleRevealSecret = async (config: SystemConfigDto) => {
    const result = await requestSecretReveal(config)
    if (!result.success) {
      setActionMessageKey(result.messageKey ?? 'adminConfig.errors.unknown')
      return
    }

    setActionMessageKey('adminConfig.status.secretRevealed')
  }

  const actionIsError = Boolean(actionMessageKey && actionMessageKey.includes('.errors.'))

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10 md:px-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold md:text-4xl">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        <p className="text-xs text-muted-foreground">
          {t('navigationHint')}{' '}
          <Link className="underline" href={`/${locale}/dashboard`}>
            {t('navigationBackToDashboard')}
          </Link>
        </p>
      </header>

      <SystemConfigToolbar
        categories={categoryOrder}
        isRefreshing={isLoading || isLoadingCapabilities}
        onCategoryChange={setSelectedCategory}
        onRefresh={() => {
          if (selectedCategory) {
            void refreshCategory(selectedCategory)
          } else {
            void loadConfigs()
          }
          void loadCapabilities()
        }}
        onSearchChange={setSearch}
        search={search}
        selectedCategory={selectedCategory}
        t={(key) => t(key)}
      />

      {isLoading ? <p className="text-xs text-muted-foreground">{t('status.loading')}</p> : null}
      {loadErrorMessageKey ? <p className="text-xs text-destructive">{tRoot(loadErrorMessageKey)}</p> : null}
      {capabilitiesErrorMessageKey ? (
        <p className="text-xs text-destructive">{tRoot(capabilitiesErrorMessageKey)}</p>
      ) : null}
      {actionMessageKey ? (
        <p className={actionIsError ? 'text-xs text-destructive' : 'text-xs text-emerald-700'}>
          {tRoot(actionMessageKey)}
        </p>
      ) : null}

      {!capabilities.canUpdate ? (
        <p className="text-xs text-muted-foreground">{t('status.readOnlyHint')}</p>
      ) : null}

      {!capabilities.canViewSecret ? (
        <p className="text-xs text-muted-foreground">{t('status.secretViewRestricted')}</p>
      ) : null}

      <SystemConfigCategoryAccordion
        emptyMessage={t('empty.noResults')}
        groups={visibleGroups}
        renderRow={(config) => (
          <SystemConfigRowEditor
            canUpdate={capabilities.canUpdate}
            canViewSecret={capabilities.canViewSecret}
            config={config}
            errorMessageKey={rowErrorMessageKeys[config.key]}
            inputValue={editingValues[config.key]}
            isEditing={Object.prototype.hasOwnProperty.call(editingValues, config.key)}
            isSaving={isSavingKey(config.key)}
            key={config.key}
            onCancelEdit={cancelEdit}
            onRevealSecret={(targetConfig) => {
              void handleRevealSecret(targetConfig)
            }}
            onSave={handleSave}
            onStartEdit={startEdit}
            onValueChange={updateEditValue}
            revealedSecretValue={revealedSecretValues[config.key]}
            t={(key, values) => t(key, values)}
            tRoot={(key, values) => tRoot(key, values)}
          />
        )}
      />

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setPendingSecretConfig(null)
          }
        }}
        open={Boolean(pendingSecretConfig)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmations.secretUpdateTitle')}</DialogTitle>
            <DialogDescription>
              {t('confirmations.secretUpdateDescription', { key: pendingSecretConfig?.key ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                if (!pendingSecretConfig) {
                  return
                }

                void runSave(pendingSecretConfig)
                setPendingSecretConfig(null)
              }}
              type="button"
            >
              {t('actions.confirm')}
            </Button>
            <Button onClick={() => setPendingSecretConfig(null)} type="button" variant="outline">
              {t('actions.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
