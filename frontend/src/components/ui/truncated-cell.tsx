'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type TruncatedCellProps = {
  /** Full text to display (truncated when long). */
  value: string | null | undefined
  /** Above this length a "view full" affordance opens a dialog. Default 60. */
  threshold?: number
  /** Max width of the inline truncated span. Default 'max-w-60'. */
  className?: string
  /** Title shown in the full-value dialog header. */
  dialogTitle?: string
}

/**
 * Renders a single-line, ellipsis-truncated value for dense admin tables. The
 * native `title` gives a hover preview; when the value exceeds `threshold`, a
 * "…" button opens a dialog with the complete, wrappable text.
 *
 * Reused across admin tables (users, courses, challenges, rbac) so long fields
 * never blow out column widths.
 */
export function TruncatedCell({
  value,
  threshold = 60,
  className,
  dialogTitle,
}: TruncatedCellProps) {
  const [open, setOpen] = useState(false)
  const text = value ?? ''

  if (!text) {
    return <span className="text-muted-foreground">—</span>
  }

  const isLong = text.length > threshold

  return (
    <span className="inline-flex max-w-full items-center gap-1">
      <span className={cn('truncate', className ?? 'max-w-60')} title={text}>
        {text}
      </span>
      {isLong ? (
        <>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground shrink-0 text-xs underline"
            onClick={() => setOpen(true)}
            aria-label="View full value"
          >
            …
          </button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{dialogTitle ?? 'Details'}</DialogTitle>
              </DialogHeader>
              <p className="text-sm wrap-break-word whitespace-pre-wrap">{text}</p>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </span>
  )
}
