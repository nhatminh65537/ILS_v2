type Props = {
  params: Promise<{ locale: string; id: string }>
}

export default async function AdminLessonEditorPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Lesson Editor: {id}</h1>
      <p className="text-muted-foreground">Coming soon.</p>
    </div>
  )
}
