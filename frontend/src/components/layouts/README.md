## `src/components/layouts/`

Layout wrapper components for page structure.

Files:
- `types.ts` — Shared layout nav item type contracts
- `Navbar.tsx` — Surface top navigation bar
- `Sidebar.tsx` — Surface sidebar navigation container
- `Footer.tsx` — Surface footer block
- `AppShell.tsx` — Shared shell composition (Navbar + Sidebar + content + Footer)
- `UserLayout.tsx` — User surface shell wrapper
- `AdminLayout.tsx` — Admin surface shell wrapper
- `AuthLayout.tsx` — Shared auth wrapper for user/admin login surfaces
- `AdminAccessGate.tsx` — Client-side admin access gate for protected admin surface routes

**Rule**: Shell layout wrappers are primarily UI containers; guard components may use minimal auth state for access control.
