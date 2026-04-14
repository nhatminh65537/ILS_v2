type Props = {
  params: Promise<{ locale: string; slug: string }>
}

export default async function AdminChallengeFlagsPage({ params }: Props) {
  const { slug } = await params
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Flag Management: {slug}</h1>
      <p className="text-muted-foreground">Coming soon.</p>
    </div>
  )
}
