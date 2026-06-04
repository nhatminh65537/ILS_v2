'use client'

import { useTranslations } from 'next-intl'
import type { QuizBreadcrumbCrumb } from '@/types/quiz.types'

type QuizBreadcrumbProps = {
  breadcrumb: readonly QuizBreadcrumbCrumb[]
  onNavigate: (folderId: number | null) => void
}

export function QuizBreadcrumb({ breadcrumb, onNavigate }: QuizBreadcrumbProps) {
  const t = useTranslations('quizzes')

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      <button type="button" className="hover:text-foreground hover:underline" onClick={() => onNavigate(null)}>
        {t('explorer.root')}
      </button>
      {breadcrumb.map((crumb, idx) => {
        const isLast = idx === breadcrumb.length - 1
        return (
          <span key={crumb.id} className="flex items-center gap-1">
            <span>/</span>
            {isLast ? (
              <span className="text-foreground">{crumb.title}</span>
            ) : (
              <button
                type="button"
                className="hover:text-foreground hover:underline"
                onClick={() => onNavigate(crumb.id)}
              >
                {crumb.title}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}
