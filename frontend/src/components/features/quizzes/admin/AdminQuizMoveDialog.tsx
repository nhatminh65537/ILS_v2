'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Folder } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { listQuizFolderContents } from '@/services/quizzes.service'
import type { QuizBreadcrumbCrumb, QuizExplorerNode } from '@/types/quiz.types'

type AdminQuizMoveDialogProps = {
  open: boolean
  /** How many nodes are being moved (for the description). */
  selectionCount: number
  /** Ids being moved; excluded as drill-in/selectable destinations to avoid cycles. */
  movingNodeIds: number[]
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  /** Confirm the move to the chosen destination folder (null = root). */
  onMove: (destinationId: number | null) => Promise<boolean>
}

export function AdminQuizMoveDialog({
  open,
  selectionCount,
  movingNodeIds,
  isSubmitting,
  onOpenChange,
  onMove,
}: AdminQuizMoveDialogProps) {
  const t = useTranslations('adminQuizzes')
  const [currentId, setCurrentId] = useState<number | null>(null)
  const [breadcrumb, setBreadcrumb] = useState<QuizBreadcrumbCrumb[]>([])
  const [folders, setFolders] = useState<QuizExplorerNode[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const load = async (folderId: number | null) => {
    setIsLoading(true)
    try {
      const data = await listQuizFolderContents(folderId)
      setCurrentId(folderId)
      setBreadcrumb([...data.breadcrumb])
      setFolders(data.nodes.filter((n) => !n.is_item))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      void load(null)
    }
  }, [open])

  const movingSet = new Set(movingNodeIds)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('explorer.moveTitle')}</DialogTitle>
          <DialogDescription>{t('explorer.moveDescription', { count: selectionCount })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <button type="button" className="hover:text-foreground hover:underline" onClick={() => void load(null)}>
              {t('explorer.root')}
            </button>
            {breadcrumb.map((crumb) => (
              <span key={crumb.id} className="flex items-center gap-1">
                <span>/</span>
                <button
                  type="button"
                  className="hover:text-foreground hover:underline"
                  onClick={() => void load(crumb.id)}
                >
                  {crumb.title}
                </button>
              </span>
            ))}
          </nav>

          <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border p-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">{t('status.loadingTree')}</p>
            ) : folders.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('explorer.noSubfolders')}</p>
            ) : (
              folders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  disabled={movingSet.has(folder.id)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => void load(folder.id)}
                >
                  <Folder className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{folder.title}</span>
                </button>
              ))
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {t('explorer.moveDestination', {
              destination: currentId == null ? t('explorer.root') : breadcrumb.at(-1)?.title ?? '',
            })}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button
            disabled={isSubmitting || (currentId !== null && movingSet.has(currentId))}
            onClick={() => void onMove(currentId)}
          >
            {t('explorer.moveHere')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
