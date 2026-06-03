'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

type AdminLearnNodeRenameDialogProps = {
  open: boolean
  initialTitle: string
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onRename: (title: string) => Promise<boolean>
}

export function AdminLearnNodeRenameDialog({
  open,
  initialTitle,
  isSubmitting,
  onOpenChange,
  onRename,
}: AdminLearnNodeRenameDialogProps) {
  const t = useTranslations('adminLearn')
  const [title, setTitle] = useState(initialTitle)
  const [prevOpen, setPrevOpen] = useState(open)

  // Seed the input with the current title each time the dialog opens.
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setTitle(initialTitle)
    }
  }

  const handleSubmit = async () => {
    const next = title.trim()
    if (!next || next === initialTitle) {
      onOpenChange(false)
      return
    }
    const ok = await onRename(next)
    if (ok) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('tree.renameTitle')}</DialogTitle>
        </DialogHeader>
        <Input
          value={title}
          autoFocus
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void handleSubmit()
            }
          }}
        />
        <DialogFooter>
          <Button variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button disabled={isSubmitting || !title.trim()} onClick={() => void handleSubmit()}>
            {t('actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
