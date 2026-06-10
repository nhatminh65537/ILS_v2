'use client'

import Link from 'next/link'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { TruncatedCell } from '@/components/ui/truncated-cell'
import { useAdminUsers } from '@/hooks/useAdminUsers'
import type { AdminUserCreatePayload, AdminUserDto } from '@/types/user.types'

type StatusFilter = 'all' | 'active' | 'inactive'

type AdminUsersPageClientProps = {
  locale: string
}

export function AdminUsersPageClient({ locale }: AdminUsersPageClientProps) {
  const t = useTranslations('adminUsers')

  const {
    usersState,
    pagination,
    isMutating,
    mutationErrorKey,
    mutationErrorText,
    loadUsers,
    loadPage,
    submitToggleActive,
    submitCreateUser,
  } = useAdminUsers()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [deactivatingUser, setDeactivatingUser] = useState<AdminUserDto | null>(null)
  const [detailUser, setDetailUser] = useState<AdminUserDto | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ username: '', email: '', password: '' })

  // Initial load
  useEffect(() => {
    void loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-fetch when status filter changes
  const handleStatusFilterChange = (value: StatusFilter) => {
    setStatusFilter(value)
    const params =
      value === 'all' ? {} : { is_active: value === 'active' }
    void loadUsers(params)
  }

  // Client-side search filter on top of server-fetched data
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return usersState.data
    const q = search.toLowerCase()
    return usersState.data.filter(
      (u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  }, [usersState.data, search])

  const handleRefresh = () => {
    const params =
      statusFilter === 'all' ? {} : { is_active: statusFilter === 'active' }
    void loadUsers(params)
  }

  const handleDeactivateConfirm = async () => {
    if (!deactivatingUser) return
    await submitToggleActive(deactivatingUser)
    setDeactivatingUser(null)
  }

  const handleToggleActive = (user: AdminUserDto) => {
    if (user.is_active) {
      setDeactivatingUser(user)
    } else {
      void submitToggleActive(user)
    }
  }

  const handleCreateSubmit = async () => {
    const payload: AdminUserCreatePayload = {
      username: createForm.username.trim(),
      ...(createForm.email.trim() ? { email: createForm.email.trim() } : {}),
      ...(createForm.password.trim() ? { password: createForm.password.trim() } : {}),
    }
    const ok = await submitCreateUser(payload)
    if (ok) {
      setCreateDialogOpen(false)
      setCreateForm({ username: '', email: '', password: '' })
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  const formatDateTime = (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—'

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>{t('createButton')}</Button>
      </div>

      {/* Mutation error banner — prefer the exact server message when present. */}
      {(mutationErrorText || mutationErrorKey) && (
        <div className="bg-destructive/10 text-destructive rounded-md px-4 py-3 text-sm">
          {mutationErrorText ?? t(mutationErrorKey as Parameters<typeof t>[0])}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">{t('title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <Input
              className="max-w-xs"
              placeholder={t('toolbar.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={(v) => handleStatusFilterChange(v as StatusFilter)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('toolbar.filterLabel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('toolbar.filterAll')}</SelectItem>
                <SelectItem value="active">{t('toolbar.filterActive')}</SelectItem>
                <SelectItem value="inactive">{t('toolbar.filterInactive')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={usersState.isLoading}>
              {usersState.isLoading ? t('toolbar.refreshing') : t('toolbar.refresh')}
            </Button>
          </div>

          {/* Load error */}
          {usersState.errorMessageKey && (
            <div className="text-destructive text-sm">
              {t(usersState.errorMessageKey as Parameters<typeof t>[0])}
            </div>
          )}

          {/* Table */}
          {usersState.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {search.trim() ? t('empty.noResults') : t('empty.noUsers')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columns.username')}</TableHead>
                  <TableHead>{t('columns.email')}</TableHead>
                  <TableHead>{t('columns.roles')}</TableHead>
                  <TableHead>{t('columns.status')}</TableHead>
                  <TableHead>{t('columns.dateJoined')}</TableHead>
                  <TableHead className="text-right">{t('columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      <TruncatedCell value={user.email} className="max-w-55" dialogTitle={user.username} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length === 0 ? (
                          <span className="text-muted-foreground text-xs">—</span>
                        ) : (
                          user.roles.map((role) => (
                            <Badge key={role.id} variant="secondary" className="text-xs">
                              {role.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'default' : 'outline'}>
                        {user.is_active ? t('status.active') : t('status.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(user.date_joined)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setDetailUser(user)}>
                          {t('actions.detail')}
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/${locale}/admin/rbac/users/${user.id}/roles`}>
                            {t('actions.manageRoles')}
                          </Link>
                        </Button>
                        <Button
                          variant={user.is_active ? 'outline' : 'default'}
                          size="sm"
                          disabled={isMutating}
                          onClick={() => handleToggleActive(user)}
                        >
                          {user.is_active ? t('actions.deactivate') : t('actions.activate')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {!usersState.isLoading && usersState.data.length > 0 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-muted-foreground text-sm">
                {t('pagination.totalInfo', { total: pagination.count })}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPrevious || usersState.isLoading}
                  onClick={() => void loadPage(pagination.page - 1)}
                >
                  {t('pagination.previous')}
                </Button>
                <span className="text-sm">
                  {t('pagination.pageInfo', { page: pagination.page })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNext || usersState.isLoading}
                  onClick={() => void loadPage(pagination.page + 1)}
                >
                  {t('pagination.next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deactivate confirmation dialog */}
      <Dialog open={!!deactivatingUser} onOpenChange={(open) => !open && setDeactivatingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmation.deactivateTitle')}</DialogTitle>
            <DialogDescription>
              {t('confirmation.deactivateDescription', {
                username: deactivatingUser?.username ?? '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivatingUser(null)}>
              {t('confirmation.cancel')}
            </Button>
            <Button variant="destructive" disabled={isMutating} onClick={handleDeactivateConfirm}>
              {t('confirmation.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User detail dialog */}
      <Dialog open={detailUser !== null} onOpenChange={(open) => !open && setDetailUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('detail.title')}</DialogTitle>
            <DialogDescription>{detailUser?.username ?? ''}</DialogDescription>
          </DialogHeader>
          {detailUser ? (
            <dl className="space-y-2 text-sm">
              <DetailRow label={t('columns.username')}>{detailUser.username}</DetailRow>
              <DetailRow label={t('columns.email')}>{detailUser.email || '—'}</DetailRow>
              <DetailRow label={t('detail.fullName')}>
                {[detailUser.first_name, detailUser.last_name].filter(Boolean).join(' ') || '—'}
              </DetailRow>
              <DetailRow label={t('columns.status')}>
                <Badge variant={detailUser.is_active ? 'default' : 'outline'}>
                  {detailUser.is_active ? t('status.active') : t('status.inactive')}
                </Badge>
              </DetailRow>
              <DetailRow label={t('detail.roles')}>
                {detailUser.roles.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {detailUser.roles.map((role) => (
                      <Badge key={role.id} variant="secondary" className="text-xs">
                        {role.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </DetailRow>
              <DetailRow label={t('detail.staff')}>
                {detailUser.is_staff ? t('detail.yes') : t('detail.no')}
              </DetailRow>
              <DetailRow label={t('detail.superuser')}>
                {detailUser.is_superuser ? t('detail.yes') : t('detail.no')}
              </DetailRow>
              <DetailRow label={t('columns.dateJoined')}>
                {formatDateTime(detailUser.date_joined)}
              </DetailRow>
              <DetailRow label={t('detail.lastLogin')}>
                {formatDateTime(detailUser.last_login)}
              </DetailRow>
            </dl>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailUser(null)}>
              {t('confirmation.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create user dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('form.createTitle')}</DialogTitle>
            <DialogDescription>{t('form.createDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="create-username">{t('form.usernameLabel')}</Label>
              <Input
                id="create-username"
                placeholder={t('form.usernamePlaceholder')}
                value={createForm.username}
                onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-email">{t('form.emailLabel')}</Label>
              <Input
                id="create-email"
                type="email"
                placeholder={t('form.emailPlaceholder')}
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-password">{t('form.passwordLabel')}</Label>
              <Input
                id="create-password"
                type="password"
                placeholder={t('form.passwordPlaceholder')}
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {t('confirmation.cancel')}
            </Button>
            <Button
              disabled={isMutating || !createForm.username.trim()}
              onClick={handleCreateSubmit}
            >
              {isMutating ? t('form.submitting') : t('form.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  )
}
