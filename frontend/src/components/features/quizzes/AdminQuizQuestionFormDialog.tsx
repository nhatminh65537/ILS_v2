'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  QuestionType,
  type AdminQuizQuestionMutationPayload,
  type QuizQuestion,
} from '@/types/quiz.types'

type AdminQuizQuestionFormDialogProps = {
  open: boolean
  mode: 'create' | 'edit'
  initialQuestion?: QuizQuestion | null
  defaultPosition: number
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: AdminQuizQuestionMutationPayload) => Promise<boolean>
}

type OptionInput = {
  content: string
  is_correct: boolean
}

type AnswerInput = {
  answer: string
}

const EMPTY_OPTION: OptionInput = { content: '', is_correct: false }
const EMPTY_ANSWER: AnswerInput = { answer: '' }

type DialogFormState = {
  questionType: QuestionType
  contentText: string
  explanation: string
  caseSensitive: boolean
  score: number
  position: number
  options: OptionInput[]
  answers: AnswerInput[]
}

const buildInitialState = (
  initialQuestion: QuizQuestion | null | undefined,
  defaultPosition: number
): DialogFormState => {
  if (!initialQuestion) {
    return {
      questionType: QuestionType.SingleChoice,
      contentText: '',
      explanation: '',
      caseSensitive: false,
      score: 1,
      position: defaultPosition,
      options: [{ ...EMPTY_OPTION }, { ...EMPTY_OPTION }],
      answers: [{ ...EMPTY_ANSWER }],
    }
  }

  return {
    questionType: initialQuestion.question_type,
    contentText: String(initialQuestion.content?.text ?? ''),
    explanation: initialQuestion.explanation ?? '',
    caseSensitive: initialQuestion.case_sensitive,
    score: initialQuestion.score,
    position: initialQuestion.position,
    options:
      initialQuestion.options && initialQuestion.options.length > 0
        ? initialQuestion.options.map((option) => ({
            content: option.content,
            is_correct: Boolean(option.is_correct),
          }))
        : [{ ...EMPTY_OPTION }, { ...EMPTY_OPTION }],
    answers:
      initialQuestion.answers && initialQuestion.answers.length > 0
        ? initialQuestion.answers.map((answer) => ({ answer: answer.answer }))
        : [{ ...EMPTY_ANSWER }],
  }
}

