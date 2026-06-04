'use client'

import { Folder } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

type QuizFolderCardProps = {
  title: string
  onOpen: () => void
}

export function QuizFolderCard({ title, onOpen }: QuizFolderCardProps) {
  return (
    <button type="button" onClick={onOpen} className="group block w-full text-left">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardContent className="flex items-center gap-3 p-4">
          <Folder className="h-6 w-6 shrink-0 text-amber-500" />
          <span className="truncate font-medium group-hover:underline">{title}</span>
        </CardContent>
      </Card>
    </button>
  )
}
