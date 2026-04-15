'use client'

import { useCallback } from 'react'
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
    loadCourses,
    loadCourseDetail,
    loadCourseProgress,
    loadRootNodes,
    loadNodeChildren,
    expandNode,
    reset,
  }
}
