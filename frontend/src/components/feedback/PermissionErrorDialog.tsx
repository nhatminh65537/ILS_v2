'use client'

import { useEffect, useState } from 'react'
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
import {
  type PermissionErrorDetail,
  subscribePermissionError,
} from '@/lib/permission-error-bus'

export function PermissionErrorDialog() {
  const t = useTranslations('common')
  const [detail, setDetail] = useState<PermissionErrorDetail | null>(null)

  useEffect(() => {
    return subscribePermissionError((next) => {
      setDetail(next)
    })
  }, [])

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setDetail(null)
    }
  }

  return (
    <Dialog open={detail !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('permissionDenied.title')}</DialogTitle>
          <DialogDescription>
            {detail?.message?.trim()
              ? detail.message
              : t('permissionDenied.defaultMessage')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setDetail(null)} type="button">
            {t('permissionDenied.acknowledge')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
