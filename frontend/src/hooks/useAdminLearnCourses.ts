'use client'

import { useCallback, useRef, useState } from 'react'
import { mapLearnAdminErrorToMessageKey } from '@/lib/learn-admin-error-map'
import {
  createAdminLearnCategory,
  createAdminLearnCourse,
  createAdminLearnTag,
  deleteAdminLearnCategory,
  deleteAdminLearnCourse,
  deleteAdminLearnTag,
  getLearnCourseBySlug,
  listAdminLearnCategories,
  listAdminLearnCourses,
  listAdminLearnTags,
  updateAdminLearnCategory,
  updateAdminLearnCourse,
  updateAdminLearnTag,
} from '@/services/courses.service'
import {
  ContentStatus,
  type AdminLearnCourseListParams,
  type AdminLearnCourseMutationPayload,
  type Course,
  type CourseCategory,
  type CourseTag,
} from '@/types/course.types'

const PAGE_SIZE = 20

type ListState = {
  data: Course[]
  isLoading: boolean
  errorMessageKey: string | null
}

type DetailState = {
  data: Course | null
  isLoading: boolean
  errorMessageKey: string | null
}

type TaxonomyState = {
  categories: CourseCategory[]
  tags: CourseTag[]
  isLoading: boolean
  errorMessageKey: string | null
}

type PaginationState = {
  count: number
  page: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}

const EMPTY_LIST_STATE: ListState = {
  data: [],
  isLoading: false,
  errorMessageKey: null,
}

const EMPTY_DETAIL_STATE: DetailState = {
  data: null,
  isLoading: false,
  errorMessageKey: null,
}

const EMPTY_TAXONOMY_STATE: TaxonomyState = {
  categories: [],
  tags: [],
  isLoading: false,
  errorMessageKey: null,
}

const EMPTY_PAGINATION: PaginationState = {
  count: 0,
  page: 1,
  pageSize: PAGE_SIZE,
  hasNext: false,
  hasPrevious: false,
}

const toMutationPayload = (
  course: Course,
  statusOverride?: ContentStatus
): AdminLearnCourseMutationPayload => ({
  title: course.title,
  slug: course.slug,
  description: course.description ?? '',
  status: statusOverride ?? course.status,
  category_id: course.category?.id ?? null,
  tag_ids: course.tags.map((tag) => tag.id),
  learning_point: course.learning_point,
  estimated_time: course.estimated_time,
})

