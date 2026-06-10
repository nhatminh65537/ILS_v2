import Link from 'next/link'
import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { type CourseNode } from '@/types/course.types'

type LessonCourseTreeSidebarProps = {
  locale: string
  slug: string
  rootNodes: readonly CourseNode[]
  childrenByParentId: Readonly<Record<number, readonly CourseNode[]>>
  currentLessonId: number
}

// Folder-first ordering: folders (is_item=false) before lessons (is_item=true),
// then by author position, then id. Mirrors the catalog explorer convention.
const sortNodes = (nodes: readonly CourseNode[]): CourseNode[] =>
  [...nodes].sort((a, b) => {
    if (a.is_item !== b.is_item) {
      return a.is_item ? 1 : -1
    }
    if (a.position !== b.position) {
      return a.position - b.position
    }
    return a.id - b.id
  })

export function LessonCourseTreeSidebar({
  locale,
  slug,
  rootNodes,
  childrenByParentId,
  currentLessonId,
}: LessonCourseTreeSidebarProps) {
  const t = useTranslations('courses.lessonViewer')

  const renderNodes = (nodes: readonly CourseNode[], depth: number): ReactNode => {
    const sorted = sortNodes(nodes)
    if (sorted.length === 0) {
      return null
    }

    return (
      <ul className="space-y-2">
        {sorted.map((node) => {
          const children = childrenByParentId[node.id] ?? []
          const isActive = node.lesson?.id === currentLessonId

          return (
            <li key={node.id} style={{ marginLeft: depth * 10 }} className="space-y-2">
              {!node.is_item ? (
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{node.title}</p>
              ) : node.lesson ? (
                <Link
                  href={`/${locale}/courses/${slug}/lessons/${node.lesson.id}`}
                  className={
                    isActive
                      ? 'block rounded-md border bg-accent px-2 py-1 text-sm font-medium'
                      : 'block rounded-md px-2 py-1 text-sm hover:bg-muted'
                  }
                >
                  {node.lesson.title}
                </Link>
              ) : (
                <p className="rounded-md px-2 py-1 text-sm">{node.title}</p>
              )}

              {children.length > 0 ? renderNodes(children, depth + 1) : null}
            </li>
          )
        })}
      </ul>
    )
  }

  if (rootNodes.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('emptyTree')}</p>
  }

  return <div className="space-y-2">{renderNodes(rootNodes, 0)}</div>
}
