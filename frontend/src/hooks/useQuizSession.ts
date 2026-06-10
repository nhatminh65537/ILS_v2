'use client'

import { useCallback, useEffect, useReducer, useRef } from 'react'
import type {
  SessionQuestion,
  SessionProgress,
  WsAnswerResultEvent,
  WsFinishEvent,
} from '@/types/quiz.types'

export type SessionStatus = 'idle' | 'connecting' | 'authenticating' | 'active' | 'finished' | 'error'
export type QuestionPhase = 'questioning' | 'answered'

interface SessionState {
  status: SessionStatus
  questionPhase: QuestionPhase
  currentQuestion: SessionQuestion | null
  progress: SessionProgress | null
  answerResult: WsAnswerResultEvent | null
  finishData: WsFinishEvent | null
  elapsedSec: number
  error: string | null
  /** Mirror of the active question's immediate_feedback flag (defaults true). */
  immediateFeedback: boolean
  /** Whole-quiz time limit (sec) snapshotted from the question; 0 = unlimited. */
  timeLimitSec: number
  /** Set once the client-side limit is hit, so we only auto-submit once. */
  timeUp: boolean
}

type SessionAction =
  | { type: 'CONNECTING' }
  | { type: 'AUTHENTICATING' }
  | { type: 'AUTH_OK' }
  | { type: 'QUESTION'; question: SessionQuestion; progress: SessionProgress }
  | { type: 'ANSWER_RESULT'; result: WsAnswerResultEvent }
  | { type: 'FINISH'; data: WsFinishEvent }
  | { type: 'ERROR'; message: string }
  | { type: 'TICK' }
  | { type: 'TIME_UP' }

const initialState: SessionState = {
  status: 'idle',
  questionPhase: 'questioning',
  currentQuestion: null,
  progress: null,
  answerResult: null,
  finishData: null,
  elapsedSec: 0,
  error: null,
  immediateFeedback: true,
  timeLimitSec: 0,
  timeUp: false,
}

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'CONNECTING':
      return { ...state, status: 'connecting' }
    case 'AUTHENTICATING':
      return { ...state, status: 'authenticating' }
    case 'AUTH_OK':
      return { ...state, status: 'active' }
    case 'QUESTION':
      return {
        ...state,
        status: 'active',
        questionPhase: 'questioning',
        currentQuestion: action.question,
        progress: action.progress,
        answerResult: null,
        immediateFeedback: action.question.immediate_feedback ?? true,
        timeLimitSec: action.question.time_limit_sec ?? state.timeLimitSec,
      }
    case 'ANSWER_RESULT':
      return {
        ...state,
        questionPhase: 'answered',
        answerResult: action.result,
      }
    case 'FINISH':
      return {
        ...state,
        status: 'finished',
        finishData: action.data,
      }
    case 'ERROR':
      return { ...state, status: 'error', error: action.message }
    case 'TICK':
      return { ...state, elapsedSec: state.elapsedSec + 1 }
    case 'TIME_UP':
      return { ...state, timeUp: true }
    default:
      return state
  }
}

interface UseQuizSessionReturn extends SessionState {
  sendAnswer: (answerData: { option_id?: number; option_ids?: number[]; text?: string }) => void
  sendNext: () => void
  disconnect: () => void
}

