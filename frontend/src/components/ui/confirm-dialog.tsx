'use client'

import { useState } from 'react'
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

type ConfirmDialogVariant = 'default' | 'destructive'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description?: string
  confirmLabel: string
  cancelLabel: string
  variant?: ConfirmDialogVariant
  isLoading?: boolean
  /**
   * When set, the confirm button stays disabled until the user types this exact
   * string. Used for irreversible actions (e.g. permanent course purge).
   */
  requireText?: string
  requireTextLabel?: string
  onConfirm: () => void | Promise<void>
  onOpenChange: (open: boolean) => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'default',
  isLoading = false,
  requireText,
  requireTextLabel,
  onConfirm,
  onOpenChange,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')
  const [prevOpen, setPrevOpen] = useState(open)

  // Reset the typed confirmation whenever the dialog transitions to open. This
  // adjusts state during render (the React-recommended alternative to an effect).
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setTyped('')
    }
  }

  const requireMatch = requireText ? typed.trim() === requireText : true
  const confirmDisabled = isLoading || !requireMatch

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {requireText ? (
          <div className="space-y-1.5">
            {requireTextLabel ? (
              <label className="text-xs text-muted-foreground">{requireTextLabel}</label>
            ) : null}
            <Input
              value={typed}
              autoFocus
              onChange={(event) => setTyped(event.target.value)}
              placeholder={requireText}
            />
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" disabled={isLoading} onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button variant={variant} disabled={confirmDisabled} onClick={() => void onConfirm()}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
