'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { mapChallengeAdminErrorToMessageKey } from '@/lib/challenge-admin-error-map'
import {
  importGitlabProject,
  listGitlabProjectFiles,
  listGitlabProjects,
  syncChallengeGitlab,
} from '@/services/challenges.service'
import type { Challenge, GitlabProject, GitlabRepoFile } from '@/types/challenge.types'

type AdminChallengeGitlabTabProps = {
  locale: string
  slug: string
  challenge: Challenge
  onSynced?: () => void
}

export function AdminChallengeGitlabTab({ locale, slug, challenge, onSynced }: AdminChallengeGitlabTabProps) {
  const t = useTranslations('adminChallenges')
  const router = useRouter()

  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  // Project picker state
  const [search, setSearch] = useState('')
  const [projects, setProjects] = useState<readonly GitlabProject[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedProject, setSelectedProject] = useState<GitlabProject | null>(null)
  const [repoFiles, setRepoFiles] = useState<readonly GitlabRepoFile[]>([])
  const [checkedPaths, setCheckedPaths] = useState<Set<string>>(new Set())
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const isGitlab = challenge.source === 'gitlab'
  const gitlab = challenge.gitlab

  const handleSync = async () => {
    setIsSyncing(true)
    setErrorKey(null)
    try {
      await syncChallengeGitlab(slug)
      onSynced?.()
    } catch (error) {
      setErrorKey(mapChallengeAdminErrorToMessageKey(error, 'errors.syncGitlabFailed'))
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSearch = useCallback(async () => {
    setIsSearching(true)
    setErrorKey(null)
    try {
      setProjects(await listGitlabProjects(search))
    } catch (error) {
      setErrorKey(mapChallengeAdminErrorToMessageKey(error, 'errors.gitlabProjectsFailed'))
    } finally {
      setIsSearching(false)
    }
  }, [search])

  const handleSelectProject = async (project: GitlabProject) => {
    setSelectedProject(project)
    setRepoFiles([])
    setCheckedPaths(new Set())
    setIsLoadingFiles(true)
    setErrorKey(null)
    try {
      const data = await listGitlabProjectFiles(project.id)
      setRepoFiles(data.files)
      setCheckedPaths(new Set(data.files.filter((f) => f.default_checked).map((f) => f.path)))
    } catch (error) {
      setErrorKey(mapChallengeAdminErrorToMessageKey(error, 'errors.gitlabFilesFailed'))
    } finally {
      setIsLoadingFiles(false)
    }
  }

  const togglePath = (path: string) => {
    setCheckedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const handleImport = async () => {
    if (!selectedProject) return
    setIsImporting(true)
    setErrorKey(null)
    try {
      const imported = await importGitlabProject({
        project_id: selectedProject.id,
        parent_node_id: null,
        selected_files: Array.from(checkedPaths),
      })
      router.push(`/${locale}/admin/challenges/${imported.slug}`)
    } catch (error) {
      setErrorKey(mapChallengeAdminErrorToMessageKey(error, 'errors.gitlabImportFailed'))
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {errorKey ? <p className="text-sm text-destructive">{t(errorKey as never)}</p> : null}

      {/* Sync panel for a challenge already linked to GitLab */}
      {isGitlab ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('gitlab.syncTitle')}</CardTitle>
            <Button disabled={isSyncing} onClick={() => void handleSync()}>
              {isSyncing ? t('gitlab.syncing') : t('actions.syncGitlab')}
            </Button>
          </CardHeader>
          <CardContent>
            <dl className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">{t('gitlab.project')}</dt>
                <dd className="font-mono">{challenge.gitlab_path || '—'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">{t('gitlab.lastCommit')}</dt>
                <dd className="font-mono">{gitlab?.last_commit_sha?.slice(0, 10) || '—'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">{t('gitlab.lastSynced')}</dt>
                <dd>{gitlab?.last_synced_at ? new Date(gitlab.last_synced_at).toLocaleString() : '—'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ) : null}

      {/* Import a new GitLab project as a separate challenge */}
      <Card>
        <CardHeader>
          <CardTitle>{t('gitlab.importTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('gitlab.importHint')}</p>
          <div className="flex gap-2">
            <Input
              value={search}
              placeholder={t('gitlab.searchPlaceholder')}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSearch()
              }}
            />
            <Button variant="outline" disabled={isSearching} onClick={() => void handleSearch()}>
              {isSearching ? t('gitlab.searching') : t('gitlab.search')}
            </Button>
          </div>

          {projects.length > 0 ? (
            <div className="max-h-48 space-y-1 overflow-auto rounded-md border p-2">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => void handleSelectProject(project)}
                  className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-muted ${
                    selectedProject?.id === project.id ? 'bg-muted' : ''
                  }`}
                >
                  <span className="font-medium">{project.name}</span>
                  <span className="text-xs text-muted-foreground">{project.path_with_namespace}</span>
                </button>
              ))}
            </div>
          ) : null}

          {selectedProject ? (
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{selectedProject.name}</div>
                <Badge variant="outline">{selectedProject.default_branch}</Badge>
              </div>

              <div className="space-y-1">
                <Label>{t('gitlab.filesLabel')}</Label>
                {isLoadingFiles ? (
                  <p className="text-sm text-muted-foreground">{t('gitlab.loadingFiles')}</p>
                ) : repoFiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('gitlab.noFiles')}</p>
                ) : (
                  <div className="space-y-1">
                    {repoFiles.map((file) => (
                      <label key={file.path} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={checkedPaths.has(file.path)}
                          onCheckedChange={() => togglePath(file.path)}
                        />
                        <span className="font-mono">{file.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <Button disabled={isImporting} onClick={() => void handleImport()}>
                {isImporting ? t('gitlab.importing') : t('actions.importGitlab')}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
