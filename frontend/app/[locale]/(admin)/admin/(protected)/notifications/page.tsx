import { AdminNotificationBroadcastClient } from '@/components/features/notifications/AdminNotificationBroadcastClient'

type AdminNotificationsPageProps = {
  params: Promise<{ locale: string }>
}

export default async function AdminNotificationsPage({ params }: AdminNotificationsPageProps) {
  const { locale } = await params
  return <AdminNotificationBroadcastClient locale={locale} />
}
