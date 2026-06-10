'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'ils-theme'

type ThemeContextValue = {
  /** The user's preference (may be 'system'). */
  theme: ThemePreference
  /** The actually-applied theme after resolving 'system'. */
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'system' || value === 'light' || value === 'dark'

const readStoredTheme = (): ThemePreference => {
  if (typeof window === 'undefined') return 'system'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return isThemePreference(stored) ? stored : 'system'
}

// ── system (prefers-color-scheme) as an external store ──────────────────────
const subscribeToSystem = (callback: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => undefined
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}
const getSystemIsDark = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
const getSystemServerSnapshot = (): boolean => false

const applyThemeClass = (resolved: 'light' | 'dark'): void => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

/**
 * Minimal theme provider (no next-themes dependency). shadcn ships the `.dark`
 * CSS variables in globals.css but nothing toggles the class — this provider
 * does. Pair it with `ThemeNoFlashScript` in <body> to avoid a light flash on
 * first paint. `system` is resolved against `prefers-color-scheme` via
 * useSyncExternalStore, so OS changes are picked up automatically.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lazy init from storage (guarded for SSR) — no setState-in-effect needed.
  const [theme, setThemeState] = useState<ThemePreference>(() => readStoredTheme())
  const systemIsDark = useSyncExternalStore(
    subscribeToSystem,
    getSystemIsDark,
    getSystemServerSnapshot
  )

  const resolvedTheme: 'light' | 'dark' =
    theme === 'system' ? (systemIsDark ? 'dark' : 'light') : theme

  // Sync the DOM class with the resolved theme (DOM is an external system, so
  // this effect is the correct place for it).
  useEffect(() => {
    applyThemeClass(resolvedTheme)
  }, [resolvedTheme])

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next)
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}

/**
 * Inline, blocking script that applies the stored theme class before React
 * hydrates, so users who chose dark mode don't see a white flash. Rendered
 * once in <body>. Reads the same `ils-theme` key as ThemeProvider.
 */
export function ThemeNoFlashScript() {
  const script = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');var d=t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
