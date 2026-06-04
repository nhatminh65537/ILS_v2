'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, FileText, Folder } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAdminQuizExplorer } from '@/hooks/useAdminQuizExplorer'
import type { QuizExplorerNode } from '@/types/quiz.types'
import { AdminQuizNodeCreateDialog } from './AdminQuizNodeCreateDialog'
import { AdminQuizMoveDialog } from './AdminQuizMoveDialog'

type AdminQuizExplorerClientProps = {
  locale: string
}

export function AdminQuizExplorerClient({ locale }: AdminQuizExplorerClientProps) {
  const t = useTranslations('adminQuizzes')
  const router = useRouter()
  const searchParams = useSearchParams()

  const folderParam = searchParams.get('folder')
  const folderId = folderParam ? Number(folderParam) : null

  const {
    state,
    isMutating,
    mutationErrorKey,
    loadFolder,
    createFolder,
    createQuizDraft,
    moveNode,
    bulkDelete,
  } = useAdminQuizExplorer()

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [createOpen, setCreateOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [prevFolderId, setPrevFolderId] = useState(folderId)

  // Lightweight client-side filters scoped to the current folder's nodes.
  const [searchText, setSearchText] = useState('')
  const [kindFilter, setKindFilter] = useState<'all' | 'folder' | 'quiz'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all')

  // Reset the selection and filters when navigating to a different folder
  // (adjust state during render — the recommended alternative to setState-in-effect).
  if (folderId !== prevFolderId) {
    setPrevFolderId(folderId)
    setSelectedIds(new Set())
    setSearchText('')
    setKindFilter('all')
    setStatusFilter('all')
  }

  useEffect(() => {
    void loadFolder(folderId)
  }, [folderId, loadFolder])

  const navigateTo = (id: number | null) => {
    const target = id == null ? `/${locale}/admin/quizzes` : `/${locale}/admin/quizzes?folder=${id}`
    router.push(target)
  }

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectedArray = useMemo(() => [...selectedIds], [selectedIds])
  const parentLabel = state.folder?.title ?? t('explorer.root')

  const filteredNodes = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    return state.nodes.filter((node) => {
      if (query && !node.title.toLowerCase().includes(query)) return false
      if (kindFilter === 'folder' && node.is_item) return false
      if (kindFilter === 'quiz' && !node.is_item) return false
      if (statusFilter !== 'all') {
        // Status only applies to quiz nodes; folders are excluded when filtering.
        if (!node.quiz || node.quiz.status !== statusFilter) return false
      }
      return true
    })
  }, [state.nodes, searchText, kindFilter, statusFilter])

  const handleCreate = async (kind: 'folder' | 'quiz', title: string): Promise<boolean> => {
    if (kind === 'folder') {
      return createFolder(title, folderId)
    }
    const quizId = await createQuizDraft(title, folderId)
    if (quizId) {
      // Atomic create-then-edit: jump straight to the full editor.
      router.push(`/${locale}/admin/quizzes/${quizId}`)
      return true
    }
    return false
  }

  const handleMove = async (destinationId: number | null): Promise<boolean> => {
    let allOk = true
    for (const id of selectedArray) {
      const ok = await moveNode(id, destinationId, folderId)
      allOk = allOk && ok
    }
    if (allOk) {
      setMoveOpen(false)
      setSelectedIds(new Set())
    }
    return allOk
  }

  const handleBulkDelete = async () => {
    const ok = await bulkDelete(selectedArray, folderId)
    if (ok) {
      setDeleteOpen(false)
      setSelectedIds(new Set())
    }
  }

  return (
    <section className="space-y-6 p-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-3xl font-semibold">{t('title')}</h1>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/${locale}/admin/quizzes/categories`}>{t('taxonomy.manageCategories')}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/${locale}/admin/quizzes/tags`}>{t('taxonomy.manageTags')}</Link>
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>

      {mutationErrorKey ? <p className="text-sm text-destructive">{t(mutationErrorKey as never)}</p> : null}
      {state.errorMessageKey ? <p className="text-sm text-destructive">{t(state.errorMessageKey as never)}</p> : null}

      {/* Breadcrumb + back */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <button type="button" className="hover:text-foreground hover:underline" onClick={() => navigateTo(null)}>
            {t('explorer.root')}
          </button>
          {state.breadcrumb.map((crumb, idx) => {
            const isLast = idx === state.breadcrumb.length - 1
            return (
              <span key={crumb.id} className="flex items-center gap-1">
                <span>/</span>
                {isLast ? (
                  <span className="text-foreground">{crumb.title}</span>
                ) : (
                  <button
                    type="button"
                    className="hover:text-foreground hover:underline"
                    onClick={() => navigateTo(crumb.id)}
                  >
                    {crumb.title}
                  </button>
                )}
              </span>
            )
          })}
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          {folderId != null ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const parentCrumbId = state.breadcrumb.at(-2)?.id ?? null
                navigateTo(parentCrumbId)
              }}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t('explorer.back')}
            </Button>
          ) : null}
          <Button size="sm" onClick={() => setCreateOpen(true)} disabled={isMutating}>
            {t('explorer.newItem')}
          </Button>
        </div>
      </div>

      {/* Selection action bar — floating so it never pushes the table down */}
      {selectedArray.length > 0 ? (
        <div className="fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 shadow-lg">
          <span className="text-sm">{t('explorer.selectedCount', { count: selectedArray.length })}</span>
          <Button size="sm" variant="outline" disabled={isMutating} onClick={() => setMoveOpen(true)}>
            {t('explorer.moveSelected')}
          </Button>
          <Button size="sm" variant="destructive" disabled={isMutating} onClick={() => setDeleteOpen(true)}>
            {t('explorer.deleteSelected')}
          </Button>
          <Button size="sm" variant="ghost" disabled={isMutating} onClick={() => setSelectedIds(new Set())}>
            {t('explorer.clearSelection')}
          </Button>
        </div>
      ) : null}

      {/* Lightweight filter bar (scoped to current folder) */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="h-9 w-full max-w-xs"
          value={searchText}
          placeholder={t('explorer.searchPlaceholder')}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as typeof kindFilter)}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('explorer.filterKindAll')}</SelectItem>
            <SelectItem value="folder">{t('explorer.filterKindFolder')}</SelectItem>
            <SelectItem value="quiz">{t('explorer.filterKindQuiz')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('explorer.filterStatusAll')}</SelectItem>
            <SelectItem value="draft">{t('explorer.filterStatusDraft')}</SelectItem>
            <SelectItem value="published">{t('explorer.filterStatusPublished')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Contents */}
      <Card>
        <CardContent className="p-0">
          {state.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton key={idx} className="h-10 w-full" />
              ))}
            </div>
          ) : state.nodes.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t('explorer.emptyFolder')}</p>
          ) : filteredNodes.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t('explorer.noFilterMatch')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>{t('explorer.columns.name')}</TableHead>
                  <TableHead>{t('explorer.columns.status')}</TableHead>
                  <TableHead>{t('explorer.columns.questions')}</TableHead>
                  <TableHead>{t('explorer.columns.points')}</TableHead>
                  <TableHead className="text-right">{t('explorer.columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNodes.map((node) => (
                  <ExplorerRow
                    key={node.id}
                    node={node}
                    locale={locale}
                    selected={selectedIds.has(node.id)}
                    draftBadgeLabel={t('status.draft')}
                    editLabel={t('actions.edit')}
                    openLabel={t('explorer.openFolder')}
                    onToggleSelect={() => toggleSelected(node.id)}
                    onOpenFolder={() => navigateTo(node.id)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AdminQuizNodeCreateDialog
        open={createOpen}
        parentLabel={parentLabel}
        isSubmitting={isMutating}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />

      <AdminQuizMoveDialog
        open={moveOpen}
        selectionCount={selectedArray.length}
        movingNodeIds={selectedArray}
        isSubmitting={isMutating}
        onOpenChange={setMoveOpen}
        onMove={handleMove}
      />

      <ConfirmDialog
        open={deleteOpen}
        title={t('explorer.deleteConfirmTitle')}
        description={t('explorer.deleteConfirmDescription', { count: selectedArray.length })}
        confirmLabel={t('actions.delete')}
        cancelLabel={t('actions.cancel')}
        variant="destructive"
        isLoading={isMutating}
        onConfirm={() => void handleBulkDelete()}
        onOpenChange={(open) => !open && setDeleteOpen(false)}
      />
    </section>
  )
}

type ExplorerRowProps = {
  node: QuizExplorerNode
  locale: string
  selected: boolean
  draftBadgeLabel: string
  editLabel: string
  openLabel: string
  onToggleSelect: () => void
  onOpenFolder: () => void
}

function ExplorerRow({
  node,
  locale,
  selected,
  draftBadgeLabel,
  editLabel,
  openLabel,
  onToggleSelect,
  onOpenFolder,
}: ExplorerRowProps) {
  const isFolder = !node.is_item
  const quiz = node.quiz

  return (
    <TableRow className={selected ? 'bg-accent/50' : ''}>
      <TableCell>
        <Checkbox checked={selected} onCheckedChange={() => onToggleSelect()} />
      </TableCell>
      <TableCell className="font-medium">
        {isFolder ? (
          <button type="button" className="flex items-center gap-2 text-left hover:underline" onClick={onOpenFolder}>
            <Folder className="h-4 w-4 shrink-0 text-amber-500" />
            <span className="truncate">{node.title}</span>
          </button>
        ) : (
          <Link
            href={quiz ? `/${locale}/admin/quizzes/${quiz.id}` : '#'}
            className="flex items-center gap-2 hover:underline"
          >
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{node.title}</span>
          </Link>
        )}
      </TableCell>
      <TableCell>
        {quiz ? (
          quiz.status === 'draft' ? (
            <Badge variant="secondary" className="text-xs">{draftBadgeLabel}</Badge>
          ) : (
            <Badge variant="outline" className="text-xs">{quiz.status}</Badge>
          )
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>{quiz ? quiz.total_questions : '—'}</TableCell>
      <TableCell>{quiz ? quiz.quiz_point : '—'}</TableCell>
      <TableCell>
        <div className="flex justify-end gap-2">
          {isFolder ? (
            <Button size="sm" variant="outline" onClick={onOpenFolder}>
              {openLabel}
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link href={quiz ? `/${locale}/admin/quizzes/${quiz.id}` : '#'}>{editLabel}</Link>
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
