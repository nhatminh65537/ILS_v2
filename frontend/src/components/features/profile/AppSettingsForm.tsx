'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTheme, type ThemePreference } from '@/components/providers/ThemeProvider'
import { updateMySettings } from '@/services/users.service'
import type { MeSettingsUpdatePayload, UserProfile } from '@/types/user.types'

type AppSettingsFormProps = {
  profile: UserProfile
}

const isThemePreference = (value: string): value is ThemePreference =>
  value === 'system' || value === 'light' || value === 'dark'

export function AppSettingsForm({ profile }: AppSettingsFormProps) {
  const t = useTranslations('profile')
  const router = useRouter()
  const pathname = usePathname()
  const currentLocale = useLocale()
  const { theme: activeTheme, setTheme: applyTheme } = useTheme()

  const [language, setLanguage] = useState(profile.language)
  const [theme, setTheme] = useState<ThemePreference>(
    isThemePreference(profile.theme) ? profile.theme : 'system'
  )
  const [timezone, setTimezone] = useState(profile.timezone)

  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Sync the live theme with the saved profile preference once on load, so the
  // applied theme matches what the backend has stored.
  useEffect(() => {
    if (isThemePreference(profile.theme) && profile.theme !== activeTheme) {
      applyTheme(profile.theme)
    }
    // Only run on profile load; applyTheme is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.theme])

  const handleThemeChange = (value: string) => {
    if (!isThemePreference(value)) return
    setTheme(value)
    applyTheme(value) // apply immediately, no reload needed
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccessMsg('')
    setErrorMsg('')

    const payload: MeSettingsUpdatePayload = { language, theme, timezone }

    try {
      await updateMySettings(payload)
      setSuccessMsg(t('saveSuccess'))
      // Switch the active locale (URL) so the language change takes effect now.
      if (language !== currentLocale) {
        router.replace(pathname, { locale: language })
      }
    } catch {
      setErrorMsg(t('errors.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="language">{t('language')}</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger id="language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vi">Tiếng Việt</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="theme">{t('theme')}</Label>
          <Select value={theme} onValueChange={handleThemeChange}>
            <SelectTrigger id="theme">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">Hệ thống</SelectItem>
              <SelectItem value="light">Sáng</SelectItem>
              <SelectItem value="dark">Tối</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="timezone">{t('timezone')}</Label>
          <Input
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="Asia/Ho_Chi_Minh"
          />
        </div>
      </div>
      {successMsg && <p className="text-sm text-green-600">{successMsg}</p>}
      {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
      <Button type="submit" disabled={saving}>
        {saving ? t('saving') : t('saveSettings')}
      </Button>
    </form>
  )
}
