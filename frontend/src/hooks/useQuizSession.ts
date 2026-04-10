'use client'

import { useCallback, useEffect, useReducer, useRef } from 'react'
import type {
  SessionQuestion,
  SessionProgress,
  WsAnswerResultEvent,
  WsFinishEvent,
} from '@/types/quiz.types'

// ─── Session state machine ─────────────────────────────────────────────────

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

const initialState: SessionState = {
  status: 'idle',
  questionPhase: 'questioning',
  currentQuestion: null,
  progress: null,
  answerResult: null,
  finishData: null,
  elapsedSec: 0,
  error: null,
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
    default:
      return state
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────

interface UseQuizSessionReturn extends SessionState {
  sendAnswer: (answerData: { option_id?: number; option_ids?: number[]; text?: string }) => void
  sendNext: () => void
  disconnect: () => void
}

export function useQuizSession(quizId: number): UseQuizSessionReturn {
  const [state, dispatch] = useReducer(sessionReducer, initialState)
  const wsRef = useRef<WebSocket | null>(null)
  const stateRef = useRef(state)

  // Keep stateRef in sync outside render (avoids stale closures in callbacks)
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

  // WebSocket lifecycle
  useEffect(() => {
    // Local status mirror — updated synchronously so onclose always sees the real phase
    // (avoids the post-render delay of stateRef.current when dispatching from event handlers)
    let wsStatus: SessionStatus = 'idle'

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
    const wsBase = apiUrl.replace(/^http/, 'ws')
    const wsUrl = `${wsBase}/ws/quiz/${quizId}/`

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
          // Auto-send start action
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
          dispatch({
            type: 'ANSWER_RESULT',
            result: msg as unknown as WsAnswerResultEvent,
          })
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
          dispatch({ type: 'ERROR', message: (msg.message as string) ?? 'Session error' })
          break

        default:
          break
      }
    }

    ws.onerror = () => {
      wsStatus = 'error'
      dispatch({ type: 'ERROR', message: 'connectionFailed' })
    }

    ws.onclose = () => {
      // Already in terminal state — nothing to do
      if (wsStatus === 'finished' || wsStatus === 'error') return
      // Any close during connecting/auth = server rejected or network failed
      // (backend closes cleanly with 4001 on bad token — wasClean=true — would
      //  have been silently swallowed before; now we always surface it as error)
      wsStatus = 'error'
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

  // Elapsed timer — runs while session is active
  useEffect(() => {
    if (state.status !== 'active') return
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000)
    return () => clearInterval(id)
  }, [state.status])

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
