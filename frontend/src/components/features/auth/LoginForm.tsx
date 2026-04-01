'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { startSsoRedirect } from '@/services/auth.service'

type LoginFormProps = {
  locale: string
}

export function LoginForm({ locale }: LoginFormProps) {
  const t = useTranslations('auth')
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

    router.push(`/${locale}/dashboard`)
  }

  const handleSsoLogin = () => {
    if (isLoading) {
      return
    }

    startSsoRedirect()
  }

  return (
    <form className="space-y-4 rounded-none bg-card p-5 ring-1 ring-foreground/10" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="username">{t('username')}</Label>
        <Input
          id="username"
          onChange={(event) => setUsername(event.target.value)}
          placeholder={t('usernamePlaceholder')}
          type="text"
          value={username}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t('password')}</Label>
        <Input
          id="password"
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
      <Button className="w-full" disabled={isLoading} onClick={handleSsoLogin} type="button" variant="outline">
        {t('ssoButton')}
      </Button>
    </form>
  )
}
