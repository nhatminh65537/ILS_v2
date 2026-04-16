'use client'

import { useCallback, useMemo, useState } from 'react'
import { mapLearnAdminErrorToMessageKey } from '@/lib/learn-admin-error-map'
import {
  attachLearnLessonQuestion,
  deleteLearnLessonQuestion,
  getLearnLessonById,
  listLearnLessonQuestions,
  updateLearnLesson,
  updateLearnLessonQuestion,
} from '@/services/lessons.service'
import { listAdminQuizzes, listAdminQuizQuestions } from '@/services/quizzes.service'
import { LessonType } from '@/types/course.types'
import { ContentStatus as QuizContentStatus } from '@/types/quiz.types'
import type {
  AdminLearnLessonQuestionAttachPayload,
  AdminLearnLessonUpdatePayload,
  LearnLessonDetail,
  LearnLessonQuestionMapping,
} from '@/types/lesson.types'
import type { Quiz, QuizQuestion } from '@/types/quiz.types'

type LessonState = {
  data: LearnLessonDetail | null
  isLoading: boolean
  errorMessageKey: string | null
}

type MappingState = {
  data: LearnLessonQuestionMapping[]
  isLoading: boolean
  errorMessageKey: string | null
}

type QuizState = {
  data: Quiz[]
  isLoading: boolean
  errorMessageKey: string | null
}

type QuizQuestionState = {
  data: QuizQuestion[]
  isLoading: boolean
  errorMessageKey: string | null
}

const EMPTY_LESSON_STATE: LessonState = {
  data: null,
  isLoading: false,
  errorMessageKey: null,
}

const EMPTY_MAPPING_STATE: MappingState = {
  data: [],
  isLoading: false,
  errorMessageKey: null,
}

const EMPTY_QUIZ_STATE: QuizState = {
  data: [],
  isLoading: false,
  errorMessageKey: null,
}

const EMPTY_QUIZ_QUESTION_STATE: QuizQuestionState = {
  data: [],
  isLoading: false,
  errorMessageKey: null,
}

const sortMappings = (mappings: LearnLessonQuestionMapping[]): LearnLessonQuestionMapping[] =>
  [...mappings].sort((a, b) => (a.position !== b.position ? a.position - b.position : a.id - b.id))

const normalizeQuizStatus = (
  status?: string
): 'all' | QuizContentStatus => {
  if (status === QuizContentStatus.Draft || status === QuizContentStatus.Published || status === QuizContentStatus.Archived) {
    return status
  }

  return 'all'
}

