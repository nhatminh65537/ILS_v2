'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'

type RegisterFormProps = {
  locale: string
}

const isValidEmail = (value: string): boolean => {
  if (!value) {
    return true
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function RegisterForm({ locale }: RegisterFormProps) {
  const t = useTranslations('auth')
  const tRoot = useTranslations()
  const router = useRouter()
  const { register, isLoading } = useAuth()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessageKey, setErrorMessageKey] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!username.trim()) {
      setErrorMessageKey('auth.validation.usernameRequired')
      return
    }

    if (!isValidEmail(email.trim())) {
      setErrorMessageKey('auth.validation.emailInvalid')
      return
    }

    if (!password) {
      setErrorMessageKey('auth.validation.passwordRequired')
      return
    }

    if (password.length < 8) {
      setErrorMessageKey('auth.validation.passwordMinLength')
      return
    }

    if (!confirmPassword) {
      setErrorMessageKey('auth.validation.confirmPasswordRequired')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessageKey('auth.validation.passwordMismatch')
      return
    }

    setErrorMessageKey(null)

    const result = await register({
      username: username.trim(),
      email: email.trim() || undefined,
      password,
    })

    if (!result.success) {
      setErrorMessageKey(result.messageKey ?? 'auth.errors.registerFailed')
      return
    }

    router.push(`/${locale}/dashboard`)
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
        <Label htmlFor="email">{t('email')}</Label>
        <Input
          id="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t('emailPlaceholder')}
          type="email"
          value={email}
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
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
        <Input
          id="confirmPassword"
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder={t('confirmPasswordPlaceholder')}
          type="password"
          value={confirmPassword}
        />
      </div>

      {errorMessageKey ? <p className="text-xs text-destructive">{tRoot(errorMessageKey)}</p> : null}

      <Button className="w-full" disabled={isLoading} type="submit">
        {isLoading ? t('loading') : t('registerButton')}
      </Button>
    </form>
  )
}
