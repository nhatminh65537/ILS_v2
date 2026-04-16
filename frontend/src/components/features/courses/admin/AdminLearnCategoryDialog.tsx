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
import { type CourseCategory } from '@/types/course.types'

type AdminLearnCategoryDialogProps = {
  open: boolean
  categories: CourseCategory[]
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (payload: { name: string; description?: string }) => Promise<boolean>
  onUpdate: (id: number, payload: { name: string; description?: string }) => Promise<boolean>
  onDelete: (id: number) => Promise<boolean>
}

export function AdminLearnCategoryDialog({
  open,
  categories,
  isSubmitting,
  onOpenChange,
  onCreate,
  onUpdate,
  onDelete,
}: AdminLearnCategoryDialogProps) {
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
          <DialogTitle>{t('taxonomy.categoryTitle')}</DialogTitle>
          <DialogDescription>{t('taxonomy.categoryDescription')}</DialogDescription>
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
          {categories.length === 0 ? <p className="text-sm text-muted-foreground">{t('empty.noCategories')}</p> : null}
          {categories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
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

type CategoryRowProps = {
  category: CourseCategory
  isSubmitting: boolean
  onUpdate: (id: number, payload: { name: string; description?: string }) => Promise<boolean>
  onDelete: (id: number) => Promise<boolean>
}

function CategoryRow({ category, isSubmitting, onUpdate, onDelete }: CategoryRowProps) {
  const t = useTranslations('adminLearn')
  const [name, setName] = useState(category.name)
  const [description, setDescription] = useState(category.description ?? '')

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <Input value={name} onChange={(event) => setName(event.target.value)} />
      <Input value={description} onChange={(event) => setDescription(event.target.value)} />
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={isSubmitting || !name.trim()}
          onClick={() => void onUpdate(category.id, { name: name.trim(), description: description.trim() })}
          type="button"
        >
          {t('actions.save')}
        </Button>
        <Button
          variant="destructive"
          disabled={isSubmitting}
          onClick={() => void onDelete(category.id)}
          type="button"
        >
          {t('actions.delete')}
        </Button>
      </div>
    </div>
  )
}
