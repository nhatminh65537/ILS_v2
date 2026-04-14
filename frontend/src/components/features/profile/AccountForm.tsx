'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { logoutAll } from '@/services/auth.service'
import { updateMyAccount } from '@/services/users.service'
import { useAuthStore } from '@/stores/auth.store'
import type { MeAccountUpdatePayload, User, UserProfile } from '@/types/user.types'

type AccountFormProps = {
  locale: string
  profile: UserProfile
  onAccountUpdated?: (user: User) => void
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const objectError = error as Record<string, unknown>
    if (typeof objectError.username === 'string') return objectError.username
    if (Array.isArray(objectError.username) && objectError.username.length > 0) return String(objectError.username[0])
    if (typeof objectError.email === 'string') return objectError.email
    if (Array.isArray(objectError.email) && objectError.email.length > 0) return String(objectError.email[0])
    if (typeof objectError.detail === 'string') return objectError.detail
  }

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

export function AccountForm({ locale, profile, onAccountUpdated }: AccountFormProps) {
  const t = useTranslations('profile')
  const router = useRouter()
  const clearAuth = useAuthStore((state) => state.clearAuth)

  const [username, setUsername] = useState(profile.username)
  const [email, setEmail] = useState('')
  const [confirmUsernameChangeOpen, setConfirmUsernameChangeOpen] = useState(false)
  const [pendingPayload, setPendingPayload] = useState<MeAccountUpdatePayload | null>(null)

  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const normalizedUsername = username.trim()
  const normalizedEmail = email.trim()
  const hasChanges =
    (normalizedUsername.length > 0 && normalizedUsername !== profile.username) ||
    normalizedEmail.length > 0

  const buildPayload = (): MeAccountUpdatePayload => {
    const payload: MeAccountUpdatePayload = {}
    if (normalizedUsername.length > 0 && normalizedUsername !== profile.username) {
      payload.username = normalizedUsername
    }
    if (normalizedEmail.length > 0) {
      payload.email = normalizedEmail
    }
    return payload
  }

  const submitPayload = async (payload: MeAccountUpdatePayload) => {
    setSaving(true)
    setSuccessMsg('')
    setErrorMsg('')

    const hasUsernameChange = Boolean(payload.username)

    try {
      const updatedUser = await updateMyAccount(payload)

      if (hasUsernameChange) {
        try {
          await logoutAll()
        } catch {
          // Continue with local logout flow even if server-side revoke-all fails.
        }
        clearAuth()
        router.replace(`/${locale}/login`)
        router.refresh()
        return
      }

      setSuccessMsg(t('saveSuccess'))
      onAccountUpdated?.(updatedUser)
      setEmail('')
    } catch (error) {
      setErrorMsg(extractErrorMessage(error, t('errors.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = buildPayload()

    if (Object.keys(payload).length === 0) {
      return
    }

    if (payload.username) {
      setPendingPayload(payload)
      setConfirmUsernameChangeOpen(true)
      return
    }

    await submitPayload(payload)
  }

  const handleConfirmUsernameChange = async () => {
    if (!pendingPayload) {
      return
    }
    setConfirmUsernameChangeOpen(false)
    await submitPayload(pendingPayload)
    setPendingPayload(null)
  }

  return (
    <>
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

      <Dialog open={confirmUsernameChangeOpen} onOpenChange={setConfirmUsernameChangeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('accountConfirm.title')}</DialogTitle>
            <DialogDescription>{t('accountConfirm.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmUsernameChangeOpen(false)}>
              {t('accountConfirm.cancel')}
            </Button>
            <Button variant="destructive" onClick={() => void handleConfirmUsernameChange()}>
              {t('accountConfirm.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
