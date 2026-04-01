'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'

type AdminLoginFormProps = {
  locale: string
}

export function AdminLoginForm({ locale }: AdminLoginFormProps) {
  const t = useTranslations('adminAuth')
  const tRoot = useTranslations()
  const router = useRouter()
  const { login, isLoading } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessageKey, setErrorMessageKey] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!username.trim()) {
      setErrorMessageKey('auth.validation.usernameRequired')
      return
    }

    if (!password) {
      setErrorMessageKey('auth.validation.passwordRequired')
      return
    }

    setErrorMessageKey(null)

    const result = await login({ username: username.trim(), password })

    if (!result.success) {
      setErrorMessageKey(result.messageKey ?? 'auth.errors.loginFailed')
      return
    }

    router.push(`/${locale}/admin/rbac`)
  }

  return (
    <form className="space-y-4 rounded-lg border border-border bg-card p-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="admin-username">{t('usernameLabel')}</Label>
        <Input
          id="admin-username"
          onChange={(event) => setUsername(event.target.value)}
          placeholder={t('usernamePlaceholder')}
          type="text"
          value={username}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-password">{t('passwordLabel')}</Label>
        <Input
          id="admin-password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t('passwordPlaceholder')}
          type="password"
          value={password}
        />
      </div>

      {errorMessageKey ? <p className="text-xs text-destructive">{tRoot(errorMessageKey)}</p> : null}

      <Button className="w-full" disabled={isLoading} type="submit">
        {isLoading ? t('loading') : t('loginButton')}
      </Button>
    </form>
  )
}
