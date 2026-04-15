'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import { useTranslations } from 'next-intl'
import { deriveMarkdownSignal } from '@/lib/lesson-completion'
import type { LessonCompletionSignal } from '@/types/lesson.types'

type LessonMarkdownContentProps = {
  content: string
  onSignalChange: (signal: LessonCompletionSignal) => void
}

export function LessonMarkdownContent({ content, onSignalChange }: LessonMarkdownContentProps) {
  const t = useTranslations('courses.lessonViewer')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [progress, setProgress] = useState(0)

  const signal = useMemo(() => deriveMarkdownSignal(progress), [progress])

  useEffect(() => {
    onSignalChange(signal)
  }, [onSignalChange, signal])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      const maxScroll = container.scrollHeight - container.clientHeight
      if (maxScroll <= 0) {
        setProgress(100)
        return
      }

      const current = (container.scrollTop / maxScroll) * 100
      setProgress(current)
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [content])

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('markdownHint')}</p>
      <div
        ref={containerRef}
        onScroll={(event) => {
          const target = event.currentTarget
          const maxScroll = target.scrollHeight - target.clientHeight
          if (maxScroll <= 0) {
            setProgress(100)
            return
          }
          const current = (target.scrollTop / maxScroll) * 100
          setProgress(current)
        }}
        className="max-h-[60vh] overflow-y-auto rounded-md border p-4"
      >
        <article className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {content}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  )
}
