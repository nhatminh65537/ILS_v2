## `src/components/`

React components organized by responsibility.

Subdirectories:
- `ui/` — Unstyled shadcn components (Button, Input, Modal, etc.) — auto-generated, do not manually edit
- `features/` — Smart components with business logic (CourseCard, ChallengeSubmit, QuizSession, etc.)
- `layouts/` — Layout wrappers and guards (Navbar, Sidebar, Footer, AppShell, UserLayout, AdminLayout, AuthLayout, AdminAccessGate)
- `providers/` — React Context providers (MswProvider, ThemeProvider, i18n wrapper)

**Rule**: UI components are dumb (shadcn). Features are smart (call services, use stores).
