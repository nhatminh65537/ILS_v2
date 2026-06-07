'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { mapChallengeAdminErrorToMessageKey } from '@/lib/challenge-admin-error-map'
import {
  importGitlabProject,
  listGitlabProjectFiles,
  listGitlabProjects,
} from '@/services/challenges.service'
import type { GitlabProject, GitlabRepoFile } from '@/types/challenge.types'

type AdminChallengeGitlabImportDialogProps = {
  open: boolean
  locale: string
  /** Folder the imported challenge is created under (null = root). */
  parentNodeId: number | null
  onOpenChange: (open: boolean) => void
}

const EMPTY_PROJECTS: readonly GitlabProject[] = []
const EMPTY_FILES: readonly GitlabRepoFile[] = []

/**
 * Imports a GitLab project as a *new* gitlab-sourced challenge under the current
 * folder. This is a create action, so it lives on the explorer — not inside an
 * existing challenge's editor (which would otherwise create a duplicate).
 */
export function AdminChallengeGitlabImportDialog({
  open,
  locale,
  parentNodeId,
  onOpenChange,
}: AdminChallengeGitlabImportDialogProps) {
  const t = useTranslations('adminChallenges')
  const router = useRouter()

  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [projects, setProjects] = useState<readonly GitlabProject[]>(EMPTY_PROJECTS)
  const [isSearching, setIsSearching] = useState(false)
  const [selectedProject, setSelectedProject] = useState<GitlabProject | null>(null)
  const [repoFiles, setRepoFiles] = useState<readonly GitlabRepoFile[]>(EMPTY_FILES)
  const [checkedPaths, setCheckedPaths] = useState<Set<string>>(new Set())
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)

  // Reset all picker state each time the dialog opens (adjust during render).
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setErrorKey(null)
      setSearch('')
      setProjects(EMPTY_PROJECTS)
      setSelectedProject(null)
      setRepoFiles(EMPTY_FILES)
      setCheckedPaths(new Set())
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
    setRepoFiles(EMPTY_FILES)
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
        parent_node_id: parentNodeId,
        selected_files: Array.from(checkedPaths),
      })
      onOpenChange(false)
      router.push(`/${locale}/admin/challenges/${imported.slug}`)
    } catch (error) {
      setErrorKey(mapChallengeAdminErrorToMessageKey(error, 'errors.gitlabImportFailed'))
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('gitlab.importTitle')}</DialogTitle>
          <DialogDescription>{t('gitlab.importHint')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {errorKey ? <p className="text-sm text-destructive">{t(errorKey as never)}</p> : null}

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
                  <div className="max-h-48 space-y-1 overflow-auto">
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
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={isImporting} onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button disabled={isImporting || !selectedProject} onClick={() => void handleImport()}>
            {isImporting ? t('gitlab.importing') : t('actions.importGitlab')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