export const useAdminLearnCourses = () => {
  const [listState, setListState] = useState<ListState>(EMPTY_LIST_STATE)
  const [detailState, setDetailState] = useState<DetailState>(EMPTY_DETAIL_STATE)
  const [taxonomyState, setTaxonomyState] = useState<TaxonomyState>(EMPTY_TAXONOMY_STATE)
  const [paginationState, setPaginationState] = useState<PaginationState>(EMPTY_PAGINATION)
  const [isMutating, setIsMutating] = useState(false)
  const [mutationErrorKey, setMutationErrorKey] = useState<string | null>(null)

  const activeParamsRef = useRef<AdminLearnCourseListParams>({ limit: PAGE_SIZE })

  const loadCourseList = useCallback(async (params?: AdminLearnCourseListParams) => {
    const mergedParams: AdminLearnCourseListParams = {
      ...activeParamsRef.current,
      ...(params ?? {}),
      limit: params?.limit ?? activeParamsRef.current.limit ?? PAGE_SIZE,
    }

    activeParamsRef.current = mergedParams

    setListState((s) => ({ ...s, isLoading: true, errorMessageKey: null }))

    try {
      const result = await listAdminLearnCourses(mergedParams)
      const page = mergedParams.offset ? Math.floor(mergedParams.offset / PAGE_SIZE) + 1 : 1
      setListState({ data: result.items, isLoading: false, errorMessageKey: null })
      setPaginationState({
        count: result.count,
        page,
        pageSize: PAGE_SIZE,
        hasNext: Boolean(result.next),
        hasPrevious: Boolean(result.previous),
      })
    } catch (error) {
      setListState((s) => ({
        ...s,
        isLoading: false,
        errorMessageKey: mapLearnAdminErrorToMessageKey(error, 'errors.loadCoursesFailed'),
      }))
    }
  }, [])

  const loadCoursePage = useCallback(async (page: number) => {
    const offset = (Math.max(page, 1) - 1) * PAGE_SIZE
    await loadCourseList({ ...activeParamsRef.current, offset })
  }, [loadCourseList])

  const loadCourseDetail = useCallback(async (slug: string) => {
    setDetailState((s) => ({ ...s, isLoading: true, errorMessageKey: null }))

    try {
      const detail = await getLearnCourseBySlug(slug)
      setDetailState({ data: detail, isLoading: false, errorMessageKey: null })
    } catch (error) {
      setDetailState((s) => ({
        ...s,
        isLoading: false,
        errorMessageKey: mapLearnAdminErrorToMessageKey(error, 'errors.loadCourseDetailFailed'),
      }))
    }
  }, [])

  const loadTaxonomies = useCallback(async () => {
    setTaxonomyState((s) => ({ ...s, isLoading: true, errorMessageKey: null }))

    try {
      const [categories, tags] = await Promise.all([listAdminLearnCategories(), listAdminLearnTags()])
      setTaxonomyState({
        categories: categories.items,
        tags: tags.items,
        isLoading: false,
        errorMessageKey: null,
      })
    } catch (error) {
      setTaxonomyState((s) => ({
        ...s,
        isLoading: false,
        errorMessageKey: mapLearnAdminErrorToMessageKey(error, 'errors.loadTaxonomyFailed'),
      }))
    }
  }, [])

  const submitCreateCourse = useCallback(async (payload: AdminLearnCourseMutationPayload): Promise<Course | null> => {
    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      const created = await createAdminLearnCourse(payload)
      await loadCourseList({ ...activeParamsRef.current })
      return created
    } catch (error) {
      setMutationErrorKey(mapLearnAdminErrorToMessageKey(error, 'errors.createCourseFailed'))
      return null
    } finally {
      setIsMutating(false)
    }
  }, [loadCourseList])

  const submitUpdateCourse = useCallback(async (
    slug: string,
    payload: AdminLearnCourseMutationPayload
  ): Promise<boolean> => {
    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      const updated = await updateAdminLearnCourse(slug, payload)
      setDetailState({ data: updated, isLoading: false, errorMessageKey: null })
      await loadCourseList({ ...activeParamsRef.current })
      return true
    } catch (error) {
      setMutationErrorKey(mapLearnAdminErrorToMessageKey(error, 'errors.updateCourseFailed'))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [loadCourseList])

  const submitArchiveCourse = useCallback(async (slug: string): Promise<boolean> => {
    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      await deleteAdminLearnCourse(slug, 'archive')
      await loadCourseList({ ...activeParamsRef.current })
      return true
    } catch (error) {
      setMutationErrorKey(mapLearnAdminErrorToMessageKey(error, 'errors.archiveCourseFailed'))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [loadCourseList])

  const submitPurgeCourse = useCallback(async (slug: string): Promise<boolean> => {
    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      await deleteAdminLearnCourse(slug, 'purge')
      await loadCourseList({ ...activeParamsRef.current })
      return true
    } catch (error) {
      setMutationErrorKey(mapLearnAdminErrorToMessageKey(error, 'errors.purgeCourseFailed'))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [loadCourseList])

  const submitStatusToggle = useCallback(async (course: Course, nextStatus: ContentStatus): Promise<boolean> => {
    return submitUpdateCourse(course.slug, toMutationPayload(course, nextStatus))
  }, [submitUpdateCourse])

  const submitCreateCategory = useCallback(async (payload: { name: string; description?: string }): Promise<boolean> => {
    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      await createAdminLearnCategory(payload)
      await loadTaxonomies()
      return true
    } catch (error) {
      setMutationErrorKey(mapLearnAdminErrorToMessageKey(error, 'errors.createCategoryFailed'))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [loadTaxonomies])

  const submitUpdateCategory = useCallback(async (
    id: number,
    payload: { name: string; description?: string }
  ): Promise<boolean> => {
    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      await updateAdminLearnCategory(id, payload)
      await loadTaxonomies()
      return true
    } catch (error) {
      setMutationErrorKey(mapLearnAdminErrorToMessageKey(error, 'errors.updateCategoryFailed'))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [loadTaxonomies])

  const submitDeleteCategory = useCallback(async (id: number): Promise<boolean> => {
    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      await deleteAdminLearnCategory(id)
      await loadTaxonomies()
      return true
    } catch (error) {
      setMutationErrorKey(mapLearnAdminErrorToMessageKey(error, 'errors.deleteCategoryFailed'))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [loadTaxonomies])

  const submitCreateTag = useCallback(async (payload: { name: string; description?: string }): Promise<boolean> => {
    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      await createAdminLearnTag(payload)
      await loadTaxonomies()
      return true
    } catch (error) {
      setMutationErrorKey(mapLearnAdminErrorToMessageKey(error, 'errors.createTagFailed'))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [loadTaxonomies])

  const submitUpdateTag = useCallback(async (
    id: number,
    payload: { name: string; description?: string }
  ): Promise<boolean> => {
    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      await updateAdminLearnTag(id, payload)
      await loadTaxonomies()
      return true
    } catch (error) {
      setMutationErrorKey(mapLearnAdminErrorToMessageKey(error, 'errors.updateTagFailed'))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [loadTaxonomies])

  const submitDeleteTag = useCallback(async (id: number): Promise<boolean> => {
    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      await deleteAdminLearnTag(id)
      await loadTaxonomies()
      return true
    } catch (error) {
      setMutationErrorKey(mapLearnAdminErrorToMessageKey(error, 'errors.deleteTagFailed'))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [loadTaxonomies])

  return {
    listState,
    detailState,
    taxonomyState,
    paginationState,
    isMutating,
    mutationErrorKey,
    loadCourseList,
    loadCoursePage,
    loadCourseDetail,
    loadTaxonomies,
    submitCreateCourse,
    submitUpdateCourse,
    submitArchiveCourse,
    submitPurgeCourse,
    submitStatusToggle,
    submitCreateCategory,
    submitUpdateCategory,
    submitDeleteCategory,
    submitCreateTag,
    submitUpdateTag,
    submitDeleteTag,
    toMutationPayload,
  }
}
