import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type ProfilePageProps = {
  params: Promise<{ locale: string }>
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params
  const tNav = await getTranslations('navigation')

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold md:text-4xl">{tNav('profile')}</h1>
        <p className="text-sm text-muted-foreground">/{locale}/profile</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{tNav('profile')}</CardTitle>
          <CardDescription>Profile surface placeholder for Slice 8 details.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Basic route is now available for navbar avatar dropdown navigation.
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