export const useAdminLearnLessonEditor = () => {
  const [lessonState, setLessonState] = useState<LessonState>(EMPTY_LESSON_STATE)
  const [mappingsState, setMappingsState] = useState<MappingState>(EMPTY_MAPPING_STATE)
  const [quizState, setQuizState] = useState<QuizState>(EMPTY_QUIZ_STATE)
  const [quizQuestionState, setQuizQuestionState] = useState<QuizQuestionState>(EMPTY_QUIZ_QUESTION_STATE)
  const [isMutating, setIsMutating] = useState(false)
  const [mutationErrorKey, setMutationErrorKey] = useState<string | null>(null)

  const isMiniQuiz = useMemo(() => lessonState.data?.lesson_type === LessonType.MiniQuiz, [lessonState.data])

  const loadLesson = useCallback(async (lessonId: number) => {
    setLessonState((s) => ({ ...s, isLoading: true, errorMessageKey: null }))

    try {
      const lesson = await getLearnLessonById(lessonId)
      setLessonState({ data: lesson, isLoading: false, errorMessageKey: null })
    } catch (error) {
      setLessonState((s) => ({
        ...s,
        isLoading: false,
        errorMessageKey: mapLearnAdminErrorToMessageKey(error, 'adminLearn.errors.loadLessonFailed'),
      }))
    }
  }, [])

  const loadLessonMappings = useCallback(async (lessonId: number) => {
    setMappingsState((s) => ({ ...s, isLoading: true, errorMessageKey: null }))

    try {
      const mappings = await listLearnLessonQuestions(lessonId)
      setMappingsState({ data: sortMappings(mappings), isLoading: false, errorMessageKey: null })
    } catch (error) {
      setMappingsState((s) => ({
        ...s,
        isLoading: false,
        errorMessageKey: mapLearnAdminErrorToMessageKey(error, 'adminLearn.errors.loadMappingsFailed'),
      }))
    }
  }, [])

  const loadQuizOptions = useCallback(async (params?: { search?: string; status?: string }) => {
    setQuizState((s) => ({ ...s, isLoading: true, errorMessageKey: null }))

    try {
      const result = await listAdminQuizzes({
        search: params?.search,
        status: normalizeQuizStatus(params?.status),
        limit: 100,
      })
      setQuizState({ data: result.items, isLoading: false, errorMessageKey: null })
    } catch (error) {
      setQuizState((s) => ({
        ...s,
        isLoading: false,
        errorMessageKey: mapLearnAdminErrorToMessageKey(error, 'adminLearn.errors.loadQuizzesFailed'),
      }))
    }
  }, [])

  const loadQuizQuestionOptions = useCallback(async (quizId: number) => {
    setQuizQuestionState((s) => ({ ...s, isLoading: true, errorMessageKey: null }))

    try {
      const questions = await listAdminQuizQuestions(quizId)
      setQuizQuestionState({ data: questions, isLoading: false, errorMessageKey: null })
    } catch (error) {
      setQuizQuestionState((s) => ({
        ...s,
        isLoading: false,
        errorMessageKey: mapLearnAdminErrorToMessageKey(error, 'adminLearn.errors.loadQuizQuestionsFailed'),
      }))
    }
  }, [])

  const submitLessonUpdate = useCallback(async (
    lessonId: number,
    payload: AdminLearnLessonUpdatePayload
  ): Promise<boolean> => {
    if (lessonState.data?.lesson_type === LessonType.Markdown && !(payload.content_md ?? '').trim()) {
      setMutationErrorKey('adminLearn.errors.markdownContentRequired')
      return false
    }

    if (lessonState.data?.lesson_type === LessonType.Video && !(payload.video_url ?? '').trim()) {
      setMutationErrorKey('adminLearn.errors.videoUrlRequired')
      return false
    }

    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      const updated = await updateLearnLesson(lessonId, payload)
      setLessonState({ data: updated, isLoading: false, errorMessageKey: null })
      return true
    } catch (error) {
      setMutationErrorKey(mapLearnAdminErrorToMessageKey(error, 'adminLearn.errors.updateLessonFailed'))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [lessonState.data?.lesson_type])

  const submitAttachMapping = useCallback(async (
    lessonId: number,
    payload: AdminLearnLessonQuestionAttachPayload,
    selectedQuizId?: number
  ): Promise<boolean> => {
    if (!selectedQuizId || !payload.question_id) {
      setMutationErrorKey('adminLearn.errors.quizSelectionRequired')
      return false
    }

    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      await attachLearnLessonQuestion(lessonId, payload)
      await loadLessonMappings(lessonId)
      return true
    } catch (error) {
      setMutationErrorKey(mapLearnAdminErrorToMessageKey(error, 'adminLearn.errors.attachMappingFailed'))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [loadLessonMappings])

  const submitDeleteMapping = useCallback(async (lessonId: number, mappingId: number): Promise<boolean> => {
    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      await deleteLearnLessonQuestion(mappingId)
      await loadLessonMappings(lessonId)
      return true
    } catch (error) {
      setMutationErrorKey(mapLearnAdminErrorToMessageKey(error, 'adminLearn.errors.deleteMappingFailed'))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [loadLessonMappings])

  const submitReorderMapping = useCallback(async (
    lessonId: number,
    orderedMappingIds: number[]
  ): Promise<boolean> => {
    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      const mappingById = new Map(mappingsState.data.map((mapping) => [mapping.id, mapping]))

      for (let index = 0; index < orderedMappingIds.length; index += 1) {
        const mappingId = orderedMappingIds[index]
        const mapping = mappingById.get(mappingId)
        if (!mapping) {
          continue
        }

        if (mapping.position === index) {
          continue
        }

        await updateLearnLessonQuestion(mapping.id, { position: index })
      }

      await loadLessonMappings(lessonId)
      return true
    } catch (error) {
      setMutationErrorKey(mapLearnAdminErrorToMessageKey(error, 'adminLearn.errors.reorderMappingFailed'))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [loadLessonMappings, mappingsState.data])

  return {
    lessonState,
    mappingsState,
    quizState,
    quizQuestionState,
    isMutating,
    mutationErrorKey,
    isMiniQuiz,
    loadLesson,
    loadLessonMappings,
    loadQuizOptions,
    loadQuizQuestionOptions,
    submitLessonUpdate,
    submitAttachMapping,
    submitDeleteMapping,
    submitReorderMapping,
  }
}