export function useQuizSession(quizId: number): UseQuizSessionReturn {
  const [state, dispatch] = useReducer(sessionReducer, initialState)
  const wsRef = useRef<WebSocket | null>(null)
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  })

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
  }, [])

  useEffect(() => {
    let wsStatus: SessionStatus = 'idle'

    const configuredWsRoot = process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, '')
    const fallbackApiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
    const fallbackWsRoot = `${fallbackApiUrl.replace(/^http/, 'ws')}/ws`
    const wsRoot = configuredWsRoot || fallbackWsRoot
    const wsUrl = `${wsRoot}/quiz/${quizId}/`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    dispatch({ type: 'CONNECTING' })
    wsStatus = 'connecting'

    ws.onopen = () => {
      dispatch({ type: 'AUTHENTICATING' })
      wsStatus = 'authenticating'
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
      ws.send(JSON.stringify({ type: 'auth', token: token ?? '' }))
    }

    ws.onmessage = (event: MessageEvent) => {
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(String(event.data)) as Record<string, unknown>
      } catch {
        return
      }

      const msgType = msg.type as string | undefined

      switch (msgType) {
        case 'auth_ok':
          wsStatus = 'active'
          dispatch({ type: 'AUTH_OK' })
          ws.send(JSON.stringify({ action: 'start' }))
          break

        case 'question':
          wsStatus = 'active'
          dispatch({
            type: 'QUESTION',
            question: msg.question as SessionQuestion,
            progress: msg.progress as SessionProgress,
          })
          break

        case 'answer_result':
          // When the user disabled per-question feedback, skip the result card
          // and advance immediately; the score is still recorded server-side and
          // shown in the final summary.
          if (stateRef.current.immediateFeedback === false) {
            ws.send(JSON.stringify({ action: 'next' }))
          } else {
            dispatch({
              type: 'ANSWER_RESULT',
              result: msg as unknown as WsAnswerResultEvent,
            })
          }
          break

        case 'finish':
          wsStatus = 'finished'
          dispatch({
            type: 'FINISH',
            data: msg as unknown as WsFinishEvent,
          })
          break

        case 'error':
          wsStatus = 'error'
          dispatch({ type: 'ERROR', message: (msg.message as string) ?? 'sessionError' })
          break

        default:
          break
      }
    }

    ws.onerror = () => {
      wsStatus = 'error'
      dispatch({ type: 'ERROR', message: 'connectionFailed' })
    }

    ws.onclose = (event: CloseEvent) => {
      if (wsStatus === 'finished' || wsStatus === 'error') {
        return
      }

      wsStatus = 'error'

      if (event.code === 4001 || event.code === 4008) {
        dispatch({ type: 'ERROR', message: 'authFailed' })
        return
      }

      if (event.code === 4002 || event.code === 4003 || event.code === 4004 || event.code === 4011) {
        dispatch({ type: 'ERROR', message: 'sessionError' })
        return
      }

      dispatch({ type: 'ERROR', message: 'connectionFailed' })
    }

    return () => {
      ws.onopen = null
      ws.onmessage = null
      ws.onerror = null
      ws.onclose = null
      ws.close()
      wsRef.current = null
    }
  }, [quizId])

  useEffect(() => {
    if (state.status !== 'active') return
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000)
    return () => clearInterval(id)
  }, [state.status])

  // Client-side time-limit enforcement: once the elapsed time reaches the
  // whole-quiz limit, auto-submit a `next` so the server finalises the attempt
  // (the server independently rejects late answers, so this is purely for UX —
  // the user is not left able to keep answering past the limit).
  useEffect(() => {
    if (
      state.status === 'active' &&
      state.timeLimitSec > 0 &&
      state.elapsedSec >= state.timeLimitSec &&
      !state.timeUp
    ) {
      dispatch({ type: 'TIME_UP' })
      send({ action: 'next' })
    }
  }, [state.status, state.timeLimitSec, state.elapsedSec, state.timeUp, send])

  const sendAnswer = useCallback(
    (answerData: { option_id?: number; option_ids?: number[]; text?: string }) => {
      if (stateRef.current.questionPhase !== 'questioning') return
      const questionId = stateRef.current.currentQuestion?.id
      if (questionId == null) return
      send({ action: 'answer', question_id: questionId, answer_data: answerData })
    },
    [send]
  )

  const sendNext = useCallback(() => {
    if (stateRef.current.questionPhase !== 'answered') return
    send({ action: 'next' })
  }, [send])

  return {
    ...state,
    sendAnswer,
    sendNext,
    disconnect,
  }
}
