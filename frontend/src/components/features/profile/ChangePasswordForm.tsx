'use client'

import { FormEvent, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { mapAuthErrorToMessageKey } from '@/lib/auth-error-map'
import { changePassword } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'

type ChangePasswordFormProps = {
  locale: string
}

export function ChangePasswordForm({ locale }: ChangePasswordFormProps) {
  const t = useTranslations('profile')
  const tRoot = useTranslations()
  const clearAuth = useAuthStore((state) => state.clearAuth)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [saving, setSaving] = useState(false)
  const [errorMessageKey, setErrorMessageKey] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessageKey(null)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessageKey('auth.validation.passwordRequired')
      return
    }
    if (newPassword.length < 8) {
      setErrorMessageKey('profile.errors.passwordTooShort')
      return
    }
    if (newPassword !== confirmPassword) {
      setErrorMessageKey('profile.errors.passwordMismatch')
      return
    }
    if (newPassword === currentPassword) {
      setErrorMessageKey('profile.errors.sameAsCurrent')
      return
    }

    setSaving(true)
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword })
      // Backend revokes ALL sessions, so the current token is now invalid.
      // Clear local auth and hard-navigate to dodge the GuestOnlyGate race.
      clearAuth()
      window.location.assign(`/${locale}/login`)
    } catch (error) {
      setErrorMessageKey(mapAuthErrorToMessageKey(error, 'profile.errors.changePasswordFailed'))
      setSaving(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
        <Input
          id="currentPassword"
          autoComplete="current-password"
          onChange={(event) => setCurrentPassword(event.target.value)}
          type="password"
          value={currentPassword}
        />
      </div>
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
        <Label htmlFor="confirmNewPassword">{t('confirmNewPassword')}</Label>
        <Input
          id="confirmNewPassword"
          autoComplete="new-password"
          onChange={(event) => setConfirmPassword(event.target.value)}
          type="password"
          value={confirmPassword}
        />
      </div>

      {errorMessageKey ? <p className="text-sm text-destructive">{tRoot(errorMessageKey)}</p> : null}

      <Button disabled={saving} type="submit">
        {saving ? t('saving') : t('changePassword')}
      </Button>
    </form>
  )
}
