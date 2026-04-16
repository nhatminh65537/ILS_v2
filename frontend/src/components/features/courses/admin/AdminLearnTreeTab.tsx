'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAdminLearnCourseTree } from '@/hooks/useAdminLearnCourseTree'
import { LessonType, LessonSource, type CourseNode } from '@/types/course.types'
import { AdminLearnNodeTree } from './AdminLearnNodeTree'

type AdminLearnTreeTabProps = {
  locale: string
  slug: string
}

type LessonFormState = {
  nodeTitle: string
  lessonTitle: string
  lessonType: LessonType
  parentId: string
  position: string
  contentMd: string
  videoUrl: string
}

const collectFolderNodes = (
  roots: CourseNode[],
  childrenByParentId: Record<number, CourseNode[]>
): CourseNode[] => {
  const result: CourseNode[] = []

  const walk = (nodes: CourseNode[]) => {
    for (const node of nodes) {
      if (!node.is_item) {
        result.push(node)
      }
      const children = childrenByParentId[node.id] ?? []
      if (children.length > 0) {
        walk(children)
      }
    }
  }

  walk(roots)
  return result
}

export function AdminLearnTreeTab({ locale, slug }: AdminLearnTreeTabProps) {
  const t = useTranslations('adminLearn')
  const {
    treeState,
    isMutating,
    mutationErrorKey,
    loadRoot,
    expandNode,
    submitCreateFolder,
    submitCreateLessonNode,
    submitRenameNode,
    submitMoveNode,
    submitReorderNode,
    submitDeleteNode,
  } = useAdminLearnCourseTree()

  const [folderTitle, setFolderTitle] = useState('')
  const [folderParentId, setFolderParentId] = useState('root')
  const [folderPosition, setFolderPosition] = useState('')

  const [lessonForm, setLessonForm] = useState<LessonFormState>({
    nodeTitle: '',
    lessonTitle: '',
    lessonType: LessonType.Markdown,
    parentId: 'root',
    position: '',
    contentMd: '',
    videoUrl: '',
  })

  useEffect(() => {
    void loadRoot(slug)
  }, [loadRoot, slug])

  const folderOptions = useMemo(
    () => collectFolderNodes(treeState.rootNodes, treeState.childrenByParentId),
    [treeState.childrenByParentId, treeState.rootNodes]
  )

  const handleCreateFolder = async () => {
    if (!folderTitle.trim()) {
      return
    }

    const ok = await submitCreateFolder(slug, {
      title: folderTitle.trim(),
      parent_id: folderParentId === 'root' ? null : Number(folderParentId),
      position: folderPosition.trim() ? Number(folderPosition) : undefined,
      is_item: false,
    })

    if (ok) {
      setFolderTitle('')
      setFolderParentId('root')
      setFolderPosition('')
    }
  }

  const handleCreateLessonNode = async () => {
    if (!lessonForm.nodeTitle.trim() || !lessonForm.lessonTitle.trim()) {
      return
    }

    const lessonPayload = {
      title: lessonForm.lessonTitle.trim(),
      lesson_type: lessonForm.lessonType,
      source: LessonSource.Manual,
      content_md: lessonForm.lessonType === LessonType.Markdown ? lessonForm.contentMd.trim() : undefined,
      video_url: lessonForm.lessonType === LessonType.Video ? lessonForm.videoUrl.trim() : undefined,
      learning_point: 0,
      learning_time: null,
    }

    const ok = await submitCreateLessonNode(slug, {
      title: lessonForm.nodeTitle.trim(),
      parent_id: lessonForm.parentId === 'root' ? null : Number(lessonForm.parentId),
      position: lessonForm.position.trim() ? Number(lessonForm.position) : undefined,
      is_item: true,
      lesson: lessonPayload,
    })

    if (ok) {
      setLessonForm({
        nodeTitle: '',
        lessonTitle: '',
        lessonType: LessonType.Markdown,
        parentId: 'root',
        position: '',
        contentMd: '',
        videoUrl: '',
      })
    }
  }

  return (
    <div className="space-y-4">
      {treeState.errorMessageKey ? <p className="text-sm text-destructive">{t(treeState.errorMessageKey as never)}</p> : null}
      {mutationErrorKey ? <p className="text-sm text-destructive">{t(mutationErrorKey as never)}</p> : null}

      <div className="grid gap-4 rounded-md border border-border p-4 lg:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t('tree.createFolderTitle')}</h3>
          <Input value={folderTitle} placeholder={t('tree.folderTitlePlaceholder')} onChange={(event) => setFolderTitle(event.target.value)} />
          <div className="grid gap-2 md:grid-cols-2">
            <Select value={folderParentId} onValueChange={setFolderParentId}>
              <SelectTrigger>
                <SelectValue placeholder={t('tree.parentLabel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">{t('tree.parentRoot')}</SelectItem>
                {folderOptions.map((folder) => (
                  <SelectItem key={folder.id} value={String(folder.id)}>{folder.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input value={folderPosition} type="number" min={0} placeholder={t('tree.positionPlaceholder')} onChange={(event) => setFolderPosition(event.target.value)} />
          </div>
          <Button disabled={isMutating || !folderTitle.trim()} onClick={() => void handleCreateFolder()}>{t('tree.createFolder')}</Button>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t('tree.createLessonNodeTitle')}</h3>
          <Input
            value={lessonForm.nodeTitle}
            placeholder={t('tree.lessonNodeTitlePlaceholder')}
            onChange={(event) => setLessonForm((prev) => ({ ...prev, nodeTitle: event.target.value }))}
          />
          <Input
            value={lessonForm.lessonTitle}
            placeholder={t('tree.lessonTitlePlaceholder')}
            onChange={(event) => setLessonForm((prev) => ({ ...prev, lessonTitle: event.target.value }))}
          />
          <div className="grid gap-2 md:grid-cols-3">
            <Select
              value={lessonForm.lessonType}
              onValueChange={(value) => setLessonForm((prev) => ({ ...prev, lessonType: value as LessonType }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={LessonType.Markdown}>{t('lessonTypes.markdown')}</SelectItem>
                <SelectItem value={LessonType.Video}>{t('lessonTypes.video')}</SelectItem>
                <SelectItem value={LessonType.MiniQuiz}>{t('lessonTypes.miniquiz')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={lessonForm.parentId} onValueChange={(value) => setLessonForm((prev) => ({ ...prev, parentId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder={t('tree.parentLabel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">{t('tree.parentRoot')}</SelectItem>
                {folderOptions.map((folder) => (
                  <SelectItem key={folder.id} value={String(folder.id)}>{folder.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={lessonForm.position}
              type="number"
              min={0}
              placeholder={t('tree.positionPlaceholder')}
              onChange={(event) => setLessonForm((prev) => ({ ...prev, position: event.target.value }))}
            />
          </div>
          {lessonForm.lessonType === LessonType.Markdown ? (
            <textarea
              className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              placeholder={t('tree.markdownPlaceholder')}
              value={lessonForm.contentMd}
              onChange={(event) => setLessonForm((prev) => ({ ...prev, contentMd: event.target.value }))}
            />
          ) : null}
          {lessonForm.lessonType === LessonType.Video ? (
            <Input
              value={lessonForm.videoUrl}
              placeholder={t('tree.videoUrlPlaceholder')}
              onChange={(event) => setLessonForm((prev) => ({ ...prev, videoUrl: event.target.value }))}
            />
          ) : null}
          <Button
            disabled={isMutating || !lessonForm.nodeTitle.trim() || !lessonForm.lessonTitle.trim()}
            onClick={() => void handleCreateLessonNode()}
          >
            {t('tree.createLessonNode')}
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t('tree.treeTitle')}</h3>
          <Button variant="outline" size="sm" onClick={() => void loadRoot(slug)} disabled={isMutating || treeState.isRootLoading}>
            {t('actions.refresh')}
          </Button>
        </div>

        {treeState.isRootLoading ? <p className="text-sm text-muted-foreground">{t('status.loadingTree')}</p> : null}
        {!treeState.isRootLoading ? (
          <AdminLearnNodeTree
            locale={locale}
            slug={slug}
            rootNodes={treeState.rootNodes}
            expandedNodeIds={treeState.expandedNodeIds}
            childrenByParentId={treeState.childrenByParentId}
            isNodeLoadingById={treeState.isNodeLoadingById}
            isMutating={isMutating}
            onToggle={(node) => void expandNode(slug, node)}
            onRename={(nodeId, title) => submitRenameNode(slug, nodeId, title)}
            onMove={(nodeId, parentId) => submitMoveNode(slug, nodeId, parentId)}
            onReorder={(nodeId, position) => submitReorderNode(slug, nodeId, position)}
            onDelete={(nodeId) => submitDeleteNode(slug, nodeId)}
          />
        ) : null}
      </div>
    </div>
  )
}
