'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateMyAccount } from '@/services/users.service'
import type { MeAccountUpdatePayload, User, UserProfile } from '@/types/user.types'

type AccountFormProps = {
  profile: UserProfile
  onAccountUpdated?: (user: User) => void
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const resp = (error as { response?: { data?: unknown } }).response
    if (resp?.data && typeof resp.data === 'object') {
      const data = resp.data as Record<string, unknown>
      if (typeof data.username === 'string') return data.username
      if (Array.isArray(data.username)) return String(data.username[0])
      if (typeof data.email === 'string') return data.email
      if (Array.isArray(data.email)) return String(data.email[0])
    }
  }
  return fallback
}

export function AccountForm({ profile, onAccountUpdated }: AccountFormProps) {
  const t = useTranslations('profile')

  const [username, setUsername] = useState(profile.username)
  const [email, setEmail] = useState('')

  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const normalizedUsername = username.trim()
  const normalizedEmail = email.trim()
  const hasChanges =
    (normalizedUsername.length > 0 && normalizedUsername !== profile.username) ||
    normalizedEmail.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccessMsg('')
    setErrorMsg('')

    const payload: MeAccountUpdatePayload = {}
    if (normalizedUsername.length > 0 && normalizedUsername !== profile.username) {
      payload.username = normalizedUsername
    }
    if (normalizedEmail.length > 0) {
      payload.email = normalizedEmail
    }

    if (Object.keys(payload).length === 0) {
      setSaving(false)
      return
    }

    try {
      const updatedUser = await updateMyAccount(payload)
      setSuccessMsg(t('saveSuccess'))
      onAccountUpdated?.(updatedUser)
    } catch (error) {
      setErrorMsg(extractErrorMessage(error, t('errors.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="username">{t('username')}</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="tên đăng nhập"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t('email')}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email mới (để trống nếu không đổi)"
          />
        </div>
      </div>
      {successMsg && <p className="text-sm text-green-600">{successMsg}</p>}
      {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
      <Button type="submit" disabled={saving || !hasChanges}>
        {saving ? t('saving') : t('saveAccount')}
      </Button>
    </form>
  )
}
