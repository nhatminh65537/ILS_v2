'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

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

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <textarea
          className="min-h-72 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          value={content}
          placeholder={t('lesson.markdownPlaceholder')}
          onChange={(event) => setContent(event.target.value)}
        />
        <div className="min-h-72 rounded-md border border-border p-3">
          <p className="mb-2 text-xs text-muted-foreground">{t('lesson.previewTitle')}</p>
          <pre className="whitespace-pre-wrap text-sm">{content || t('lesson.previewEmpty')}</pre>
        </div>
      </div>
      <Button disabled={isSubmitting} onClick={() => void onSave(content)}>
        {t('actions.save')}
      </Button>
    </div>
  )
}
