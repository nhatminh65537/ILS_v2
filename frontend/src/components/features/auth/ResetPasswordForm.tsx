'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { mapAuthErrorToMessageKey } from '@/lib/auth-error-map'
import { confirmPasswordReset } from '@/services/auth.service'

type ResetPasswordFormProps = {
  locale: string
}

export function ResetPasswordForm({ locale }: ResetPasswordFormProps) {
  const t = useTranslations('auth')
  const tRoot = useTranslations()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [errorMessageKey, setErrorMessageKey] = useState<string | null>(null)

  if (!token) {
    return (
      <div className="space-y-4 rounded-none bg-card p-5 ring-1 ring-foreground/10">
        <p className="text-sm text-destructive">{tRoot('auth.errors.resetTokenInvalid')}</p>
        <Link className="text-sm text-foreground underline" href={`/${locale}/forgot-password`}>
          {t('forgotPasswordLink')}
        </Link>
      </div>
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessageKey(null)

    if (newPassword.length < 8) {
      setErrorMessageKey('auth.validation.passwordMinLength')
      return
    }
    if (newPassword !== confirmPassword) {
      setErrorMessageKey('auth.validation.passwordMismatch')
      return
    }

    setSubmitting(true)
    try {
      await confirmPasswordReset({ token, new_password: newPassword })
      setDone(true)
      router.push(`/${locale}/login`)
    } catch (error) {
      setErrorMessageKey(mapAuthErrorToMessageKey(error, 'auth.errors.resetConfirmFailed'))
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="space-y-4 rounded-none bg-card p-5 ring-1 ring-foreground/10">
        <p className="text-sm text-green-600">{t('resetPasswordSuccess')}</p>
      </div>
    )
  }

  return (
    <form className="space-y-4 rounded-none bg-card p-5 ring-1 ring-foreground/10" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="newPassword">{t('newPassword')}</Label>
        <Input
          id="newPassword"
          autoComplete="new-password"
          onChange={(event) => setNewPassword(event.target.value)}
          type="password"
          value={newPassword}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
        <Input
          id="confirmPassword"
          autoComplete="new-password"
          onChange={(event) => setConfirmPassword(event.target.value)}
          type="password"
          value={confirmPassword}
        />
      </div>

      {errorMessageKey ? <p className="text-xs text-destructive">{tRoot(errorMessageKey)}</p> : null}

      <Button className="w-full" disabled={submitting} type="submit">
        {submitting ? t('loading') : t('resetPasswordSubmit')}
      </Button>
    </form>
  )
}
