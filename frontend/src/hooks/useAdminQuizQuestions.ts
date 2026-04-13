'use client'

import { useCallback, useState } from 'react'
import { mapQuizAdminErrorToMessageKey } from '@/lib/quiz-admin-error-map'
import {
  createAdminQuizQuestion,
  deleteAdminQuizQuestion,
  listAdminQuizQuestions,
  updateAdminQuizQuestion,
} from '@/services/quizzes.service'
import {
  QuestionType,
  type AdminQuizQuestionMutationPayload,
  type QuizQuestion,
} from '@/types/quiz.types'

type QuestionsState = {
  data: QuizQuestion[]
  isLoading: boolean
  errorMessageKey: string | null
}

const EMPTY_STATE: QuestionsState = {
  data: [],
  isLoading: false,
  errorMessageKey: null,
}

const normalizeQuestionPayload = (
  question: QuizQuestion,
  nextPosition?: number
): AdminQuizQuestionMutationPayload => {
  const contentText = String(question.content?.text ?? '').trim()

  if (question.question_type === QuestionType.FillBlank) {
    return {
      question_type: QuestionType.FillBlank,
      content: { text: contentText },
      explanation: question.explanation,
      case_sensitive: question.case_sensitive,
      score: question.score,
      position: nextPosition ?? question.position,
      answers: (question.answers ?? []).map((item) => ({ answer: item.answer })),
    }
  }

  return {
    question_type: question.question_type,
    content: { text: contentText },
    explanation: question.explanation,
    case_sensitive: question.case_sensitive,
    score: question.score,
    position: nextPosition ?? question.position,
    options: (question.options ?? []).map((item, index) => ({
      content: item.content,
      position: item.position ?? index + 1,
      is_correct: Boolean(item.is_correct),
    })),
  }
}

export const useAdminQuizQuestions = () => {
  const [questionsState, setQuestionsState] = useState<QuestionsState>(EMPTY_STATE)
  const [isMutating, setIsMutating] = useState(false)
  const [mutationErrorKey, setMutationErrorKey] = useState<string | null>(null)

  const loadQuestions = useCallback(async (quizId: number) => {
    setQuestionsState((s) => ({ ...s, isLoading: true, errorMessageKey: null }))

    try {
      const questions = await listAdminQuizQuestions(quizId)
      const sorted = [...questions].sort((a, b) => a.position - b.position)
      setQuestionsState({ data: sorted, isLoading: false, errorMessageKey: null })
    } catch (error) {
      setQuestionsState((s) => ({
        ...s,
        isLoading: false,
        errorMessageKey: mapQuizAdminErrorToMessageKey(error, 'adminQuizzes.errors.questionsLoadFailed'),
      }))
    }
  }, [])

  const submitCreateQuestion = useCallback(async (
    quizId: number,
    payload: AdminQuizQuestionMutationPayload
  ): Promise<boolean> => {
    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      await createAdminQuizQuestion(quizId, payload)
      await loadQuestions(quizId)
      return true
    } catch (error) {
      setMutationErrorKey(mapQuizAdminErrorToMessageKey(error, 'adminQuizzes.errors.questionCreateFailed'))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [loadQuestions])

  const submitUpdateQuestion = useCallback(async (
    quizId: number,
    questionId: number,
    payload: AdminQuizQuestionMutationPayload
  ): Promise<boolean> => {
    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      await updateAdminQuizQuestion(quizId, questionId, payload)
      await loadQuestions(quizId)
      return true
    } catch (error) {
      setMutationErrorKey(mapQuizAdminErrorToMessageKey(error, 'adminQuizzes.errors.questionUpdateFailed'))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [loadQuestions])

  const submitDeleteQuestion = useCallback(async (quizId: number, questionId: number): Promise<boolean> => {
    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      await deleteAdminQuizQuestion(quizId, questionId)
      await loadQuestions(quizId)
      return true
    } catch (error) {
      setMutationErrorKey(mapQuizAdminErrorToMessageKey(error, 'adminQuizzes.errors.questionDeleteFailed'))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [loadQuestions])

  const submitReorderQuestions = useCallback(async (
    quizId: number,
    orderedIds: number[]
  ): Promise<boolean> => {
    setIsMutating(true)
    setMutationErrorKey(null)

    try {
      const byId = new Map(questionsState.data.map((question) => [question.id, question]))
      for (let index = 0; index < orderedIds.length; index += 1) {
        const id = orderedIds[index]
        const question = byId.get(id)
        if (!question) {
          continue
        }

        const nextPosition = index + 1
        if (question.position === nextPosition) {
          continue
        }

        const payload = normalizeQuestionPayload(question, nextPosition)
        await updateAdminQuizQuestion(quizId, question.id, payload)
      }

      await loadQuestions(quizId)
      return true
    } catch (error) {
      setMutationErrorKey(mapQuizAdminErrorToMessageKey(error, 'adminQuizzes.errors.reorderFailed'))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [loadQuestions, questionsState.data])

  return {
    questionsState,
    isMutating,
    mutationErrorKey,
    loadQuestions,
    submitCreateQuestion,
    submitUpdateQuestion,
    submitDeleteQuestion,
    submitReorderQuestions,
  }
}
