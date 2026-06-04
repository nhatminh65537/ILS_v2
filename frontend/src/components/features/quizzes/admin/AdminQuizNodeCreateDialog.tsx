'use client'

import { useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type NodeKind = 'folder' | 'quiz'

type AdminQuizNodeCreateDialogProps = {
  open: boolean
  /** Display label of the parent folder (for the dialog description). */
  parentLabel: string
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  /** Resolves with true on success so the dialog can close. */
  onCreate: (kind: NodeKind, title: string) => Promise<boolean>
}

const EMPTY_STATE = { kind: 'folder' as NodeKind, title: '' }

export function AdminQuizNodeCreateDialog({
  open,
  parentLabel,
  isSubmitting,
  onOpenChange,
  onCreate,
}: AdminQuizNodeCreateDialogProps) {
  const t = useTranslations('adminQuizzes')
  const [form, setForm] = useState(EMPTY_STATE)
  const [prevOpen, setPrevOpen] = useState(open)

  // Reset the form each time the dialog opens (adjust state during render).
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setForm(EMPTY_STATE)
    }
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      return
    }
    const ok = await onCreate(form.kind, form.title.trim())
    if (ok) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('explorer.createTitle')}</DialogTitle>
          <DialogDescription>{t('explorer.createUnder', { parent: parentLabel })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">{t('explorer.kindLabel')}</label>
            <Select
              value={form.kind}
              onValueChange={(value) => setForm((prev) => ({ ...prev, kind: value as NodeKind }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="folder">{t('explorer.kindFolder')}</SelectItem>
                <SelectItem value="quiz">{t('explorer.kindQuiz')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">{t('explorer.titleLabel')}</label>
            <Input
              value={form.title}
              autoFocus
              placeholder={t('explorer.titlePlaceholder')}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>

          {form.kind === 'quiz' ? (
            <p className="text-xs text-muted-foreground">{t('explorer.createQuizHint')}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button disabled={isSubmitting || !form.title.trim()} onClick={() => void handleSubmit()}>
            {t('actions.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
