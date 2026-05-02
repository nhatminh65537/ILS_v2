import { AdminChallengeEditorPageClient } from '@/components/features/challenges/admin/AdminChallengeEditorPageClient'

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

export default async function AdminChallengeEditorPage({ params }: Props) {
  const { locale, slug } = await params
  return <AdminChallengeEditorPageClient locale={locale} slug={slug} />
}
