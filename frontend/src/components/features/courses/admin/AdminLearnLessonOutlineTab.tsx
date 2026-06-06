'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ExternalLink, RefreshCw, Link2, Link2Off } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { listOutlineCollections, listOutlineDocuments } from '@/services/lessons.service'
import type {
  LearnLessonOutlineInfo,
  OutlineCollection,
  OutlineDocument,
} from '@/types/lesson.types'

const PAGE_SIZE = 25

type AdminLearnLessonOutlineTabProps = {
  lessonId: number
  outlineInfo: LearnLessonOutlineInfo | null
  isMutating: boolean
  onLink: (lessonId: number, outlineDocId: string) => Promise<boolean>
  onSync: (lessonId: number) => Promise<boolean>
  onUnlink: (lessonId: number) => Promise<boolean>
}

const extractDetail = (error: unknown): string =>
  typeof error === 'object' && error !== null && 'detail' in error
    ? String((error as { detail?: unknown }).detail ?? '')
    : ''

export function AdminLearnLessonOutlineTab({
  lessonId,
  outlineInfo,
  isMutating,
  onLink,
  onSync,
  onUnlink,
}: AdminLearnLessonOutlineTabProps) {
  const t = useTranslations('adminLearn')

  // ── linked state ───────────────────────────────────────────────────────────
  const [unlinkOpen, setUnlinkOpen] = useState(false)

  // ── picker state (only used when unlinked) ─────────────────────────────────
  const [collections, setCollections] = useState<OutlineCollection[]>([])
  const [collectionsLoading, setCollectionsLoading] = useState(false)
  const [collectionId, setCollectionId] = useState<string>('')
  const [documents, setDocuments] = useState<OutlineDocument[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsTotal, setDocsTotal] = useState(0)
  const [selectedDocId, setSelectedDocId] = useState<string>('')
  const [browseErrorKey, setBrowseErrorKey] = useState<string | null>(null)

  const mapBrowseError = useCallback((error: unknown): string => {
    const text = extractDetail(error).toLowerCase()
    if (text.includes('disabled') || text.includes('missing outline')) {
      return 'outline.errors.disabled'
    }
    if (text.includes('failed to reach') || text.includes('returned an error') || text.includes('invalid json')) {
      return 'outline.errors.unavailable'
    }
    return 'outline.errors.browseFailed'
  }, [])

  const loadCollections = useCallback(async () => {
    setCollectionsLoading(true)
    setBrowseErrorKey(null)
    try {
      const result = await listOutlineCollections({ limit: 100 })
      setCollections([...result.items])
    } catch (error) {
      setBrowseErrorKey(mapBrowseError(error))
    } finally {
      setCollectionsLoading(false)
    }
  }, [mapBrowseError])

  const loadDocuments = useCallback(
    async (targetCollectionId: string, offset: number) => {
      setDocsLoading(true)
      setBrowseErrorKey(null)
      try {
        const result = await listOutlineDocuments({
          collectionId: targetCollectionId || undefined,
          offset,
          limit: PAGE_SIZE,
        })
        setDocsTotal(result.total)
        setDocuments((prev) => (offset === 0 ? [...result.items] : [...prev, ...result.items]))
      } catch (error) {
        setBrowseErrorKey(mapBrowseError(error))
      } finally {
        setDocsLoading(false)
      }
    },
    [mapBrowseError]
  )

  // Load collections once when entering the unlinked picker.
  useEffect(() => {
    if (!outlineInfo) {
      void loadCollections()
    }
  }, [outlineInfo, loadCollections])

  const handleSelectCollection = (value: string) => {
    setCollectionId(value)
    setSelectedDocId('')
    setDocuments([])
    setDocsTotal(0)
    void loadDocuments(value, 0)
  }

  const handleLink = async () => {
    if (!selectedDocId) {
      return
    }
    await onLink(lessonId, selectedDocId)
  }

  const handleConfirmUnlink = async () => {
    const ok = await onUnlink(lessonId)
    if (ok) {
      setUnlinkOpen(false)
    }
  }

  // ── LINKED VIEW ─────────────────────────────────────────────────────────────
  if (outlineInfo) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{t('outline.linkedBadge')}</Badge>
              <a
                className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
                href={outlineInfo.outline_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('outline.viewSource')}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-2 sm:block">
              <dt className="text-muted-foreground">{t('outline.docId')}</dt>
              <dd className="font-mono text-xs">{outlineInfo.outline_doc_id}</dd>
            </div>
            <div className="flex justify-between gap-2 sm:block">
              <dt className="text-muted-foreground">{t('outline.revision')}</dt>
              <dd>{outlineInfo.revision ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-2 sm:col-span-2 sm:block">
              <dt className="text-muted-foreground">{t('outline.lastSynced')}</dt>
              <dd>
                {outlineInfo.last_synced_at
                  ? new Date(outlineInfo.last_synced_at).toLocaleString()
                  : t('outline.neverSynced')}
              </dd>
            </div>
          </dl>
        </div>

        <p className="text-sm text-muted-foreground">{t('outline.syncHint')}</p>

        <div className="flex flex-wrap gap-2">
          <Button disabled={isMutating} onClick={() => void onSync(lessonId)}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            {t('outline.actions.syncNow')}
          </Button>
          <Button variant="outline" disabled={isMutating} onClick={() => setUnlinkOpen(true)}>
            <Link2Off className="mr-1.5 h-4 w-4" />
            {t('outline.actions.unlink')}
          </Button>
        </div>

        <ConfirmDialog
          open={unlinkOpen}
          title={t('outline.confirm.unlinkTitle')}
          description={t('outline.confirm.unlink')}
          confirmLabel={t('outline.actions.unlink')}
          cancelLabel={t('actions.cancel')}
          variant="destructive"
          isLoading={isMutating}
          onConfirm={handleConfirmUnlink}
          onOpenChange={(open) => !open && setUnlinkOpen(false)}
        />
      </div>
    )
  }

  // ── UNLINKED VIEW (picker) ──────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('outline.pickerHint')}</p>

      {browseErrorKey ? (
        <p className="text-sm text-destructive">{t(browseErrorKey as never)}</p>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-medium">{t('outline.collectionLabel')}</label>
        {collectionsLoading ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <Select value={collectionId} onValueChange={handleSelectCollection} disabled={isMutating}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('outline.collectionPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {collections.map((collection) => (
                <SelectItem key={collection.id} value={collection.id}>
                  {collection.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {collectionId ? (
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('outline.documentLabel')}</label>
          {docsLoading && documents.length === 0 ? (
            <div className="space-y-1.5">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('outline.noDocuments')}</p>
          ) : (
            <ul className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-border p-1">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                      selectedDocId === doc.id ? 'bg-muted ring-1 ring-ring' : ''
                    }`}
                  >
                    <span className="truncate">{doc.title || t('outline.untitledDocument')}</span>
                    {doc.revision != null ? (
                      <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                        {t('outline.revShort', { revision: doc.revision })}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {documents.length < docsTotal ? (
            <Button
              variant="outline"
              size="sm"
              disabled={docsLoading}
              onClick={() => void loadDocuments(collectionId, documents.length)}
            >
              {t('outline.actions.loadMore')}
            </Button>
          ) : null}
        </div>
      ) : null}

      <Button disabled={isMutating || !selectedDocId} onClick={() => void handleLink()}>
        <Link2 className="mr-1.5 h-4 w-4" />
        {t('outline.actions.linkAndImport')}
      </Button>
    </div>
  )
}
