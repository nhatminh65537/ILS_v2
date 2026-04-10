/**
 * MSW v2 WebSocket mock for quiz sessions.
 * Simulates the full quiz WS protocol: auth → start → question → answer → next → finish.
 */

import { ws } from 'msw'
import { quizQuestionsFixture, quizzesFixture } from '@/mocks/data/fixtures'
import { QuestionType } from '@/types/quiz.types'

// Derive WS base from the same env var the hook uses, so the pattern always matches
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const wsBase = apiUrl.replace(/^http/, 'ws')
const quizSocket = ws.link(`${wsBase}/ws/quiz/:quizId/`)

/** Build a WS-compatible question payload (no is_correct in options) */
function buildSessionQuestion(q: (typeof quizQuestionsFixture)[number], position: number, total: number) {
  return {
    question: {
      id: q.id,
      type: q.question_type,
      content: q.content,
      time_limit_sec: undefined,
      options: q.options?.map((o) => ({ id: o.id, content: o.content, position: o.position })),
    },
    progress: { current: position, total },
  }
}

function isCorrect(q: (typeof quizQuestionsFixture)[number], answerData: Record<string, unknown>): boolean {
  if (q.question_type === QuestionType.SingleChoice) {
    const optionId = answerData.option_id as number | undefined
    return q.options?.find((o) => o.id === optionId)?.is_correct ?? false
  }
  if (q.question_type === QuestionType.MultiChoice) {
    const submitted = new Set((answerData.option_ids as number[] | undefined) ?? [])
    const correct = new Set(q.options?.filter((o) => o.is_correct).map((o) => o.id) ?? [])
    return submitted.size === correct.size && [...correct].every((id) => submitted.has(id))
  }
  if (q.question_type === QuestionType.FillBlank) {
    // Accept any non-empty answer as correct for mock purposes
    const text = (answerData.text as string | undefined)?.trim().toLowerCase() ?? ''
    return text.length > 0
  }
  return false
}

export const quizWsHandler = quizSocket.addEventListener('connection', ({ client, params }) => {
  const quizId = Number(params.quizId)
  const quizQuestions = quizQuestionsFixture.filter((q) => q.quiz_id === quizId)
  const quiz = quizzesFixture.find((q) => q.id === quizId)

  // Use quiz questions or fall back to first 2 questions from any quiz
  const sessionQuestions = quizQuestions.length > 0 ? quizQuestions : quizQuestionsFixture.slice(0, 2)

  let questionIndex = 0
  let totalScore = 0
  const maxScore = sessionQuestions.reduce((sum, q) => sum + q.score, 0)
  const attemptId = Math.floor(Math.random() * 10000) + 1
  const startTime = Date.now()
  let authenticated = false

  client.addEventListener('message', (event) => {
    let msg: Record<string, unknown>
    try {
      msg = JSON.parse(event.data as string) as Record<string, unknown>
    } catch {
      return
    }

    const msgType = msg.type as string | undefined
    const action = msg.action as string | undefined

    // Auth flow
    if (msgType === 'auth') {
      authenticated = true
      client.send(
        JSON.stringify({ type: 'auth_ok', user_id: 1, username: 'dev_user' })
      )
      return
    }

    if (!authenticated) {
      client.send(JSON.stringify({ type: 'error', code: 'not_authenticated', message: 'Not authenticated' }))
      return
    }

    // Start → send first question
    if (action === 'start') {
      questionIndex = 0
      const q = sessionQuestions[questionIndex]
      if (!q) {
        // No questions — finish immediately
        client.send(
          JSON.stringify({
            type: 'finish',
            attempt_id: attemptId,
            total_score: 0,
            max_score: 0,
            duration_sec: 0,
          })
        )
        return
      }
      const payload = buildSessionQuestion(q, 1, sessionQuestions.length)
      client.send(JSON.stringify({ type: 'question', attempt_id: attemptId, ...payload }))
      return
    }

    // Answer
    if (action === 'answer') {
      const q = sessionQuestions[questionIndex]
      if (!q) return

      const answerData = (msg.answer_data ?? {}) as Record<string, unknown>
      const correct = isCorrect(q, answerData)
      const scoreObtained = correct ? q.score : 0
      totalScore += scoreObtained

      client.send(
        JSON.stringify({
          type: 'answer_result',
          is_correct: correct,
          score_obtained: scoreObtained,
          explanation: q.explanation ?? null,
          correct_answer:
            q.question_type === QuestionType.SingleChoice
              ? { option_id: q.options?.find((o) => o.is_correct)?.id }
              : q.question_type === QuestionType.MultiChoice
                ? { option_ids: q.options?.filter((o) => o.is_correct).map((o) => o.id) }
                : { text: 'hash' },
        })
      )
      return
    }

    // Next question or finish
    if (action === 'next') {
      questionIndex += 1

      if (questionIndex >= sessionQuestions.length) {
        const durationSec = Math.floor((Date.now() - startTime) / 1000)
        client.send(
          JSON.stringify({
            type: 'finish',
            attempt_id: attemptId,
            total_score: totalScore,
            max_score: maxScore,
            duration_sec: durationSec,
          })
        )
        return
      }

      const q = sessionQuestions[questionIndex]
      const payload = buildSessionQuestion(q, questionIndex + 1, sessionQuestions.length)
      client.send(JSON.stringify({ type: 'question', attempt_id: attemptId, ...payload }))
      return
    }
  })

  // Suppress unused variable warning
  void quiz
})

export const quizWsHandlers = [quizWsHandler]
