'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getLeaderboard } from '@/services/leaderboard.service'
import { useAuthStore } from '@/stores/auth.store'
import type { LeaderboardEntry, LeaderboardResponse, LeaderboardType } from '@/types/leaderboard.types'

type LeaderboardPageClientProps = {
  locale: string
}

const BOARD_TYPES: readonly LeaderboardType[] = ['overall', 'challenge', 'quiz', 'course']
const DEFAULT_PAGE_SIZE = 10

function formatNumber(locale: string, value: number): string {
  return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(value)
}

function getDisplayLabel(row: LeaderboardEntry): string {
  return row.user.display_name ?? row.user.username
}

function getInitials(label: string): string {
  const tokens = label.trim().split(/\s+/).filter(Boolean)

  if (tokens.length === 0) {
    return '?'
  }

  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase()
  }

  return `${tokens[0][0]}${tokens[tokens.length - 1][0]}`.toUpperCase()
}

// Medal styling per podium rank (1 = gold, 2 = silver, 3 = bronze).
const PODIUM_MEDAL = {
  1: { ring: 'ring-2 ring-yellow-400', badge: 'bg-yellow-400 text-yellow-950', emoji: '🥇' },
  2: { ring: 'ring-2 ring-zinc-300', badge: 'bg-zinc-300 text-zinc-900', emoji: '🥈' },
  3: { ring: 'ring-2 ring-amber-600', badge: 'bg-amber-600 text-amber-50', emoji: '🥉' },
} as const

type PodiumPlace = keyof typeof PODIUM_MEDAL

type LeaderboardPodiumProps = {
  locale: string
  entries: readonly LeaderboardEntry[]
  currentUserId: number | null
  scoreLabel: string
  currentUserLabel: string
}

