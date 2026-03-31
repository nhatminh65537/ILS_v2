import { create } from 'zustand'
import type { Course, CourseNode, UserCourseProgress } from '@/types/course.types'

interface CoursesState {
  courses: Course[]
  selectedCourse: Course | null
  courseTree: CourseNode[]
  progress: UserCourseProgress | null
  isLoading: boolean
  error: string | null
  setCourses: (courses: Course[]) => void
  setSelectedCourse: (course: Course | null) => void
  setCourseTree: (courseTree: CourseNode[]) => void
  setProgress: (progress: UserCourseProgress | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  courses: [] as Course[],
  selectedCourse: null as Course | null,
  courseTree: [] as CourseNode[],
  progress: null as UserCourseProgress | null,
  isLoading: false,
  error: null as string | null,
}

export const useCoursesStore = create<CoursesState>()((set) => ({
  ...initialState,
  setCourses: (courses) => set({ courses }),
  setSelectedCourse: (selectedCourse) => set({ selectedCourse }),
  setCourseTree: (courseTree) => set({ courseTree }),
  setProgress: (progress) => set({ progress }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}))
