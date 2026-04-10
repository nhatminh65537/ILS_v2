'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getMyProfile } from '@/services/users.service'
import type { UserProfile } from '@/types/user.types'
import { AccountForm } from './AccountForm'
import { AppSettingsForm } from './AppSettingsForm'
import { ProfileEditForm } from './ProfileEditForm'

export function ProfileSettingsView() {
  const t = useTranslations('profile')

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let cancelled = false

    const fetchProfile = async () => {
      try {
        const data = await getMyProfile()
        if (!cancelled) setProfile(data)
      } catch {
        if (!cancelled) setErrorMsg(t('errors.loadFailed'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchProfile()
    return () => {
      cancelled = true
    }
  }, [t])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    )
  }

  if (errorMsg || !profile) {
    return <p className="text-sm text-destructive">{errorMsg || t('errors.loadFailed')}</p>
  }

  return (
    <div className="space-y-6">
      {/* Profile info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('editSection')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileEditForm profile={profile} />
        </CardContent>
      </Card>

      {/* App settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settingsSection')}</CardTitle>
        </CardHeader>
        <CardContent>
          <AppSettingsForm profile={profile} />
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>{t('accountSection')}</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountForm profile={profile} />
        </CardContent>
      </Card>

      {/* Password change — pending Task 1.4 */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle>{t('passwordSection')}</CardTitle>
          <CardDescription>{t('passwordPending')}</CardDescription>
        </CardHeader>
      </Card>

      {/* SSO identity — deferred */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle>{t('ssoSection')}</CardTitle>
          <CardDescription>{t('ssoPending')}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