function LeaderboardPodium({
  locale,
  entries,
  currentUserId,
  scoreLabel,
  currentUserLabel,
}: LeaderboardPodiumProps) {
  // Take the top three *entries* (already rank-sorted, with user_id as the
  // deterministic tiebreaker) — keyed by user.id so tied users are never
  // overwritten. The medal reflects each entry's actual rank (ties → same rank).
  const top = entries.slice(0, 3)

  if (top.length === 0) {
    return null
  }

  // Visual arrangement: 2nd (left), 1st (center, raised), 3rd (right).
  const visualOrder = [1, 0, 2].filter((index) => index < top.length)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {visualOrder.map((index) => {
        const entry = top[index]
        const place = (entry.rank >= 1 && entry.rank <= 3 ? entry.rank : index + 1) as PodiumPlace
        const medal = PODIUM_MEDAL[place]
        const displayName = getDisplayLabel(entry)
        const isCurrentUser = entry.user.id === currentUserId

        return (
          <Card
            key={entry.user.id}
            className={`rounded-none ${medal.ring} ${index === 0 ? 'sm:-mt-4' : ''} ${
              isCurrentUser ? 'bg-primary/5' : ''
            }`}
          >
            <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
              <span className="text-3xl" aria-hidden>
                {medal.emoji}
              </span>
              <Avatar size="lg" className={medal.ring}>
                <AvatarImage src={entry.user.avatar_url ?? undefined} alt={displayName} />
                <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
              </Avatar>
              <Link
                href={`/${locale}/profile/${entry.user.username}`}
                className="min-w-0 hover:underline"
              >
                <p className="truncate font-semibold text-foreground">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  @{entry.user.username} {isCurrentUser ? `· ${currentUserLabel}` : ''}
                </p>
              </Link>
              <Badge className={`${medal.badge} min-w-12 justify-center`}>#{place}</Badge>
              <p className="text-lg font-semibold">{formatNumber(locale, entry.score)}</p>
              <p className="text-xs text-muted-foreground">{scoreLabel}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export function LeaderboardPageClient({ locale }: LeaderboardPageClientProps) {
  const t = useTranslations('leaderboard')
  const currentUserId = useAuthStore((state) => state.user?.id ?? null)

  const [boardType, setBoardType] = useState<LeaderboardType>('overall')
  const [page, setPage] = useState(1)
  const [response, setResponse] = useState<LeaderboardResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  // Row ref + a flag so we scroll to the current user only after a "Go to my rank" click.
  const currentUserRowRef = useRef<HTMLTableRowElement | null>(null)
  const [scrollToMeRequested, setScrollToMeRequested] = useState(false)

  useEffect(() => {
    let ignore = false

    const loadLeaderboard = async (): Promise<void> => {
      setIsLoading(true)
      setErrorKey(null)

      try {
        const data = await getLeaderboard({
          type: boardType,
          page,
          limit: DEFAULT_PAGE_SIZE,
        })

        if (!ignore) {
          setResponse(data)
        }
      } catch {
        if (!ignore) {
          setErrorKey('errors.loadFailed')
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    void loadLeaderboard()

    return () => {
      ignore = true
    }
  }, [boardType, page])

  const rows = response?.results ?? []
  const pageSize = response?.page_size ?? DEFAULT_PAGE_SIZE
  const totalCount = response?.total_count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const myRank = response?.my_rank ?? null

  const currentUserRow = rows.find((row) => row.user.id === currentUserId) ?? null
  const showPodium = page === 1 && rows.length > 0

  // Scroll to the current user's row once the page that contains them has loaded.
  useEffect(() => {
    if (!scrollToMeRequested) {
      return
    }

    if (currentUserRow && currentUserRowRef.current) {
      currentUserRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setScrollToMeRequested(false)
    }
  }, [scrollToMeRequested, currentUserRow])

  const handleTabChange = (value: string): void => {
    if (!BOARD_TYPES.includes(value as LeaderboardType)) {
      return
    }

    setBoardType(value as LeaderboardType)
    setPage(1)
  }

  const handlePreviousPage = (): void => {
    setPage((current) => Math.max(1, current - 1))
  }

  const handleNextPage = (): void => {
    setPage((current) => Math.min(totalPages, current + 1))
  }

  const handleGoToMyRank = (): void => {
    if (myRank == null) {
      return
    }

    const targetPage = Math.max(1, Math.ceil(myRank / pageSize))
    setScrollToMeRequested(true)
    // If already on the right page, the scroll effect fires on the existing rows;
    // otherwise it fires after the new page loads.
    if (targetPage !== page) {
      setPage(targetPage)
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold md:text-4xl">{t('title')}</h1>
          <p className="text-muted-foreground max-w-3xl text-sm md:text-base">{t('subtitle')}</p>
        </div>

        <Tabs value={boardType} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overall">{t('tabs.overall')}</TabsTrigger>
            <TabsTrigger value="challenge">{t('tabs.challenge')}</TabsTrigger>
            <TabsTrigger value="quiz">{t('tabs.quiz')}</TabsTrigger>
            <TabsTrigger value="course">{t('tabs.course')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-none">
          <CardHeader className="space-y-1">
            <CardDescription>{t('myRank')}</CardDescription>
            <CardTitle className="text-3xl font-semibold">
              {isLoading ? <Skeleton className="h-9 w-24 rounded-none" /> : myRank ? `#${myRank}` : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {currentUserRow ? (
              <>
                <p>
                  {getDisplayLabel(currentUserRow)} · {formatNumber(locale, currentUserRow.score)}{' '}
                  {t('columns.score')}
                </p>
                <p>
                  {t('currentUser')} · {currentUserRow.user.username}
                </p>
              </>
            ) : isLoading ? (
              <p>{t('states.loading')}</p>
            ) : (
              <p>{t('states.myRankUnavailable')}</p>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={myRank == null}
              onClick={handleGoToMyRank}
            >
              {t('goToMyRank')}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-none">
          <CardHeader className="space-y-1">
            <CardDescription>{t('totalUsers')}</CardDescription>
            <CardTitle className="text-3xl font-semibold">{formatNumber(locale, totalCount)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              {t(`tabs.${boardType}`)} · {t('pagination.pageInfo', { page, totalPages })}
            </p>
            <p>
              {response?.type
                ? `${response.type.toUpperCase()} · ${pageSize} / ${formatNumber(locale, totalCount)}`
                : t('states.loading')}
            </p>
          </CardContent>
        </Card>
      </section>

      {showPodium ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t('podium.title')}</h2>
          <LeaderboardPodium
            locale={locale}
            entries={rows}
            currentUserId={currentUserId}
            scoreLabel={t('columns.score')}
            currentUserLabel={t('currentUser')}
          />
        </section>
      ) : null}

      <Card className="rounded-none">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl font-semibold">{t('title')}</CardTitle>
          <CardDescription>{t('columns.delta')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full rounded-none" />
              ))}
            </div>
          ) : errorKey ? (
            <div className="text-destructive text-sm">{t(errorKey as Parameters<typeof t>[0])}</div>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">{t('states.empty')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">{t('columns.rank')}</TableHead>
                  <TableHead>{t('columns.user')}</TableHead>
                  <TableHead className="w-32 text-right">{t('columns.score')}</TableHead>
                  <TableHead className="w-32 text-right">{t('columns.completed')}</TableHead>
                  <TableHead className="w-32 text-right">{t('columns.delta')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const isCurrentUser = row.user.id === currentUserId
                  const displayName = getDisplayLabel(row)

                  return (
                    <TableRow
                      key={row.user.id}
                      ref={isCurrentUser ? currentUserRowRef : undefined}
                      className={isCurrentUser ? 'bg-primary/5' : undefined}
                    >
                      <TableCell>
                        <Badge variant={row.rank === 1 ? 'default' : 'outline'} className="min-w-12 justify-center">
                          #{formatNumber(locale, row.rank)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/${locale}/profile/${row.user.username}`}
                          className="flex min-w-0 items-center gap-3 hover:underline"
                        >
                          <Avatar size="sm">
                            <AvatarImage src={row.user.avatar_url ?? undefined} alt={displayName} />
                            <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{displayName}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              @{row.user.username} {isCurrentUser ? `· ${t('currentUser')}` : ''}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatNumber(locale, row.score)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatNumber(locale, row.completed ?? 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={row.delta === 0 ? 'outline' : 'secondary'}>
                          {row.delta === 0 ? '0' : `+${formatNumber(locale, row.delta)}`}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}

          {!isLoading && !errorKey && rows.length > 0 ? (
            <div className="flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
              <p className="text-muted-foreground text-sm">
                {t('pagination.totalInfo', { totalCount: formatNumber(locale, totalCount) })}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={handlePreviousPage}>
                  {t('pagination.previous')}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t('pagination.pageInfo', { page, totalPages })}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={handleNextPage}>
                  {t('pagination.next')}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  )
}