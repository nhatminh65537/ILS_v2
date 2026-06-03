'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { killChallengeInstance, listAdminChallengeInstances } from '@/services/challenges.service'
import type { AdminChallengeInstanceDto } from '@/types/challenge.types'

const STATUS_COLORS: Record<string, string> = {
  running: 'bg-green-100 text-green-800',
  stopped: 'bg-gray-100 text-gray-800',
  terminated: 'bg-red-100 text-red-800',
}

type PageState = {
  data: AdminChallengeInstanceDto[]
  isLoading: boolean
  error: string | null
}

type AdminChallengeInstancesPageClientProps = {
  locale: string
}

export function AdminChallengeInstancesPageClient({ locale: _locale }: AdminChallengeInstancesPageClientProps) {
  const t = useTranslations('adminChallenges')
  const [pageState, setPageState] = useState<PageState>({ data: [], isLoading: false, error: null })
  const [isKilling, setIsKilling] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('')
  const [challengeFilter, setChallengeFilter] = useState('')
  const [killTarget, setKillTarget] = useState<AdminChallengeInstanceDto | null>(null)

  const load = async () => {
    setPageState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const params: Record<string, string> = {}
      if (statusFilter !== 'all') params.status = statusFilter
      if (userFilter.trim()) params.user = userFilter.trim()
      if (challengeFilter.trim()) params.challenge = challengeFilter.trim()
      const result = await listAdminChallengeInstances(params)
      setPageState({ data: result.results as AdminChallengeInstanceDto[], isLoading: false, error: null })
    } catch {
      setPageState((s) => ({ ...s, isLoading: false, error: t('errors.loadInstancesFailed') }))
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleKillConfirm = async () => {
    if (!killTarget) return
    setIsKilling(true)
    try {
      await killChallengeInstance(killTarget.id)
      setKillTarget(null)
      await load()
    } finally {
      setIsKilling(false)
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString()

  return (
    <section className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{t('instances.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('instances.subtitle')}</p>
      </header>

      {pageState.error ? <p className="text-sm text-destructive">{pageState.error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('instances.listTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              className="h-9 w-full max-w-xs"
              value={userFilter}
              placeholder={t('instances.filters.user')}
              onChange={(e) => setUserFilter(e.target.value)}
            />
            <Input
              className="h-9 w-full max-w-xs"
              value={challengeFilter}
              placeholder={t('instances.filters.challenge')}
              onChange={(e) => setChallengeFilter(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('toolbar.statusAll')}</SelectItem>
                <SelectItem value="running">{t('instances.status.running')}</SelectItem>
                <SelectItem value="stopped">{t('instances.status.stopped')}</SelectItem>
                <SelectItem value="terminated">{t('instances.status.terminated')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => void load()}>{t('actions.refresh')}</Button>
          </div>

          {pageState.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : pageState.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('empty.noInstances')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('instances.columns.user')}</TableHead>
                  <TableHead>{t('instances.columns.challenge')}</TableHead>
                  <TableHead>{t('instances.columns.status')}</TableHead>
                  <TableHead>{t('instances.columns.startedAt')}</TableHead>
                  <TableHead className="text-right">{t('columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageState.data.map((instance) => (
                  <TableRow key={instance.id}>
                    <TableCell>{instance.user_username}</TableCell>
                    <TableCell>{instance.challenge_title}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[instance.status] ?? ''}>
                        {t(`instances.status.${instance.status}` as never)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(instance.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isKilling || instance.status !== 'running'}
                          onClick={() => setKillTarget(instance)}
                        >
                          {t('instances.kill')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={killTarget !== null}
        title={t('instances.killConfirmTitle')}
        description={killTarget ? t('instances.killConfirm', { user: killTarget.user_username }) : ''}
        confirmLabel={t('instances.kill')}
        cancelLabel={t('actions.cancel')}
        variant="destructive"
        isLoading={isKilling}
        onConfirm={() => void handleKillConfirm()}
        onOpenChange={(open) => !open && setKillTarget(null)}
      />
    </section>
  )
}
