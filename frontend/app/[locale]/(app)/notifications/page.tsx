import { NotificationsInboxClient } from '@/components/features/notifications/NotificationsInboxClient'

type NotificationsPageProps = {
  params: Promise<{ locale: string }>
}

export default async function NotificationsPage({ params }: NotificationsPageProps) {
  const { locale } = await params
  return <NotificationsInboxClient locale={locale} />
}
