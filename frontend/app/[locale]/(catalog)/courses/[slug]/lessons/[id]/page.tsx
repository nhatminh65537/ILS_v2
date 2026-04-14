type Props = {
  params: Promise<{ locale: string; slug: string; id: string }>
}

export default async function LessonViewerPage({ params }: Props) {
  const { slug, id } = await params
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Lesson {id}</h1>
      <p className="text-muted-foreground">Course: {slug} — Coming soon.</p>
    </div>
  )
}
