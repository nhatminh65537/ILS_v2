import { create } from 'zustand'
import type {
  Challenge,
  ChallengeInstance,
  ChallengeProgressDetailResponse,
  FlagSubmissionResponse,
} from '@/types/challenge.types'

interface ChallengesState {
  challenges: Challenge[]
  selectedChallenge: Challenge | null
  challengeProgress: ChallengeProgressDetailResponse | null
  instanceStatus: ChallengeInstance | { status: 'none' } | null
  submitResult: FlagSubmissionResponse | null
  isLoading: boolean
  isSubmitting: boolean
  isInstanceLoading: boolean
  error: string | null
  setChallenges: (challenges: Challenge[]) => void
  setSelectedChallenge: (challenge: Challenge | null) => void
  setChallengeProgress: (progress: ChallengeProgressDetailResponse | null) => void
  setInstanceStatus: (status: ChallengeInstance | { status: 'none' } | null) => void
  setSubmitResult: (result: FlagSubmissionResponse | null) => void
  setLoading: (isLoading: boolean) => void
  setSubmitting: (isSubmitting: boolean) => void
  setInstanceLoading: (isInstanceLoading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  challenges: [] as Challenge[],
  selectedChallenge: null as Challenge | null,
  challengeProgress: null as ChallengeProgressDetailResponse | null,
  instanceStatus: null as ChallengeInstance | { status: 'none' } | null,
  submitResult: null as FlagSubmissionResponse | null,
  isLoading: false,
  isSubmitting: false,
  isInstanceLoading: false,
  error: null as string | null,
}

export const useChallengesStore = create<ChallengesState>()((set) => ({
  ...initialState,
  setChallenges: (challenges) => set({ challenges }),
  setSelectedChallenge: (selectedChallenge) => set({ selectedChallenge }),
  setChallengeProgress: (challengeProgress) => set({ challengeProgress }),
  setInstanceStatus: (instanceStatus) => set({ instanceStatus }),
  setSubmitResult: (submitResult) => set({ submitResult }),
  setLoading: (isLoading) => set({ isLoading }),
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
  setInstanceLoading: (isInstanceLoading) => set({ isInstanceLoading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}))
