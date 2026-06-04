'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAdminQuizzes } from '@/hooks/useAdminQuizzes'
import type { QuizCategory, QuizTag } from '@/types/quiz.types'

type TaxonomyKind = 'category' | 'tag'

type AdminQuizTaxonomyPageClientProps = {
  locale: string
  kind: TaxonomyKind
}

type TaxonomyItem = QuizCategory | QuizTag

export function AdminQuizTaxonomyPageClient({ locale, kind }: AdminQuizTaxonomyPageClientProps) {
  const t = useTranslations('adminQuizzes')
  const {
    taxonomyState,
    isMutating,
    mutationErrorKey,
    loadTaxonomies,
    submitCreateCategory,
    submitUpdateCategory,
    submitDeleteCategory,
    submitCreateTag,
    submitUpdateTag,
    submitDeleteTag,
  } = useAdminQuizzes()

  const isCategory = kind === 'category'
  const items: readonly TaxonomyItem[] = isCategory ? taxonomyState.categories : taxonomyState.tags
  const submitCreate = isCategory ? submitCreateCategory : submitCreateTag
  const submitUpdate = isCategory ? submitUpdateCategory : submitUpdateTag
  const submitDelete = isCategory ? submitDeleteCategory : submitDeleteTag

  const [search, setSearch] = useState('')
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<TaxonomyItem | null>(null)

  useEffect(() => {
    void loadTaxonomies()
  }, [loadTaxonomies])

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) {
      return items
    }
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        (item.description ?? '').toLowerCase().includes(term)
    )
  }, [items, search])

  const titleKey = isCategory ? 'taxonomy.categoryTitle' : 'taxonomy.tagTitle'
  const descriptionKey = isCategory ? 'taxonomy.categoryDescription' : 'taxonomy.tagDescription'
  const emptyKey = isCategory ? 'taxonomy.emptyCategories' : 'taxonomy.emptyTags'

  const handleCreate = async () => {
    const name = createName.trim()
    if (!name) {
      return
    }
    const ok = await submitCreate({ name, description: createDescription.trim() })
    if (ok) {
      setCreateName('')
      setCreateDescription('')
    }
  }

  const startEdit = (item: TaxonomyItem) => {
    setEditId(item.id)
    setEditName(item.name)
    setEditDescription(item.description ?? '')
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditName('')
    setEditDescription('')
  }

  const handleEditSave = async () => {
    if (editId == null) {
      return
    }
    const name = editName.trim()
    if (!name) {
      return
    }
    const ok = await submitUpdate(editId, { name, description: editDescription.trim() })
    if (ok) {
      cancelEdit()
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) {
      return
    }
    const ok = await submitDelete(deleteTarget.id)
    if (ok) {
      setDeleteTarget(null)
    }
  }

  return (
    <section className="space-y-6 p-6">
      <header className="space-y-2">
        <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Link className="hover:text-foreground hover:underline" href={`/${locale}/admin/quizzes`}>
            {t('navigation.backToExplorer')}
          </Link>
          <span>/</span>
          <span className="text-foreground">{t(titleKey)}</span>
        </nav>
        <h1 className="text-3xl font-semibold">{t(titleKey)}</h1>
        <p className="text-sm text-muted-foreground">{t(descriptionKey)}</p>
      </header>

      {mutationErrorKey ? <p className="text-sm text-destructive">{t(mutationErrorKey as never)}</p> : null}
      {taxonomyState.errorMessageKey ? (
        <p className="text-sm text-destructive">{t(taxonomyState.errorMessageKey as never)}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('taxonomy.createTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">{t('taxonomy.namePlaceholder')}</label>
              <Input
                value={createName}
                placeholder={t('taxonomy.namePlaceholder')}
                onChange={(event) => setCreateName(event.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">{t('taxonomy.descriptionPlaceholder')}</label>
              <Input
                value={createDescription}
                placeholder={t('taxonomy.descriptionPlaceholder')}
                onChange={(event) => setCreateDescription(event.target.value)}
              />
            </div>
            <Button disabled={isMutating || !createName.trim()} onClick={() => void handleCreate()} type="button">
              {t('actions.create')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>{t(titleKey)}</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              className="h-9 w-full max-w-xs"
              value={search}
              placeholder={t('toolbar.searchPlaceholder')}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={isMutating || taxonomyState.isLoading}
              onClick={() => void loadTaxonomies()}
            >
              {t('toolbar.refresh')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {taxonomyState.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Skeleton key={idx} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t(emptyKey)}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('taxonomy.columnName')}</TableHead>
                  <TableHead>{t('taxonomy.columnDescription')}</TableHead>
                  <TableHead className="text-right">{t('columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) =>
                  editId === item.id ? (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input value={editName} onChange={(event) => setEditName(event.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editDescription}
                          onChange={(event) => setEditDescription(event.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            disabled={isMutating || !editName.trim()}
                            onClick={() => void handleEditSave()}
                          >
                            {t('actions.save')}
                          </Button>
                          <Button variant="outline" size="sm" disabled={isMutating} onClick={cancelEdit}>
                            {t('actions.cancel')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">{item.description || '-'}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" disabled={isMutating} onClick={() => startEdit(item)}>
                            {t('actions.edit')}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={isMutating}
                            onClick={() => setDeleteTarget(item)}
                          >
                            {t('actions.delete')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('taxonomy.deleteConfirmTitle')}
        description={t('taxonomy.deleteConfirmDescription', { name: deleteTarget?.name ?? '' })}
        confirmLabel={t('actions.delete')}
        cancelLabel={t('actions.cancel')}
        variant="destructive"
        isLoading={isMutating}
        onConfirm={() => void handleDeleteConfirm()}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </section>
  )
}
