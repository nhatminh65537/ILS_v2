import { create } from 'zustand'
import type { Challenge, ChallengeNode, UserChallengeProgress } from '@/types/challenge.types'

interface ChallengesState {
  challenges: Challenge[]
  selectedChallenge: Challenge | null
  challengeTree: ChallengeNode[]
  progress: UserChallengeProgress | null
  isLoading: boolean
  error: string | null
  setChallenges: (challenges: Challenge[]) => void
  setSelectedChallenge: (challenge: Challenge | null) => void
  setChallengeTree: (challengeTree: ChallengeNode[]) => void
  setProgress: (progress: UserChallengeProgress | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  challenges: [] as Challenge[],
  selectedChallenge: null as Challenge | null,
  challengeTree: [] as ChallengeNode[],
  progress: null as UserChallengeProgress | null,
  isLoading: false,
  error: null as string | null,
}

export const useChallengesStore = create<ChallengesState>()((set) => ({
  ...initialState,
  setChallenges: (challenges) => set({ challenges }),
  setSelectedChallenge: (selectedChallenge) => set({ selectedChallenge }),
  setChallengeTree: (challengeTree) => set({ challengeTree }),
  setProgress: (progress) => set({ progress }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}))
