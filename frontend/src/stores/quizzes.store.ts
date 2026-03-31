import { create } from 'zustand'
import type { Quiz, QuizAttempt, QuizQuestion, UserQuizProgress } from '@/types/quiz.types'

interface QuizzesState {
  quizzes: Quiz[]
  selectedQuiz: Quiz | null
  activeAttempt: QuizAttempt | null
  activeQuestion: QuizQuestion | null
  progress: UserQuizProgress | null
  isLoading: boolean
  error: string | null
  setQuizzes: (quizzes: Quiz[]) => void
  setSelectedQuiz: (quiz: Quiz | null) => void
  setActiveAttempt: (attempt: QuizAttempt | null) => void
  setActiveQuestion: (question: QuizQuestion | null) => void
  setProgress: (progress: UserQuizProgress | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  quizzes: [] as Quiz[],
  selectedQuiz: null as Quiz | null,
  activeAttempt: null as QuizAttempt | null,
  activeQuestion: null as QuizQuestion | null,
  progress: null as UserQuizProgress | null,
  isLoading: false,
  error: null as string | null,
}

export const useQuizzesStore = create<QuizzesState>()((set) => ({
  ...initialState,
  setQuizzes: (quizzes) => set({ quizzes }),
  setSelectedQuiz: (selectedQuiz) => set({ selectedQuiz }),
  setActiveAttempt: (activeAttempt) => set({ activeAttempt }),
  setActiveQuestion: (activeQuestion) => set({ activeQuestion }),
  setProgress: (progress) => set({ progress }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}))
