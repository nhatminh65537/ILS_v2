'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SystemConfigDto } from '@/types/admin.types'

type SystemConfigCategoryGroup = {
  category: string
  configs: readonly SystemConfigDto[]
}

type SystemConfigCategoryAccordionProps = {
  groups: readonly SystemConfigCategoryGroup[]
  emptyMessage: string
  renderRow: (config: SystemConfigDto) => React.ReactNode
}

export function SystemConfigCategoryAccordion({
  groups,
  emptyMessage,
  renderRow,
}: SystemConfigCategoryAccordionProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  if (groups.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <section className="space-y-3">
      {groups.map((group) => {
        const isExpanded = expandedCategories[group.category] ?? true

        return (
          <Card key={group.category}>
            <CardHeader className="pb-2">
              <CardTitle>
                <Button
                  className="w-full justify-between"
                  onClick={() => {
                    setExpandedCategories((previous) => {
                      return {
                        ...previous,
                        [group.category]: !isExpanded,
                      }
                    })
                  }}
                  type="button"
                  variant="ghost"
                >
                  <span className="text-left text-sm font-semibold">{group.category}</span>
                  <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    {group.configs.length}
                    {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </span>
                </Button>
              </CardTitle>
            </CardHeader>

            {isExpanded ? <CardContent className="space-y-3">{group.configs.map(renderRow)}</CardContent> : null}
          </Card>
        )
      })}
    </section>
  )
}