export function AdminQuizQuestionFormDialog({
  open,
  mode,
  initialQuestion,
  defaultPosition,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: AdminQuizQuestionFormDialogProps) {
  const t = useTranslations('adminQuizzes')

  const initialState = buildInitialState(initialQuestion, defaultPosition)
  const [questionType, setQuestionType] = useState<QuestionType>(initialState.questionType)
  const [contentText, setContentText] = useState(initialState.contentText)
  const [explanation, setExplanation] = useState(initialState.explanation)
  const [caseSensitive, setCaseSensitive] = useState(initialState.caseSensitive)
  const [score, setScore] = useState(initialState.score)
  const [position, setPosition] = useState(initialState.position)
  const [options, setOptions] = useState<OptionInput[]>(initialState.options)
  const [answers, setAnswers] = useState<AnswerInput[]>(initialState.answers)
  const [formErrorKey, setFormErrorKey] = useState<string | null>(null)

  const title = mode === 'create' ? t('questions.createTitle') : t('questions.editTitle')
  const description = mode === 'create' ? t('questions.createDescription') : t('questions.editDescription')

  const choiceCorrectCount = useMemo(
    () => options.reduce((count, option) => count + (option.is_correct ? 1 : 0), 0),
    [options]
  )

  const validate = (): string | null => {
    if (contentText.trim().length === 0) {
      return 'errors.validation'
    }

    if (score <= 0) {
      return 'errors.validation'
    }

    if (questionType === QuestionType.SingleChoice) {
      if (options.length < 2) {
        return 'questions.errors.needTwoOptions'
      }
      if (choiceCorrectCount !== 1) {
        return 'questions.errors.singleChoiceOneCorrect'
      }
      if (options.some((option) => option.content.trim().length === 0)) {
        return 'questions.errors.optionEmpty'
      }
    }

    if (questionType === QuestionType.MultiChoice) {
      if (options.length < 2) {
        return 'questions.errors.needTwoOptions'
      }
      if (choiceCorrectCount < 1) {
        return 'questions.errors.multiChoiceNeedOneCorrect'
      }
      if (options.some((option) => option.content.trim().length === 0)) {
        return 'questions.errors.optionEmpty'
      }
    }

    if (questionType === QuestionType.FillBlank) {
      const validAnswers = answers.filter((answer) => answer.answer.trim().length > 0)
      if (validAnswers.length < 1) {
        return 'questions.errors.needOneAnswer'
      }
    }

    return null
  }

  const buildPayload = (): AdminQuizQuestionMutationPayload => {
    const base = {
      question_type: questionType,
      content: {
        text: contentText.trim(),
      },
      explanation: explanation.trim(),
      case_sensitive: caseSensitive,
      score,
      position,
    }

    if (questionType === QuestionType.FillBlank) {
      return {
        ...base,
        answers: answers
          .map((item) => item.answer.trim())
          .filter((value) => value.length > 0)
          .map((answer) => ({ answer })),
      }
    }

    return {
      ...base,
      options: options.map((option, index) => ({
        content: option.content.trim(),
        position: index + 1,
        is_correct: option.is_correct,
      })),
    }
  }

  const handleToggleOptionCorrect = (index: number, checked: boolean) => {
    setOptions((previous) => {
      const next = [...previous]

      if (questionType === QuestionType.SingleChoice && checked) {
        for (let i = 0; i < next.length; i += 1) {
          next[i] = {
            ...next[i],
            is_correct: i === index,
          }
        }
        return next
      }

      next[index] = {
        ...next[index],
        is_correct: checked,
      }
      return next
    })
  }

  const handleSubmit = async () => {
    const validationError = validate()
    if (validationError) {
      setFormErrorKey(validationError)
      return
    }

    setFormErrorKey(null)
    const ok = await onSubmit(buildPayload())
    if (ok) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {formErrorKey ? <p className="text-sm text-destructive">{t(formErrorKey as Parameters<typeof t>[0])}</p> : null}

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <Label>{t('questions.form.typeLabel')}</Label>
              <Select
                value={questionType}
                onValueChange={(value) => setQuestionType(value as QuestionType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('questions.form.typeLabel')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={QuestionType.SingleChoice}>{t('questions.type.single_choice')}</SelectItem>
                  <SelectItem value={QuestionType.MultiChoice}>{t('questions.type.multi_choice')}</SelectItem>
                  <SelectItem value={QuestionType.FillBlank}>{t('questions.type.fill_blank')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="admin-question-score">{t('questions.form.scoreLabel')}</Label>
              <Input
                id="admin-question-score"
                min={1}
                step={1}
                type="number"
                value={String(score)}
                onChange={(event) => setScore(Math.max(1, Number(event.target.value || 1)))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="admin-question-position">{t('questions.form.positionLabel')}</Label>
              <Input
                id="admin-question-position"
                min={1}
                step={1}
                type="number"
                value={String(position)}
                onChange={(event) => setPosition(Math.max(1, Number(event.target.value || 1)))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="admin-question-text">{t('questions.form.contentLabel')}</Label>
            <Input
              id="admin-question-text"
              placeholder={t('questions.form.contentPlaceholder')}
              value={contentText}
              onChange={(event) => setContentText(event.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="admin-question-explanation">{t('questions.form.explanationLabel')}</Label>
            <textarea
              id="admin-question-explanation"
              className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              placeholder={t('questions.form.explanationPlaceholder')}
              value={explanation}
              onChange={(event) => setExplanation(event.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={caseSensitive}
              onCheckedChange={(checked) => setCaseSensitive(Boolean(checked))}
            />
            {t('questions.form.caseSensitiveLabel')}
          </label>

          {questionType === QuestionType.SingleChoice || questionType === QuestionType.MultiChoice ? (
            <div className="space-y-3 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{t('questions.form.optionsLabel')}</p>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => setOptions((prev) => [...prev, { ...EMPTY_OPTION }])}
                >
                  {t('questions.actions.addOption')}
                </Button>
              </div>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={`option-${index}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                    <Input
                      placeholder={t('questions.form.optionPlaceholder', { index: index + 1 })}
                      value={option.content}
                      onChange={(event) =>
                        setOptions((prev) => {
                          const next = [...prev]
                          next[index] = {
                            ...next[index],
                            content: event.target.value,
                          }
                          return next
                        })
                      }
                    />
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Checkbox
                        checked={option.is_correct}
                        onCheckedChange={(checked) => handleToggleOptionCorrect(index, Boolean(checked))}
                      />
                      {t('questions.form.correctLabel')}
                    </label>
                    <Button
                      disabled={options.length <= 2}
                      size="sm"
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setOptions((prev) => prev.filter((_, optionIndex) => optionIndex !== index))
                      }
                    >
                      {t('actions.delete')}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {questionType === QuestionType.FillBlank ? (
            <div className="space-y-3 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{t('questions.form.answersLabel')}</p>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => setAnswers((prev) => [...prev, { ...EMPTY_ANSWER }])}
                >
                  {t('questions.actions.addAnswer')}
                </Button>
              </div>
              <div className="space-y-2">
                {answers.map((answer, index) => (
                  <div key={`answer-${index}`} className="grid grid-cols-[1fr_auto] items-center gap-2">
                    <Input
                      placeholder={t('questions.form.answerPlaceholder', { index: index + 1 })}
                      value={answer.answer}
                      onChange={(event) =>
                        setAnswers((prev) => {
                          const next = [...prev]
                          next[index] = {
                            answer: event.target.value,
                          }
                          return next
                        })
                      }
                    />
                    <Button
                      disabled={answers.length <= 1}
                      size="sm"
                      type="button"
                      variant="ghost"
                      onClick={() => setAnswers((prev) => prev.filter((_, answerIndex) => answerIndex !== index))}
                    >
                      {t('actions.delete')}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? t('status.saving') : t('actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
