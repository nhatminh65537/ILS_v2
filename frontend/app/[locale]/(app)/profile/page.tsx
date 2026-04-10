import { redirect } from 'next/navigation'

type ProfilePageProps = {
  params: Promise<{ locale: string }>
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params
  redirect(`/${locale}/profile/settings`)
}
