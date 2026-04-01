'use client'

import { FormEvent, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { RoleDto, RoleUpsertPayload } from '@/types/rbac.types'

type RoleFormDialogProps = {
  open: boolean
  role: RoleDto | null
  isSubmitting: boolean
  errorMessageKey: string | null
  onOpenChange: (nextOpen: boolean) => void
  onSubmit: (payload: RoleUpsertPayload) => Promise<void>
}

export function RoleFormDialog({
  open,
  role,
  isSubmitting,
  errorMessageKey,
  onOpenChange,
  onSubmit,
}: RoleFormDialogProps) {
  const t = useTranslations('adminRbac')
  const tRoot = useTranslations()

  const [localErrorKey, setLocalErrorKey] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()

    if (!name) {
      setLocalErrorKey('adminRbac.validation.nameRequired')
      return
    }

    setLocalErrorKey(null)

    await onSubmit({
      name,
      description: description || undefined,
    })
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {role ? t('form.editRoleTitle') : t('form.createRoleTitle')}
          </DialogTitle>
          <DialogDescription>{t('form.description')}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" key={role ? `role-${role.id}` : 'role-new'} onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="role-name">{t('labels.name')}</Label>
            <Input
              defaultValue={role?.name ?? ''}
              id="role-name"
              name="name"
              placeholder={t('form.namePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-description">{t('labels.description')}</Label>
            <Input
              defaultValue={role?.description ?? ''}
              id="role-description"
              name="description"
              placeholder={t('form.descriptionPlaceholder')}
            />
          </div>

          {localErrorKey ? <p className="text-xs text-destructive">{tRoot(localErrorKey)}</p> : null}
          {errorMessageKey ? <p className="text-xs text-destructive">{tRoot(errorMessageKey)}</p> : null}

          <DialogFooter>
            <Button disabled={isSubmitting} onClick={() => onOpenChange(false)} type="button" variant="outline">
              {t('actions.cancel')}
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? t('status.submitting') : t('actions.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
