import type { LessonCompletionSignal } from '@/types/lesson.types'

const clampPercent = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0
  }
  if (value < 0) {
    return 0
  }
  if (value > 100) {
    return 100
  }
  return value
}

export const deriveMarkdownSignal = (progressPercent: number): LessonCompletionSignal => {
  const normalized = clampPercent(progressPercent)
  return {
    type: 'markdown',
    progressPercent: normalized,
    ready: normalized >= 100,
    hintKey: normalized >= 100 ? 'signals.markdownReady' : 'signals.markdownPending',
  }
}

export const deriveVideoSignal = (progressPercent: number): LessonCompletionSignal => {
  const normalized = clampPercent(progressPercent)
  return {
    type: 'video',
    progressPercent: normalized,
    ready: normalized >= 80,
    hintKey: normalized >= 80 ? 'signals.videoReady' : 'signals.videoPending',
  }
}

export const deriveMiniquizSignal = (answeredCount: number, totalCount: number): LessonCompletionSignal => {
  const safeTotal = totalCount > 0 ? totalCount : 0
  const safeAnswered = answeredCount > 0 ? answeredCount : 0
  const percent = safeTotal === 0 ? 0 : clampPercent((safeAnswered / safeTotal) * 100)

  return {
    type: 'miniquiz',
    progressPercent: percent,
    ready: safeTotal > 0 && safeAnswered >= safeTotal,
    hintKey:
      safeTotal > 0 && safeAnswered >= safeTotal
        ? 'signals.miniquizReady'
        : 'signals.miniquizPending',
  }
}
