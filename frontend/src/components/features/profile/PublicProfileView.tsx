'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { getPublicActivity, getPublicProfile } from '@/services/users.service'
import type { ActivityEvent, PublicProfileResponse } from '@/types/user.types'
import { ActivityTimeline } from './ActivityTimeline'
import { ProfileHeader } from './ProfileHeader'
import { ProfileStats } from './ProfileStats'

type PublicProfileViewProps = {
  locale: string
  username: string
}

export function PublicProfileView({ locale, username }: PublicProfileViewProps) {
  const t = useTranslations('profile')

  const [profile, setProfile] = useState<PublicProfileResponse | null>(null)
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      setLoading(true)
      setNotFound(false)
      setError(false)
      try {
        const [profileData, activityData] = await Promise.all([
          getPublicProfile(username),
          getPublicActivity(username),
        ])
        if (!cancelled) {
          setProfile(profileData)
          setActivity(activityData)
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const status =
            err && typeof err === 'object' && 'response' in err
              ? (err as { response?: { status?: number } }).response?.status
              : undefined
          if (status === 404) {
            setNotFound(true)
          } else {
            setError(true)
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchData()
    return () => {
      cancelled = true
    }
  }, [username])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-6">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('errors.notFoundTitle')}</DialogTitle>
            <DialogDescription>{t('errors.notFound')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button asChild>
              <Link href={`/${locale}`}>{t('errors.backToHome')}</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  if (error || !profile) {
    return <p className="text-sm text-destructive">{t('errors.loadFailed')}</p>
  }

  return (
    <div className="space-y-8">
      <ProfileHeader profile={profile} />
      <ProfileStats profile={profile} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('activitySection')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline events={activity} />
        </CardContent>
      </Card>
    </div>
  )
}
