'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SystemConfigDto, SystemConfigInputValue } from '@/types/admin.types'

type TranslateValues = Record<string, string | number | Date>

type TranslateFn = (key: string, values?: TranslateValues) => string

type SystemConfigRowEditorProps = {
  config: SystemConfigDto
  canUpdate: boolean
  canViewSecret: boolean
  isEditing: boolean
  isSaving: boolean
  inputValue: SystemConfigInputValue | undefined
  errorMessageKey: string | undefined
  revealedSecretValue: string | undefined
  onStartEdit: (config: SystemConfigDto) => void
  onCancelEdit: (key: string) => void
  onValueChange: (key: string, value: SystemConfigInputValue) => void
  onSave: (config: SystemConfigDto) => void
  onRevealSecret: (config: SystemConfigDto) => void
  t: TranslateFn
  tRoot: TranslateFn
}

const isEditableInUi = (config: SystemConfigDto, canUpdate: boolean): boolean => {
  return canUpdate && config.is_editable
}

const formatDisplayValue = (
  config: SystemConfigDto,
  revealedSecretValue: string | undefined,
  t: TranslateFn
): string => {
  if (config.value_type === 'secret') {
    return revealedSecretValue ?? '***'
  }

  if (config.value_type === 'bool') {
    return config.value === true ? t('values.booleanTrue') : t('values.booleanFalse')
  }

  if (config.value_type === 'json') {
    return JSON.stringify(config.value, null, 2)
  }

  return String(config.value)
}

export function SystemConfigRowEditor({
  config,
  canUpdate,
  canViewSecret,
  isEditing,
  isSaving,
  inputValue,
  errorMessageKey,
  revealedSecretValue,
  onStartEdit,
  onCancelEdit,
  onValueChange,
  onSave,
  onRevealSecret,
  t,
  tRoot,
}: SystemConfigRowEditorProps) {
  const canEdit = isEditableInUi(config, canUpdate)
  const currentInputValue = inputValue

  return (
    <article className="space-y-3 border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">{config.key}</h3>
        <Badge variant="outline">{config.value_type}</Badge>
        {config.is_runtime ? <Badge variant="secondary">{t('labels.runtime')}</Badge> : null}
        {!config.is_editable ? <Badge variant="outline">{t('labels.readOnly')}</Badge> : null}
      </div>

      {config.description ? <p className="text-xs text-muted-foreground">{config.description}</p> : null}

      <div className="space-y-2">
        <p className="text-[11px] font-medium text-muted-foreground">{t('labels.value')}</p>

        {!isEditing ? (
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap border border-border bg-muted/40 p-2 text-xs">
            {formatDisplayValue(config, revealedSecretValue, t)}
          </pre>
        ) : null}

        {isEditing && config.value_type === 'bool' ? (
          <label className="inline-flex items-center gap-2 text-xs">
            <input
              checked={Boolean(currentInputValue)}
              className="size-4"
              onChange={(event) => onValueChange(config.key, event.target.checked)}
              type="checkbox"
            />
            <span>{t('labels.booleanToggle')}</span>
          </label>
        ) : null}

        {isEditing && (config.value_type === 'int' || config.value_type === 'string' || config.value_type === 'secret') ? (
          <Input
            onChange={(event) => onValueChange(config.key, event.target.value)}
            type={config.value_type === 'int' ? 'number' : 'text'}
            value={typeof currentInputValue === 'string' ? currentInputValue : ''}
          />
        ) : null}

        {isEditing && config.value_type === 'json' ? (
          <textarea
            className="min-h-32 w-full rounded-none border border-input bg-transparent px-2.5 py-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            onChange={(event) => onValueChange(config.key, event.target.value)}
            value={typeof currentInputValue === 'string' ? currentInputValue : ''}
          />
        ) : null}

        {errorMessageKey ? <p className="text-xs text-destructive">{tRoot(errorMessageKey)}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {canEdit && !isEditing ? (
          <Button
            disabled={isSaving}
            onClick={() => onStartEdit(config)}
            size="sm"
            type="button"
            variant="outline"
          >
            {t('actions.edit')}
          </Button>
        ) : null}

        {canEdit && isEditing ? (
          <>
            <Button disabled={isSaving} onClick={() => onSave(config)} size="sm" type="button">
              {isSaving ? t('actions.saving') : t('actions.save')}
            </Button>
            <Button
              disabled={isSaving}
              onClick={() => onCancelEdit(config.key)}
              size="sm"
              type="button"
              variant="outline"
            >
              {t('actions.cancel')}
            </Button>
          </>
        ) : null}

        {config.value_type === 'secret' && canViewSecret && !isEditing ? (
          <Button
            disabled={isSaving}
            onClick={() => onRevealSecret(config)}
            size="sm"
            type="button"
            variant="secondary"
          >
            {t('actions.revealSecret')}
          </Button>
        ) : null}

        {config.value_type === 'secret' && !canViewSecret ? (
          <span className="text-xs text-muted-foreground">{t('status.secretViewRestricted')}</span>
        ) : null}
      </div>
    </article>
  )
}
