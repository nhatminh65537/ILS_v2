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
import { useAdminChallengeTree } from '@/hooks/useAdminChallengeTree'
import type { ChallengeNode } from '@/types/challenge.types'
import { AdminChallengeNodeTree } from './AdminChallengeNodeTree'

type AdminChallengeTreeTabProps = {
  locale: string
}

const collectFolderNodes = (
  roots: ChallengeNode[],
  childrenByParentId: Record<number, ChallengeNode[]>
): ChallengeNode[] => {
  const result: ChallengeNode[] = []

  const walk = (nodes: ChallengeNode[]) => {
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

export function AdminChallengeTreeTab({ locale }: AdminChallengeTreeTabProps) {
  const t = useTranslations('adminChallenges')
  const {
    treeState,
    isMutating,
    mutationErrorKey,
    loadRoot,
    expandNode,
    submitCreateFolder,
    submitCreateChallengeNode,
    submitRenameNode,
    submitMoveNode,
    submitReorderNode,
    submitDeleteNode,
  } = useAdminChallengeTree()

  const [folderTitle, setFolderTitle] = useState('')
  const [folderParentId, setFolderParentId] = useState('root')
  const [folderPosition, setFolderPosition] = useState('')

  const [nodeTitle, setNodeTitle] = useState('')
  const [nodeChallengeId, setNodeChallengeId] = useState('')
  const [nodeParentId, setNodeParentId] = useState('root')
  const [nodePosition, setNodePosition] = useState('')

  useEffect(() => {
    void loadRoot()
  }, [loadRoot])

  const folderOptions = useMemo(
    () => collectFolderNodes(treeState.rootNodes, treeState.childrenByParentId),
    [treeState.childrenByParentId, treeState.rootNodes]
  )

  const handleCreateFolder = async () => {
    if (!folderTitle.trim()) return
    const ok = await submitCreateFolder({
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

  const handleCreateChallengeNode = async () => {
    if (!nodeTitle.trim()) return
    const ok = await submitCreateChallengeNode({
      title: nodeTitle.trim(),
      parent_id: nodeParentId === 'root' ? null : Number(nodeParentId),
      position: nodePosition.trim() ? Number(nodePosition) : undefined,
      is_item: true,
      challenge_id: nodeChallengeId.trim() ? Number(nodeChallengeId) : null,
    })
    if (ok) {
      setNodeTitle('')
      setNodeChallengeId('')
      setNodeParentId('root')
      setNodePosition('')
    }
  }

  return (
    <div className="space-y-4">
      {treeState.errorMessageKey ? <p className="text-sm text-destructive">{t(treeState.errorMessageKey as never)}</p> : null}
      {mutationErrorKey ? <p className="text-sm text-destructive">{t(mutationErrorKey as never)}</p> : null}

      <div className="grid gap-4 rounded-md border border-border p-4 lg:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t('tree.createFolderTitle')}</h3>
          <Input value={folderTitle} placeholder={t('tree.folderTitlePlaceholder')} onChange={(e) => setFolderTitle(e.target.value)} />
          <div className="grid gap-2 md:grid-cols-2">
            <Select value={folderParentId} onValueChange={setFolderParentId}>
              <SelectTrigger><SelectValue placeholder={t('tree.parentLabel')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="root">{t('tree.parentRoot')}</SelectItem>
                {folderOptions.map((folder) => (
                  <SelectItem key={folder.id} value={String(folder.id)}>{folder.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input value={folderPosition} type="number" min={0} placeholder={t('tree.positionPlaceholder')} onChange={(e) => setFolderPosition(e.target.value)} />
          </div>
          <Button disabled={isMutating || !folderTitle.trim()} onClick={() => void handleCreateFolder()}>
            {t('tree.createFolder')}
          </Button>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t('tree.createChallengeNodeTitle')}</h3>
          <Input value={nodeTitle} placeholder={t('tree.challengeNodeTitlePlaceholder')} onChange={(e) => setNodeTitle(e.target.value)} />
          <Input value={nodeChallengeId} type="number" min={1} placeholder={t('tree.challengeIdPlaceholder')} onChange={(e) => setNodeChallengeId(e.target.value)} />
          <div className="grid gap-2 md:grid-cols-2">
            <Select value={nodeParentId} onValueChange={setNodeParentId}>
              <SelectTrigger><SelectValue placeholder={t('tree.parentLabel')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="root">{t('tree.parentRoot')}</SelectItem>
                {folderOptions.map((folder) => (
                  <SelectItem key={folder.id} value={String(folder.id)}>{folder.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input value={nodePosition} type="number" min={0} placeholder={t('tree.positionPlaceholder')} onChange={(e) => setNodePosition(e.target.value)} />
          </div>
          <Button disabled={isMutating || !nodeTitle.trim()} onClick={() => void handleCreateChallengeNode()}>
            {t('tree.createChallengeNode')}
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t('tree.treeTitle')}</h3>
          <Button variant="outline" size="sm" onClick={() => void loadRoot()} disabled={isMutating || treeState.isRootLoading}>
            {t('actions.refresh')}
          </Button>
        </div>

        {treeState.isRootLoading ? <p className="text-sm text-muted-foreground">{t('status.loadingTree')}</p> : null}
        {!treeState.isRootLoading ? (
          <AdminChallengeNodeTree
            locale={locale}
            rootNodes={treeState.rootNodes}
            expandedNodeIds={treeState.expandedNodeIds}
            childrenByParentId={treeState.childrenByParentId}
            isNodeLoadingById={treeState.isNodeLoadingById}
            isMutating={isMutating}
            onToggle={(node) => void expandNode(node)}
            onRename={(nodeId, title) => submitRenameNode(nodeId, title)}
            onMove={(nodeId, parentId) => submitMoveNode(nodeId, parentId)}
            onReorder={(nodeId, position) => submitReorderNode(nodeId, position)}
            onDelete={(nodeId) => submitDeleteNode(nodeId)}
          />
        ) : null}
      </div>
    </div>
  )
}
