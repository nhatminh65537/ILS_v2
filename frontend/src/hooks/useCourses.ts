'use client'

import { useCallback } from 'react'
import {
  completeLearnLessonProgress,
  getLearnLessonById,
  listLearnLessonQuestions,
  startLearnLessonProgress,
} from '@/services/lessons.service'
import {
  getLearnCourseBySlug,
  getLearnCourseProgress,
  listLearnCourses,
  listLearnNodeChildren,
  listLearnRootNodes,
} from '@/services/courses.service'
import { useCoursesStore } from '@/stores/courses.store'

export function useCourses() {
  const courses = useCoursesStore((s) => s.courses)
  const selectedCourse = useCoursesStore((s) => s.selectedCourse)
  const courseProgress = useCoursesStore((s) => s.courseProgress)
  const rootNodes = useCoursesStore((s) => s.rootNodes)
  const childrenByParentId = useCoursesStore((s) => s.childrenByParentId)
  const expandedNodeIds = useCoursesStore((s) => s.expandedNodeIds)
  const isCatalogLoading = useCoursesStore((s) => s.isCatalogLoading)
  const isDetailLoading = useCoursesStore((s) => s.isDetailLoading)
  const isTreeLoadingByNodeId = useCoursesStore((s) => s.isTreeLoadingByNodeId)
  const error = useCoursesStore((s) => s.error)
  const activeLesson = useCoursesStore((s) => s.activeLesson)
  const lessonQuestions = useCoursesStore((s) => s.lessonQuestions)
  const lessonProgress = useCoursesStore((s) => s.lessonProgress)
  const isLessonLoading = useCoursesStore((s) => s.isLessonLoading)
  const isLessonQuestionsLoading = useCoursesStore((s) => s.isLessonQuestionsLoading)
  const isLessonProgressSubmitting = useCoursesStore((s) => s.isLessonProgressSubmitting)
  const lessonError = useCoursesStore((s) => s.lessonError)
  const isStarted = useCoursesStore((s) => s.isStarted)
  const isCompleted = useCoursesStore((s) => s.isCompleted)

  const setCourses = useCoursesStore((s) => s.setCourses)
  const setSelectedCourse = useCoursesStore((s) => s.setSelectedCourse)
  const setCourseProgress = useCoursesStore((s) => s.setCourseProgress)
  const setRootNodes = useCoursesStore((s) => s.setRootNodes)
  const mergeChildren = useCoursesStore((s) => s.mergeChildren)
  const toggleNodeExpanded = useCoursesStore((s) => s.toggleNodeExpanded)
  const setCatalogLoading = useCoursesStore((s) => s.setCatalogLoading)
  const setDetailLoading = useCoursesStore((s) => s.setDetailLoading)
  const setTreeNodeLoading = useCoursesStore((s) => s.setTreeNodeLoading)
  const setError = useCoursesStore((s) => s.setError)
  const setActiveLesson = useCoursesStore((s) => s.setActiveLesson)
  const setLessonQuestions = useCoursesStore((s) => s.setLessonQuestions)
  const setLessonProgress = useCoursesStore((s) => s.setLessonProgress)
  const setLessonLoading = useCoursesStore((s) => s.setLessonLoading)
  const setLessonQuestionsLoading = useCoursesStore((s) => s.setLessonQuestionsLoading)
  const setLessonProgressSubmitting = useCoursesStore((s) => s.setLessonProgressSubmitting)
  const setLessonError = useCoursesStore((s) => s.setLessonError)
  const setStarted = useCoursesStore((s) => s.setStarted)
  const setCompleted = useCoursesStore((s) => s.setCompleted)
  const resetLessonState = useCoursesStore((s) => s.resetLessonState)
  const reset = useCoursesStore((s) => s.reset)

  const loadCourses = useCallback(async () => {
    setCatalogLoading(true)
    setError(null)
    try {
      const data = await listLearnCourses()
      setCourses([...data.items])
    } catch {
      setError('courses.errors.loadFailed')
    } finally {
      setCatalogLoading(false)
    }
  }, [setCatalogLoading, setCourses, setError])

  const loadCourseDetail = useCallback(
    async (slug: string) => {
      setDetailLoading(true)
      setError(null)
      try {
        const detail = await getLearnCourseBySlug(slug)
        setSelectedCourse(detail)
      } catch {
        setError('courses.errors.detailLoadFailed')
      } finally {
        setDetailLoading(false)
      }
    },
    [setDetailLoading, setError, setSelectedCourse]
  )

  const loadCourseProgress = useCallback(
    async (slug: string) => {
      try {
        const progress = await getLearnCourseProgress(slug)
        setCourseProgress(progress)
      } catch {
        setCourseProgress(null)
      }
    },
    [setCourseProgress]
  )

  const loadRootNodes = useCallback(
    async (slug: string) => {
      try {
        const nodes = await listLearnRootNodes(slug)
        setRootNodes(nodes)
      } catch {
        setError('courses.errors.treeLoadFailed')
      }
    },
    [setRootNodes, setError]
  )

  const loadNodeChildren = useCallback(
    async (slug: string, nodeId: number) => {
      setTreeNodeLoading(nodeId, true)
      try {
        const children = await listLearnNodeChildren(slug, nodeId)
        mergeChildren(nodeId, children)
      } catch {
        setError('courses.errors.treeLoadFailed')
      } finally {
        setTreeNodeLoading(nodeId, false)
      }
    },
    [mergeChildren, setError, setTreeNodeLoading]
  )

  const loadAllCourseNodesForNavigation = useCallback(
    async (slug: string) => {
      try {
        const roots = await listLearnRootNodes(slug)
        setRootNodes(roots)

        const queue = roots.filter((node) => !node.is_item).map((node) => node.id)
        const visited = new Set<number>()

        while (queue.length > 0) {
          const parentNodeId = queue.shift()
          if (typeof parentNodeId !== 'number') {
            continue
          }

          if (visited.has(parentNodeId)) {
            continue
          }

          visited.add(parentNodeId)

          const children = await listLearnNodeChildren(slug, parentNodeId)
          mergeChildren(parentNodeId, children)

          for (const child of children) {
            if (!child.is_item) {
              queue.push(child.id)
            }
          }
        }
      } catch {
        setError('courses.errors.treeLoadFailed')
      }
    },
    [mergeChildren, setError, setRootNodes]
  )

  const loadLessonById = useCallback(
    async (lessonId: number) => {
      setLessonLoading(true)
      setLessonError(null)
      setLessonQuestions([])

      try {
        const lesson = await getLearnLessonById(lessonId)
        setActiveLesson(lesson)
        return true
      } catch {
        setLessonError('courses.lessonViewer.errors.lessonLoadFailed')
        setActiveLesson(null)
        return false
      } finally {
        setLessonLoading(false)
      }
    },
    [setActiveLesson, setLessonError, setLessonLoading, setLessonQuestions]
  )

  const loadLessonQuestions = useCallback(
    async (lessonId: number) => {
      setLessonQuestionsLoading(true)
      setLessonError(null)

      try {
        const mappings = await listLearnLessonQuestions(lessonId)
        setLessonQuestions(mappings)
        return true
      } catch {
        setLessonQuestions([])
        setLessonError('courses.lessonViewer.errors.questionLoadFailed')
        return false
      } finally {
        setLessonQuestionsLoading(false)
      }
    },
    [setLessonError, setLessonQuestions, setLessonQuestionsLoading]
  )

  const startLesson = useCallback(
    async (lessonId: number) => {
      setLessonProgressSubmitting(true)
      setLessonError(null)

      try {
        const progress = await startLearnLessonProgress(lessonId)
        setLessonProgress(progress)
        setStarted(true)
        return true
      } catch {
        setLessonError('courses.lessonViewer.errors.startFailed')
        return false
      } finally {
        setLessonProgressSubmitting(false)
      }
    },
    [setLessonError, setLessonProgress, setLessonProgressSubmitting, setStarted]
  )

  const completeLesson = useCallback(
    async (lessonId: number) => {
      setLessonProgressSubmitting(true)
      setLessonError(null)

      try {
        const progress = await completeLearnLessonProgress(lessonId)
        setLessonProgress(progress)
        setCompleted(Boolean(progress.is_completed))
        return true
      } catch {
        setLessonError('courses.lessonViewer.errors.completeFailed')
        return false
      } finally {
        setLessonProgressSubmitting(false)
      }
    },
    [setCompleted, setLessonError, setLessonProgress, setLessonProgressSubmitting]
  )

  const expandNode = useCallback(
    async (slug: string, nodeId: number, isItem: boolean) => {
      if (isItem) {
        return
      }

      const isExpanded = expandedNodeIds.includes(nodeId)
      toggleNodeExpanded(nodeId)

      if (isExpanded) {
        return
      }

      const isChildrenCached = Object.prototype.hasOwnProperty.call(childrenByParentId, nodeId)
      if (!isChildrenCached) {
        await loadNodeChildren(slug, nodeId)
      }
    },
    [childrenByParentId, expandedNodeIds, loadNodeChildren, toggleNodeExpanded]
  )

  return {
    courses,
    selectedCourse,
    courseProgress,
    rootNodes,
    childrenByParentId,
    expandedNodeIds,
    isCatalogLoading,
    isDetailLoading,
    isTreeLoadingByNodeId,
    error,
    activeLesson,
    lessonQuestions,
    lessonProgress,
    isLessonLoading,
    isLessonQuestionsLoading,
    isLessonProgressSubmitting,
    lessonError,
    isStarted,
    isCompleted,
    loadCourses,
    loadCourseDetail,
    loadCourseProgress,
    loadRootNodes,
    loadNodeChildren,
    loadAllCourseNodesForNavigation,
    loadLessonById,
    loadLessonQuestions,
    startLesson,
    completeLesson,
    expandNode,
    resetLessonState,
    reset,
  }
}
