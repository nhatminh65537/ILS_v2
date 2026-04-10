'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
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
import { updateMySettings } from '@/services/users.service'
import type { MeSettingsUpdatePayload, UserProfile } from '@/types/user.types'

type AppSettingsFormProps = {
  profile: UserProfile
}

export function AppSettingsForm({ profile }: AppSettingsFormProps) {
  const t = useTranslations('profile')

  const [language, setLanguage] = useState(profile.language)
  const [theme, setTheme] = useState(profile.theme)
  const [timezone, setTimezone] = useState(profile.timezone)

  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccessMsg('')
    setErrorMsg('')

    const payload: MeSettingsUpdatePayload = { language, theme, timezone }

    try {
      await updateMySettings(payload)
      setSuccessMsg(t('saveSuccess'))
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
          <Select value={theme} onValueChange={setTheme}>
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
