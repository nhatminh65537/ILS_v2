'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
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
import { useAdminChallengeFlags } from '@/hooks/useAdminChallengeFlags'
import type { ChallengeFlag, ChallengeFlagMutationPayload } from '@/types/challenge.types'

type AdminChallengeFlagsPageClientProps = {
  locale: string
  slug: string
}

type FlagFormState = {
  flag_value: string
  flag_type: 'static' | 'regex' | 'instance'
  is_regex: boolean
  is_case_sensitive: boolean
  random_tail_length: number
}

const EMPTY_FORM: FlagFormState = {
  flag_value: '',
  flag_type: 'static',
  is_regex: false,
  is_case_sensitive: false,
  random_tail_length: 0,
}

const FLAG_TYPE_COLORS: Record<string, string> = {
  static: 'bg-blue-100 text-blue-800',
  regex: 'bg-purple-100 text-purple-800',
  instance: 'bg-orange-100 text-orange-800',
}

export function AdminChallengeFlagsPageClient({ locale, slug }: AdminChallengeFlagsPageClientProps) {
  const t = useTranslations('adminChallenges')
  const {
    flagsState,
    isMutating,
    mutationErrorKey,
    loadFlags,
    submitCreateFlag,
    submitUpdateFlag,
    submitDeleteFlag,
  } = useAdminChallengeFlags()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingFlag, setEditingFlag] = useState<ChallengeFlag | null>(null)
  const [form, setForm] = useState<FlagFormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<ChallengeFlag | null>(null)

  useEffect(() => {
    void loadFlags(slug)
  }, [loadFlags, slug])

  const openCreate = () => {
    setEditingFlag(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (flag: ChallengeFlag) => {
    setEditingFlag(flag)
    setForm({
      flag_value: flag.flag_value,
      flag_type: flag.flag_type,
      is_regex: flag.is_regex,
      is_case_sensitive: flag.is_case_sensitive,
      random_tail_length: flag.random_tail_length,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.flag_value.trim()) return
    const payload: ChallengeFlagMutationPayload = {
      flag_value: form.flag_value.trim(),
      flag_type: form.flag_type,
      is_regex: form.is_regex,
      is_case_sensitive: form.is_case_sensitive,
      random_tail_length: Math.max(0, Number(form.random_tail_length || 0)),
    }
    const ok = editingFlag
      ? await submitUpdateFlag(slug, editingFlag.id, payload)
      : await submitCreateFlag(slug, payload)
    if (ok) setDialogOpen(false)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    const ok = await submitDeleteFlag(slug, deleteTarget.id)
    if (ok) setDeleteTarget(null)
  }

  return (
    <section className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{t('flags.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('flags.subtitle', { slug })}</p>
        <Link className="text-xs underline" href={`/${locale}/admin/challenges/${slug}`}>
          {t('navigation.backToEditor')}
        </Link>
      </header>

      {mutationErrorKey ? <p className="text-sm text-destructive">{t(mutationErrorKey as never)}</p> : null}
      {flagsState.errorMessageKey ? <p className="text-sm text-destructive">{t(flagsState.errorMessageKey as never)}</p> : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('flags.listTitle')}</CardTitle>
          <Button onClick={openCreate}>{t('actions.addFlag')}</Button>
        </CardHeader>
        <CardContent>
          {flagsState.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : flagsState.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('empty.noFlags')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('flags.columns.flagValue')}</TableHead>
                  <TableHead>{t('flags.columns.flagType')}</TableHead>
                  <TableHead>{t('flags.columns.isRegex')}</TableHead>
                  <TableHead>{t('flags.columns.isCaseSensitive')}</TableHead>
                  <TableHead>{t('flags.columns.randomTailLength')}</TableHead>
                  <TableHead className="text-right">{t('columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flagsState.data.map((flag) => (
                  <TableRow key={flag.id}>
                    <TableCell className="font-mono text-sm">{flag.flag_value}</TableCell>
                    <TableCell>
                      <Badge className={FLAG_TYPE_COLORS[flag.flag_type] ?? ''}>
                        {t(`flags.types.${flag.flag_type}` as never)}
                      </Badge>
                    </TableCell>
                    <TableCell>{flag.is_regex ? t('flags.yes') : t('flags.no')}</TableCell>
                    <TableCell>{flag.is_case_sensitive ? t('flags.yes') : t('flags.no')}</TableCell>
                    <TableCell>{flag.random_tail_length}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(flag)}>
                          {t('actions.edit')}
                        </Button>
                        <Button variant="destructive" size="sm" disabled={isMutating} onClick={() => setDeleteTarget(flag)}>
                          {t('actions.delete')}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFlag ? t('flags.editFlag') : t('flags.addFlag')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t('flags.form.flagValue')}</Label>
              <Input value={form.flag_value} placeholder={t('flags.form.flagValuePlaceholder')} onChange={(e) => setForm((p) => ({ ...p, flag_value: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t('flags.form.flagType')}</Label>
              <Select value={form.flag_type} onValueChange={(v) => setForm((p) => ({ ...p, flag_type: v as FlagFormState['flag_type'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="static">{t('flags.types.static')}</SelectItem>
                  <SelectItem value="regex">{t('flags.types.regex')}</SelectItem>
                  <SelectItem value="instance">{t('flags.types.instance')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={form.is_regex} onCheckedChange={(v) => setForm((p) => ({ ...p, is_regex: Boolean(v) }))} />
                <span>{t('flags.form.isRegex')}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={form.is_case_sensitive} onCheckedChange={(v) => setForm((p) => ({ ...p, is_case_sensitive: Boolean(v) }))} />
                <span>{t('flags.form.isCaseSensitive')}</span>
              </label>
            </div>
            <div className="space-y-1">
              <Label>{t('flags.form.randomTailLength')}</Label>
              <Input type="number" min={0} value={String(form.random_tail_length)} onChange={(e) => setForm((p) => ({ ...p, random_tail_length: Math.max(0, Number(e.target.value || 0)) }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('actions.cancel')}</Button>
            <Button disabled={isMutating || !form.flag_value.trim()} onClick={() => void handleSubmit()}>
              {isMutating ? t('status.saving') : t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('flags.deleteConfirmTitle')}
        description={t('flags.deleteConfirm')}
        confirmLabel={t('actions.delete')}
        cancelLabel={t('actions.cancel')}
        variant="destructive"
        isLoading={isMutating}
        onConfirm={() => void handleDeleteConfirm()}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </section>
  )
}
