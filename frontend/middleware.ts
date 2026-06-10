import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

// next-intl locale routing. Next.js only auto-loads `middleware.ts` at the
// project root (the previous `proxy.ts` was never picked up), so locale
// prefixing / negotiation only works now that this file is here.
export default createMiddleware(routing)

export const config = {
  // Skip API, Next internals and any file with an extension.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
