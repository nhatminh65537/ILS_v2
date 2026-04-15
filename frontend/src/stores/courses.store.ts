import { create } from 'zustand'
import type { Course, CourseNode, UserCourseProgress } from '@/types/course.types'

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
  reset: () => set(initialState),
}))
