## `messages/`

next-intl translation files (i18n).

Files:
- `vi.json` — Vietnamese translations (default locale)
- `en.json` — English translations

Structure:
```json
{
  "navigation": { ... },
  "auth": { ... },
  "course": { ... },
  "common": { ... }
}
```

**Rule**: Organize by domain. Keep keys consistent with features. Use dot notation for nested keys in code.
