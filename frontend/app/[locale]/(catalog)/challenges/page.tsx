import { ChallengeCatalogClient } from '@/components/features/challenges/ChallengeCatalogClient'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function ChallengeCatalogPage({ params }: Props) {
  const { locale } = await params
  return <ChallengeCatalogClient locale={locale} />
}
