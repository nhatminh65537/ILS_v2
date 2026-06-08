'use client'

import { useEffect, useMemo, useState } from 'react'
import { MarkdownContent } from '@/components/ui/markdown-content'
import { deriveMarkdownSignal } from '@/lib/lesson-completion'
import type { LessonCompletionSignal } from '@/types/lesson.types'

type LessonMarkdownContentProps = {
  content: string
  onSignalChange: (signal: LessonCompletionSignal) => void
}

export function LessonMarkdownContent({ content, onSignalChange }: LessonMarkdownContentProps) {
  const [progress, setProgress] = useState(0)

  const signal = useMemo(() => deriveMarkdownSignal(progress), [progress])

  useEffect(() => {
    onSignalChange(signal)
  }, [onSignalChange, signal])

  // Track whole-page scroll so the guided-progress signal still advances now
  // that lesson content scrolls with the page instead of an inner box.
  useEffect(() => {
    const computeProgress = () => {
      const scrollEl = document.scrollingElement ?? document.documentElement
      const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight
      if (maxScroll <= 4) {
        setProgress(100)
        return
      }
      const current = (scrollEl.scrollTop / maxScroll) * 100
      setProgress(Math.min(100, Math.max(0, current)))
    }

    computeProgress()
    window.addEventListener('scroll', computeProgress, { passive: true })
    window.addEventListener('resize', computeProgress)

    return () => {
      window.removeEventListener('scroll', computeProgress)
      window.removeEventListener('resize', computeProgress)
    }
  }, [content])

  return <MarkdownContent content={content} />
}
