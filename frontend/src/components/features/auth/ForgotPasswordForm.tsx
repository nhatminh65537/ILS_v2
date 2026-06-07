'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { mapAuthErrorToMessageKey } from '@/lib/auth-error-map'
import { requestPasswordReset } from '@/services/auth.service'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type ForgotPasswordFormProps = {
  locale: string
}

export function ForgotPasswordForm({ locale }: ForgotPasswordFormProps) {
  const t = useTranslations('auth')
  const tRoot = useTranslations()

  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [errorMessageKey, setErrorMessageKey] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessageKey(null)

    if (!EMAIL_PATTERN.test(email.trim())) {
      setErrorMessageKey('auth.validation.emailInvalid')
      return
    }

    setSubmitting(true)
    try {
      await requestPasswordReset({ email: email.trim() })
      // Neutral, anti-enumeration confirmation regardless of whether the email exists.
      setSent(true)
    } catch (error) {
      setErrorMessageKey(mapAuthErrorToMessageKey(error, 'auth.errors.resetRequestFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 rounded-none bg-card p-5 ring-1 ring-foreground/10">
        <p className="text-sm text-green-600">{t('forgotPasswordSent')}</p>
        <Link className="text-sm text-foreground underline" href={`/${locale}/login`}>
          {t('backToLogin')}
        </Link>
      </div>
    )
  }

  return (
    <form className="space-y-4 rounded-none bg-card p-5 ring-1 ring-foreground/10" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="email">{t('email')}</Label>
        <Input
          id="email"
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t('emailPlaceholder')}
          type="email"
          value={email}
        />
      </div>

      {errorMessageKey ? <p className="text-xs text-destructive">{tRoot(errorMessageKey)}</p> : null}

      <Button className="w-full" disabled={submitting} type="submit">
        {submitting ? t('loading') : t('forgotPasswordSubmit')}
      </Button>
      <Link className="block text-sm text-foreground underline" href={`/${locale}/login`}>
        {t('backToLogin')}
      </Link>
    </form>
  )
}
