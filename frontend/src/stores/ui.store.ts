import { create } from 'zustand'

export type ActiveModal =
  | 'none'
  | 'login'
  | 'register'
  | 'profile'
  | 'settings'
  | 'notification-panel'

interface UiState {
  isSidebarOpen: boolean
  activeModal: ActiveModal
  isGlobalLoading: boolean
  setSidebarOpen: (isOpen: boolean) => void
  toggleSidebar: () => void
  setActiveModal: (modal: ActiveModal) => void
  setGlobalLoading: (isLoading: boolean) => void
  resetUi: () => void
}

const initialUiState = {
  isSidebarOpen: true,
  activeModal: 'none' as ActiveModal,
  isGlobalLoading: false,
}

export const useUiStore = create<UiState>()((set) => ({
  ...initialUiState,
  setSidebarOpen: (isOpen) => {
    set({ isSidebarOpen: isOpen })
  },
  toggleSidebar: () => {
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen }))
  },
  setActiveModal: (modal) => {
    set({ activeModal: modal })
  },
  setGlobalLoading: (isLoading) => {
    set({ isGlobalLoading: isLoading })
  },
  resetUi: () => {
    set(initialUiState)
  },
}))
