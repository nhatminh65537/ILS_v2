'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { MarkdownContent } from '@/components/ui/markdown-content'

type AdminLearnLessonMarkdownTabProps = {
  initialContent: string
  isSubmitting: boolean
  onSave: (contentMd: string) => Promise<boolean>
}

export function AdminLearnLessonMarkdownTab({
  initialContent,
  isSubmitting,
  onSave,
}: AdminLearnLessonMarkdownTabProps) {
  const t = useTranslations('adminLearn')
  const [content, setContent] = useState(initialContent)
  const [showPreview, setShowPreview] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPreview((prev) => !prev)}
        >
          {showPreview ? t('lesson.showEditor') : t('lesson.showPreview')}
        </Button>
      </div>

      {showPreview ? (
        <div className="min-h-72 rounded-md border border-border p-3">
          {content ? (
            <MarkdownContent content={content} />
          ) : (
            <p className="text-sm text-muted-foreground">{t('lesson.previewEmpty')}</p>
          )}
        </div>
      ) : (
        <textarea
          className="min-h-72 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          value={content}
          placeholder={t('lesson.markdownPlaceholder')}
          onChange={(event) => setContent(event.target.value)}
        />
      )}

      <Button disabled={isSubmitting} onClick={() => void onSave(content)}>
        {t('actions.save')}
      </Button>
    </div>
  )
}
