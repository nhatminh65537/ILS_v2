'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { AdminLearnCourseMutationPayload, Course, CourseCategory, CourseTag } from '@/types/course.types'
import { AdminLearnCourseForm } from './AdminLearnCourseForm'

type AdminLearnMetadataTabProps = {
  course: Course
  categories: CourseCategory[]
  tags: CourseTag[]
  isSubmitting: boolean
  onSubmit: (payload: AdminLearnCourseMutationPayload) => Promise<boolean>
}

export function AdminLearnMetadataTab({
  course,
  categories,
  tags,
  isSubmitting,
  onSubmit,
}: AdminLearnMetadataTabProps) {
  const t = useTranslations('adminLearn')
  const [saveMessageVisible, setSaveMessageVisible] = useState(false)

  const handleSubmit = async (payload: AdminLearnCourseMutationPayload) => {
    const ok = await onSubmit(payload)
    setSaveMessageVisible(ok)
  }

  return (
    <div className="space-y-3">
      {saveMessageVisible ? <p className="text-sm text-green-700">{t('status.saved')}</p> : null}
      <AdminLearnCourseForm
        mode="edit"
        initialCourse={course}
        categories={categories}
        tags={tags}
        isSubmitting={isSubmitting}
        submitLabel={t('actions.save')}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
