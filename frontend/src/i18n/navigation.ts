import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

// Locale-aware navigation wrappers (Link, useRouter, usePathname, redirect).
// Using these keeps the active locale in the URL when navigating, so a language
// change in settings can switch the locale segment via router.replace.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
