'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ArrowRight, LogIn, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'

type HomeCTAProps = {
  locale: string
}

export function HomeCTA({ locale }: HomeCTAProps) {
  const t = useTranslations('home')
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-11 w-36" />
        <Skeleton className="h-11 w-36" />
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href={`/${locale}/dashboard`}>
            {t('dashboardCta')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href={`/${locale}/courses`}>
            {t('coursesCta')}
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button asChild size="lg">
        <Link href={`/${locale}/login`}>
          <LogIn className="mr-2 h-4 w-4" />
          {t('loginCta')}
        </Link>
      </Button>
      <Button asChild size="lg" variant="outline">
        <Link href={`/${locale}/register`}>
          <UserPlus className="mr-2 h-4 w-4" />
          {t('registerCta')}
        </Link>
      </Button>
    </div>
  )
}
