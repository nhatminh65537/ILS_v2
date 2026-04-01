import { redirect } from 'next/navigation'

type AdminEntryPageProps = {
  params: Promise<{ locale: string }>
}

export default async function AdminEntryPage({ params }: AdminEntryPageProps) {
  const { locale } = await params
  redirect(`/${locale}/admin/login`)
}
