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
import { type CourseTag } from '@/types/course.types'

type AdminLearnTagDialogProps = {
  open: boolean
  tags: CourseTag[]
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (payload: { name: string; description?: string }) => Promise<boolean>
  onUpdate: (id: number, payload: { name: string; description?: string }) => Promise<boolean>
  onDelete: (id: number) => Promise<boolean>
}

export function AdminLearnTagDialog({
  open,
  tags,
  isSubmitting,
  onOpenChange,
  onCreate,
  onUpdate,
  onDelete,
}: AdminLearnTagDialogProps) {
  const t = useTranslations('adminLearn')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const submitCreate = async () => {
    const payload = { name: name.trim(), description: description.trim() }
    if (!payload.name) {
      return
    }

    const ok = await onCreate(payload)
    if (ok) {
      setName('')
      setDescription('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('taxonomy.tagTitle')}</DialogTitle>
          <DialogDescription>{t('taxonomy.tagDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded-md border border-border p-3">
          <Input
            value={name}
            placeholder={t('taxonomy.namePlaceholder')}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            value={description}
            placeholder={t('taxonomy.descriptionPlaceholder')}
            onChange={(event) => setDescription(event.target.value)}
          />
          <Button disabled={isSubmitting || !name.trim()} onClick={() => void submitCreate()} type="button">
            {t('actions.create')}
          </Button>
        </div>

        <div className="space-y-2">
          {tags.length === 0 ? <p className="text-sm text-muted-foreground">{t('empty.noTags')}</p> : null}
          {tags.map((tag) => (
            <TagRow
              key={tag.id}
              tag={tag}
              isSubmitting={isSubmitting}
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('actions.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type TagRowProps = {
  tag: CourseTag
  isSubmitting: boolean
  onUpdate: (id: number, payload: { name: string; description?: string }) => Promise<boolean>
  onDelete: (id: number) => Promise<boolean>
}

function TagRow({ tag, isSubmitting, onUpdate, onDelete }: TagRowProps) {
  const t = useTranslations('adminLearn')
  const [name, setName] = useState(tag.name)
  const [description, setDescription] = useState(tag.description ?? '')

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <Input value={name} onChange={(event) => setName(event.target.value)} />
      <Input value={description} onChange={(event) => setDescription(event.target.value)} />
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={isSubmitting || !name.trim()}
          onClick={() => void onUpdate(tag.id, { name: name.trim(), description: description.trim() })}
          type="button"
        >
          {t('actions.save')}
        </Button>
        <Button
          variant="destructive"
          disabled={isSubmitting}
          onClick={() => void onDelete(tag.id)}
          type="button"
        >
          {t('actions.delete')}
        </Button>
      </div>
    </div>
  )
}
