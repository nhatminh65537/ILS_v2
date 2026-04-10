'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateMyProfile } from '@/services/users.service'
import type { UpdateProfilePayload, UserProfile } from '@/types/user.types'

type ProfileEditFormProps = {
  profile: UserProfile
}

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const t = useTranslations('profile')

  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [location, setLocation] = useState(profile.location ?? '')
  const [website, setWebsite] = useState(profile.website ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [entryYear, setEntryYear] = useState<string>(profile.entry_year ? String(profile.entry_year) : '')

  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccessMsg('')
    setErrorMsg('')

    const payload: UpdateProfilePayload = {
      display_name: displayName || undefined,
      bio: bio || undefined,
      location: location || undefined,
      website: website || undefined,
      avatar_url: avatarUrl || undefined,
      entry_year: entryYear ? Number(entryYear) : null,
    }

    try {
      await updateMyProfile(payload)
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
          <Label htmlFor="displayName">{t('displayName')}</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Tên hiển thị"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="entryYear">{t('entryYear')}</Label>
          <Input
            id="entryYear"
            type="number"
            value={entryYear}
            onChange={(e) => setEntryYear(e.target.value)}
            placeholder="2024"
            min={2000}
            max={2100}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="bio">{t('bio')}</Label>
          <Input
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Giới thiệu ngắn về bản thân"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location">{t('location')}</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Hà Nội"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="website">{t('website')}</Label>
          <Input
            id="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="avatarUrl">{t('displayName')} (Avatar URL)</Label>
          <Input
            id="avatarUrl"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://images.example.com/avatar.png"
          />
        </div>
      </div>
      {successMsg && <p className="text-sm text-green-600">{successMsg}</p>}
      {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
      <Button type="submit" disabled={saving}>
        {saving ? t('saving') : t('saveProfile')}
      </Button>
    </form>
  )
}
