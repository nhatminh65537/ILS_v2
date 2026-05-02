'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Challenge, ChallengeCategory, ChallengeTag, CreateChallengePayload, UpdateChallengePayload } from '@/types/challenge.types'
import { AdminChallengeForm } from './AdminChallengeForm'

type AdminChallengeMetadataTabProps = {
  challenge: Challenge
  categories: ChallengeCategory[]
  tags: ChallengeTag[]
  isSubmitting: boolean
  onSubmit: (payload: CreateChallengePayload | UpdateChallengePayload) => Promise<boolean>
}

export function AdminChallengeMetadataTab({
  challenge,
  categories,
  tags,
  isSubmitting,
  onSubmit,
}: AdminChallengeMetadataTabProps) {
  const t = useTranslations('adminChallenges')
  const [saveMessageVisible, setSaveMessageVisible] = useState(false)

  const handleSubmit = async (payload: CreateChallengePayload | UpdateChallengePayload) => {
    const ok = await onSubmit(payload)
    setSaveMessageVisible(ok)
  }

  return (
    <div className="space-y-3">
      {saveMessageVisible ? <p className="text-sm text-green-700">{t('status.saved')}</p> : null}
      <AdminChallengeForm
        mode="edit"
        initialChallenge={challenge}
        categories={categories}
        tags={tags}
        isSubmitting={isSubmitting}
        submitLabel={t('actions.save')}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
