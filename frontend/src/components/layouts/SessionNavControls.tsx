'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationBell } from '@/components/features/notifications/NotificationBell'
import { useAuth } from '@/hooks/useAuth'

type SessionNavControlsProps = {
  locale: string
}

const getInitials = (name: string | undefined): string => {
  if (!name) return 'U'
  const normalized = name.trim()
  if (!normalized) return 'U'
  return normalized.slice(0, 2).toUpperCase()
}

export function SessionNavControls({ locale }: SessionNavControlsProps) {
  const tAuth = useTranslations('auth')
  const tNav = useTranslations('navigation')
  const router = useRouter()
  const { isAuthenticated, isLoading, user, logout } = useAuth()

  const initials = useMemo(() => getInitials(user?.username), [user?.username])

  const handleLogout = async () => {
    await logout()
    router.replace(`/${locale}/login`)
    router.refresh()
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="ghost">
          <Link href={`/${locale}/login`}>{tNav('login')}</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/${locale}/register`}>{tNav('register')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <NotificationBell locale={locale} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="px-2" size="sm" variant="ghost">
            <Avatar size="sm">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuLabel className="truncate">{user?.username ?? 'user'}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {user?.username && (
            <DropdownMenuItem asChild>
              <Link href={`/${locale}/profile/${user.username}`}>{tNav('profile')}</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href={`/${locale}/profile/settings`}>{tNav('settings')}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/${locale}/profile/sessions`}>{tNav('sessions')}</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={isLoading} onSelect={() => void handleLogout()} variant="destructive">
            {tAuth('logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
