'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { mapChallengeAdminErrorToMessageKey } from '@/lib/challenge-admin-error-map'
import {
  deleteChallengeFile,
  downloadChallengeFile,
  listChallengeFiles,
  uploadChallengeFile,
} from '@/services/challenges.service'
import type { ChallengeFile } from '@/types/challenge.types'

type AdminChallengeFilesTabProps = {
  slug: string
}

const formatBytes = (bytes: number): string => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function AdminChallengeFilesTab({ slug }: AdminChallengeFilesTabProps) {
  const t = useTranslations('adminChallenges')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [files, setFiles] = useState<readonly ChallengeFile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isMutating, setIsMutating] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ChallengeFile | null>(null)

  const loadFiles = useCallback(async () => {
    setIsLoading(true)
    setErrorKey(null)
    try {
      setFiles(await listChallengeFiles(slug))
    } catch (error) {
      setErrorKey(mapChallengeAdminErrorToMessageKey(error, 'errors.loadFilesFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [slug])

  useEffect(() => {
    void loadFiles()
  }, [loadFiles])

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setIsMutating(true)
    setErrorKey(null)
    try {
      await uploadChallengeFile(slug, file)
      await loadFiles()
    } catch (error) {
      setErrorKey(mapChallengeAdminErrorToMessageKey(error, 'errors.uploadFileFailed'))
    } finally {
      setIsMutating(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDownload = async (file: ChallengeFile) => {
    try {
      await downloadChallengeFile(slug, file)
    } catch (error) {
      setErrorKey(mapChallengeAdminErrorToMessageKey(error, 'errors.downloadFileFailed'))
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setIsMutating(true)
    setErrorKey(null)
    try {
      await deleteChallengeFile(slug, deleteTarget.id)
      setDeleteTarget(null)
      await loadFiles()
    } catch (error) {
      setErrorKey(mapChallengeAdminErrorToMessageKey(error, 'errors.deleteFileFailed'))
    } finally {
      setIsMutating(false)
    }
  }

  return (
    <div className="space-y-6">
      {errorKey ? <p className="text-sm text-destructive">{t(errorKey as never)}</p> : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('files.listTitle')}</CardTitle>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => void handleUpload(e)}
            />
            <Button disabled={isMutating} onClick={() => fileInputRef.current?.click()}>
              {isMutating ? t('status.saving') : t('actions.uploadFile')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : files.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('empty.noFiles')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('files.columns.filename')}</TableHead>
                  <TableHead>{t('files.columns.size')}</TableHead>
                  <TableHead>{t('files.columns.source')}</TableHead>
                  <TableHead className="text-right">{t('columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-mono text-sm">{file.filename}</TableCell>
                    <TableCell>{formatBytes(file.size)}</TableCell>
                    <TableCell>
                      <Badge variant={file.source === 'gitlab' ? 'default' : 'outline'}>
                        {t(`files.source.${file.source}` as never)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => void handleDownload(file)}>
                          {t('actions.download')}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isMutating}
                          onClick={() => setDeleteTarget(file)}
                        >
                          {t('actions.delete')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('files.deleteConfirmTitle')}
        description={t('files.deleteConfirm')}
        confirmLabel={t('actions.delete')}
        cancelLabel={t('actions.cancel')}
        variant="destructive"
        isLoading={isMutating}
        onConfirm={() => void handleDeleteConfirm()}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </div>
  )
}
