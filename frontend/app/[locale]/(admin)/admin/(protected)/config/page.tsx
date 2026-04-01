import { SystemConfigPageClient } from '@/components/features/admin-config/SystemConfigPageClient'

type AdminConfigPageProps = {
  params: Promise<{ locale: string }>
}

export default async function AdminConfigPage({ params }: AdminConfigPageProps) {
  const { locale } = await params
  return <SystemConfigPageClient locale={locale} />
}
