import type { CourseNode } from '@/types/course.types'

export interface FlattenedLessonNode {
  readonly lessonId: number
  readonly title: string
  readonly nodeId: number
  readonly path: string
  readonly depth: number
  readonly position: number
}

const sortNodes = (nodes: readonly CourseNode[]): CourseNode[] =>
  [...nodes].sort((a, b) => {
    if (a.position !== b.position) {
      return a.position - b.position
    }
    return a.id - b.id
  })

const countDepth = (path: string): number => {
  if (!path) {
    return 0
  }
  return path.split('.').length
}

export const flattenLessonNodes = (
  rootNodes: readonly CourseNode[],
  childrenByParentId: Readonly<Record<number, readonly CourseNode[]>>
): FlattenedLessonNode[] => {
  const result: FlattenedLessonNode[] = []

  const walk = (nodes: readonly CourseNode[]) => {
    for (const node of sortNodes(nodes)) {
      if (node.is_item && node.lesson) {
        result.push({
          lessonId: node.lesson.id,
          title: node.lesson.title,
          nodeId: node.id,
          path: node.path,
          depth: countDepth(node.path),
          position: node.position,
        })
      }

      const children = childrenByParentId[node.id]
      if (children && children.length > 0) {
        walk(children)
      }
    }
  }

  walk(rootNodes)
  return result
}

export const findNeighborLessons = (
  lessons: readonly FlattenedLessonNode[],
  currentLessonId: number
): {
  previous: FlattenedLessonNode | null
  next: FlattenedLessonNode | null
} => {
  const index = lessons.findIndex((item) => item.lessonId === currentLessonId)
  if (index < 0) {
    return {
      previous: null,
      next: null,
    }
  }

  return {
    previous: index > 0 ? lessons[index - 1] : null,
    next: index < lessons.length - 1 ? lessons[index + 1] : null,
  }
}
