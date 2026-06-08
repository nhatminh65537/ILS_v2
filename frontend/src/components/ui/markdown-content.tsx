'use client'

import { useEffect, useState } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import apiClient from '@/lib/axios'
import { cn } from '@/lib/utils'

import 'katex/dist/katex.min.css'

type MarkdownContentProps = {
  content: string
  /** Extra classes applied to the wrapping <article>. */
  className?: string
}

// Outline images are served by our own authenticated backend proxy. Those URLs
// must be loaded through axios (cross-origin API base + Bearer token) rather
// than a bare <img src>, which the browser would fetch unauthenticated and
// against the frontend origin. Any other image src is rendered as-is.
const OUTLINE_PROXY_RE = /\/api\/learn\/lessons\/\d+\/outline-attachment\//

/** Loads an authenticated image through axios and renders it as a blob URL. */
function OutlineProxyImage({ src, alt }: { src: string; alt?: string }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    let revoked = false
    let createdUrl: string | null = null
    apiClient
      .get(src, { responseType: 'blob' })
      .then((res) => {
        if (revoked) return
        createdUrl = URL.createObjectURL(res.data as Blob)
        setObjectUrl(createdUrl)
      })
      .catch(() => {
        /* leave broken-image fallback */
      })
    return () => {
      revoked = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [src])

  // eslint-disable-next-line @next/next/no-img-element
  return objectUrl ? <img src={objectUrl} alt={alt ?? ''} /> : <span aria-label={alt} />
}

const markdownComponents: Components = {
  img({ src, alt }) {
    const url = typeof src === 'string' ? src : ''
    if (url && OUTLINE_PROXY_RE.test(url)) {
      return <OutlineProxyImage src={url} alt={alt} />
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt ?? ''} />
  },
}

/**
 * Shared markdown renderer used for lesson bodies and challenge descriptions.
 *
 * Plugins:
 * - remark-gfm: tables, strikethrough, task lists, autolinks
 * - remark-math + rehype-katex: inline `$...$` and block `$$...$$` LaTeX
 * - rehype-highlight: syntax highlighting for fenced code blocks
 *
 * Outline-proxied images are fetched through the authenticated API client.
 * KaTeX CSS is imported here so any caller picks up math styling automatically.
 */
export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <article className={cn('prose prose-lesson max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </article>
  )
}
