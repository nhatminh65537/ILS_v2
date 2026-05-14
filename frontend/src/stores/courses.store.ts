import { create } from 'zustand'
import type { Course, CourseNode, UserCourseProgress } from '@/types/course.types'
import type {
  LearnLessonDetail,
  LearnLessonProgress,
  LearnLessonQuestionMapping,
} from '@/types/lesson.types'

interface CoursesState {
  courses: Course[]
  selectedCourse: Course | null
  courseProgress: UserCourseProgress | null
  rootNodes: CourseNode[]
  childrenByParentId: Record<number, CourseNode[]>
  expandedNodeIds: number[]
  isCatalogLoading: boolean
  isDetailLoading: boolean
  isTreeLoadingByNodeId: Record<number, boolean>
  error: string | null
  activeLesson: LearnLessonDetail | null
  lessonQuestions: LearnLessonQuestionMapping[]
  lessonProgress: LearnLessonProgress | null
  isLessonLoading: boolean
  isLessonQuestionsLoading: boolean
  isLessonProgressSubmitting: boolean
  lessonError: string | null
  isStarted: boolean
  isCompleted: boolean
  completedLessonIds: Set<number>
  setCourses: (courses: Course[]) => void
  setSelectedCourse: (course: Course | null) => void
  setCourseProgress: (progress: UserCourseProgress | null) => void
  setRootNodes: (nodes: CourseNode[]) => void
  mergeChildren: (parentId: number, children: CourseNode[]) => void
  toggleNodeExpanded: (nodeId: number) => void
  setExpandedNodeIds: (nodeIds: number[]) => void
  setCatalogLoading: (isLoading: boolean) => void
  setDetailLoading: (isLoading: boolean) => void
  setTreeNodeLoading: (nodeId: number, isLoading: boolean) => void
  setError: (error: string | null) => void
  setActiveLesson: (lesson: LearnLessonDetail | null) => void
  setLessonQuestions: (questions: LearnLessonQuestionMapping[]) => void
  setLessonProgress: (progress: LearnLessonProgress | null) => void
  setLessonLoading: (isLoading: boolean) => void
  setLessonQuestionsLoading: (isLoading: boolean) => void
  setLessonProgressSubmitting: (isSubmitting: boolean) => void
  setLessonError: (error: string | null) => void
  setStarted: (started: boolean) => void
  setCompleted: (completed: boolean) => void
  markLessonCompleted: (lessonId: number) => void
  resetLessonState: (currentLessonId?: number) => void
  reset: () => void
}

const initialState = {
  courses: [] as Course[],
  selectedCourse: null as Course | null,
  courseProgress: null as UserCourseProgress | null,
  rootNodes: [] as CourseNode[],
  childrenByParentId: {} as Record<number, CourseNode[]>,
  expandedNodeIds: [] as number[],
  isCatalogLoading: false,
  isDetailLoading: false,
  isTreeLoadingByNodeId: {} as Record<number, boolean>,
  error: null as string | null,
  activeLesson: null as LearnLessonDetail | null,
  lessonQuestions: [] as LearnLessonQuestionMapping[],
  lessonProgress: null as LearnLessonProgress | null,
  isLessonLoading: false,
  isLessonQuestionsLoading: false,
  isLessonProgressSubmitting: false,
  lessonError: null as string | null,
  isStarted: false,
  isCompleted: false,
  completedLessonIds: new Set<number>(),
}

const initialLessonState = {
  activeLesson: null as LearnLessonDetail | null,
  lessonQuestions: [] as LearnLessonQuestionMapping[],
  lessonProgress: null as LearnLessonProgress | null,
  isLessonLoading: false,
  isLessonQuestionsLoading: false,
  isLessonProgressSubmitting: false,
  lessonError: null as string | null,
  isStarted: false,
  isCompleted: false,
}

export const useCoursesStore = create<CoursesState>()((set) => ({
  ...initialState,
  setCourses: (courses) => set({ courses }),
  setSelectedCourse: (selectedCourse) => set({ selectedCourse }),
  setCourseProgress: (courseProgress) => set({ courseProgress }),
  setRootNodes: (rootNodes) => set({ rootNodes }),
  mergeChildren: (parentId, children) =>
    set((state) => ({
      childrenByParentId: {
        ...state.childrenByParentId,
        [parentId]: children,
      },
    })),
  toggleNodeExpanded: (nodeId) =>
    set((state) => ({
      expandedNodeIds: state.expandedNodeIds.includes(nodeId)
        ? state.expandedNodeIds.filter((id) => id !== nodeId)
        : [...state.expandedNodeIds, nodeId],
    })),
  setExpandedNodeIds: (expandedNodeIds) => set({ expandedNodeIds }),
  setCatalogLoading: (isCatalogLoading) => set({ isCatalogLoading }),
  setDetailLoading: (isDetailLoading) => set({ isDetailLoading }),
  setTreeNodeLoading: (nodeId, isLoading) =>
    set((state) => ({
      isTreeLoadingByNodeId: {
        ...state.isTreeLoadingByNodeId,
        [nodeId]: isLoading,
      },
    })),
  setError: (error) => set({ error }),
  setActiveLesson: (activeLesson) => set({ activeLesson }),
  setLessonQuestions: (lessonQuestions) => set({ lessonQuestions }),
  setLessonProgress: (lessonProgress) =>
    set((state) => {
      const lessonId = lessonProgress?.lesson
      const isCompletedNow = Boolean(lessonProgress?.is_completed)

      // Track completed lesson IDs persistently (within session)
      const nextCompletedIds = new Set(state.completedLessonIds)
      if (lessonId != null && isCompletedNow) {
        nextCompletedIds.add(lessonId)
      }

      return {
        lessonProgress,
        isStarted: lessonProgress?.started_at != null,
        isCompleted: isCompletedNow,
        completedLessonIds: nextCompletedIds,
      }
    }),
  setLessonLoading: (isLessonLoading) => set({ isLessonLoading }),
  setLessonQuestionsLoading: (isLessonQuestionsLoading) => set({ isLessonQuestionsLoading }),
  setLessonProgressSubmitting: (isLessonProgressSubmitting) => set({ isLessonProgressSubmitting }),
  setLessonError: (lessonError) => set({ lessonError }),
  setStarted: (isStarted) => set({ isStarted }),
  setCompleted: (isCompleted) => set({ isCompleted }),
  markLessonCompleted: (lessonId: number) =>
    set((state) => {
      const next = new Set(state.completedLessonIds)
      next.add(lessonId)
      return { completedLessonIds: next }
    }),
  resetLessonState: (currentLessonId?: number) =>
    set((state) => {
      const wasCompleted =
        currentLessonId != null && state.completedLessonIds.has(currentLessonId)
      return {
        ...initialLessonState,
        isStarted: wasCompleted,
        isCompleted: wasCompleted,
      }
    }),
  reset: () => set(initialState),
}))
