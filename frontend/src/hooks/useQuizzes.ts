'use client'

import { useCallback } from 'react'
import { getQuizById, getQuizProgress, listQuizzes } from '@/services/quizzes.service'
import { useQuizzesStore } from '@/stores/quizzes.store'

export function useQuizzes() {
  const quizzes = useQuizzesStore((s) => s.quizzes)
  const selectedQuiz = useQuizzesStore((s) => s.selectedQuiz)
  const progress = useQuizzesStore((s) => s.progress)
  const isLoading = useQuizzesStore((s) => s.isLoading)
  const error = useQuizzesStore((s) => s.error)

  const setQuizzes = useQuizzesStore((s) => s.setQuizzes)
  const setSelectedQuiz = useQuizzesStore((s) => s.setSelectedQuiz)
  const setProgress = useQuizzesStore((s) => s.setProgress)
  const setLoading = useQuizzesStore((s) => s.setLoading)
  const setError = useQuizzesStore((s) => s.setError)
  const reset = useQuizzesStore((s) => s.reset)

  const loadQuizzes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listQuizzes()
      setQuizzes([...data.results])
    } catch {
      setError('quizzes.errors.loadFailed')
    } finally {
      setLoading(false)
    }
  }, [setError, setLoading, setQuizzes])

  const loadQuizDetail = useCallback(
    async (id: number) => {
      setLoading(true)
      setError(null)
      try {
        const [quiz, prog] = await Promise.all([
          getQuizById(id),
          getQuizProgress(id).catch(() => null), // progress may not exist yet
        ])
        setSelectedQuiz(quiz)
        setProgress(prog)
      } catch {
        setError('quizzes.errors.detailLoadFailed')
      } finally {
        setLoading(false)
      }
    },
    [setError, setLoading, setSelectedQuiz, setProgress]
  )

  return {
    quizzes,
    selectedQuiz,
    progress,
    isLoading,
    error,
    loadQuizzes,
    loadQuizDetail,
    reset,
  }
}
