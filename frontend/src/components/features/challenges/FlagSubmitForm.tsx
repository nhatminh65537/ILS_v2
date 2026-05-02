'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { FlagSubmissionResponse } from '@/types/challenge.types'

const THROTTLE_MS = 2000

type FlagSubmitFormProps = {
  isSubmitting: boolean
  submitResult: FlagSubmissionResponse | null
  onSubmit: (flag: string) => void
}

export function FlagSubmitForm({ isSubmitting, submitResult, onSubmit }: FlagSubmitFormProps) {
  const t = useTranslations('challenges')
  const [flagInput, setFlagInput] = useState('')
  const [throttled, setThrottled] = useState(false)

  useEffect(() => {
    if (submitResult !== null) {
      setThrottled(true)
      const timer = setTimeout(() => setThrottled(false), THROTTLE_MS)
      return () => clearTimeout(timer)
    }
  }, [submitResult])

  useEffect(() => {
    if (submitResult?.correct) {
      setFlagInput('')
    }
  }, [submitResult])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = flagInput.trim()
    if (!trimmed || isSubmitting || throttled) return
    onSubmit(trimmed)
  }

  const disabled = isSubmitting || throttled

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{t('detail.submitTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={handleSubmit} className="space-y-2">
          <Label htmlFor="flag-input" className="text-xs text-muted-foreground">
            {t('detail.flagLabel')}
          </Label>
          <div className="flex gap-2">
            <Input
              id="flag-input"
              value={flagInput}
              onChange={(e) => setFlagInput(e.target.value)}
              placeholder={t('detail.flagPlaceholder')}
              disabled={disabled || submitResult?.correct === true}
              className="h-8 font-mono text-sm"
            />
            <Button
              type="submit"
              size="sm"
              disabled={disabled || !flagInput.trim() || submitResult?.correct === true}
            >
              {isSubmitting ? t('detail.submitting') : t('detail.submit')}
            </Button>
          </div>
        </form>

        {submitResult !== null ? (
          submitResult.correct ? (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">{t('detail.correct')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">{t('detail.incorrect')}</span>
            </div>
          )
        ) : null}
      </CardContent>
    </Card>
  )
}
