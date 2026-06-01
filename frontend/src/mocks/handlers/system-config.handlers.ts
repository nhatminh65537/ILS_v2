import { http, HttpResponse } from 'msw'
import { hasPermission } from '@/mocks/handlers/admin-permissions'
import { notFound } from '@/mocks/handlers/shared'
import type { ConfigType, SystemConfigDto, SystemConfigGroupedMap, SystemConfigValue } from '@/types/admin.types'

type SystemConfigRecord = {
  id: number
  key: string
  value: SystemConfigValue
  value_type: ConfigType
  category: string
  description: string
  is_editable: boolean
  is_runtime: boolean
}

const configs: SystemConfigRecord[] = [
  {
    id: 1,
    key: 'auth.local_login_enabled',
    value: true,
    value_type: 'bool',
    category: 'auth',
    description: 'Enable local username/password authentication.',
    is_editable: true,
    is_runtime: true,
  },
  {
    id: 2,
    key: 'auth.sso_enabled',
    value: false,
    value_type: 'bool',
    category: 'auth',
    description: 'Enable Authentik single sign-on flow.',
    is_editable: true,
    is_runtime: true,
  },
  {
    id: 3,
    key: 'auth.authorization_enabled',
    value: true,
    value_type: 'bool',
    category: 'auth',
    description: 'Toggle RBAC enforcement for API endpoints.',
    is_editable: true,
    is_runtime: true,
  },
  {
    id: 4,
    key: 'challenge.deploy.max_concurrent',
    value: 3,
    value_type: 'int',
    category: 'challenge',
    description: 'Maximum number of concurrent challenge deployments.',
    is_editable: true,
    is_runtime: true,
  },
  {
    id: 5,
    key: 'challenge.deploy.server_url',
    value: 'https://deploy.ils.local',
    value_type: 'string',
    category: 'challenge',
    description: 'Deployment backend endpoint for challenge instances.',
    is_editable: false,
    is_runtime: true,
  },
  {
    id: 6,
    key: 'outline.sync.options',
    value: { timeout_seconds: 30, retry_count: 2 },
    value_type: 'json',
    category: 'learn',
    description: 'Outline sync runtime options.',
    is_editable: true,
    is_runtime: true,
  },
  {
    id: 7,
    key: 'outline.api_token',
    value: 'outline-secret-token',
    value_type: 'secret',
    category: 'learn',
    description: 'API token used for Outline integration.',
    is_editable: true,
    is_runtime: true,
  },
]

const resolveAccessToken = (request: Request): string | null => {
  const raw = request.headers.get('Authorization')
  if (!raw || !raw.startsWith('Bearer ')) {
    return null
  }
  return raw.slice('Bearer '.length)
}

const unauthorized = () => HttpResponse.json({ detail: 'Authentication credentials were not provided.' }, { status: 401 })
const forbidden = () => HttpResponse.json({ detail: 'Permission denied.' }, { status: 403 })

const requirePermission = (
  request: Request,
  permissions: readonly string[]
): { ok: true; accessToken: string } | { ok: false; response: Response } => {
  const accessToken = resolveAccessToken(request)
  if (!accessToken) {
    return { ok: false, response: unauthorized() }
  }

  const isGranted = permissions.some((permission) => hasPermission(accessToken, permission))
  if (!isGranted) {
    return { ok: false, response: forbidden() }
  }

  return { ok: true, accessToken }
}

const serializeConfig = (
  record: SystemConfigRecord,
  options?: { maskSecret?: boolean }
): SystemConfigDto => ({
  id: record.id,
  key: record.key,
  value: options?.maskSecret && record.value_type === 'secret' ? '***' : record.value,
  value_type: record.value_type,
  category: record.category,
  description: record.description,
  is_editable: record.is_editable,
  is_runtime: record.is_runtime,
})

const toGroupedResponse = (items: readonly SystemConfigRecord[]): SystemConfigGroupedMap => {
  const grouped: SystemConfigGroupedMap = {}

  for (const item of items) {
    const category = item.category || 'uncategorized'
    const list = grouped[category] ?? []
    grouped[category] = [...list, serializeConfig(item, { maskSecret: true })]
  }

  return grouped
}

const validateValueType = (valueType: ConfigType, value: unknown): string | null => {
  if (valueType === 'bool' && typeof value !== 'boolean') {
    return 'Value must be a boolean'
  }

  if (valueType === 'int' && !Number.isInteger(value)) {
    return 'Value must be an integer'
  }

  if ((valueType === 'string' || valueType === 'secret') && typeof value !== 'string') {
    return 'Value must be a string'
  }

  if (valueType === 'json' && (typeof value !== 'object' || value === null)) {
    return 'Value must be a JSON object or array'
  }

  return null
}

export const systemConfigHandlers = [
  http.get('*/api/admin/config/', ({ request }) => {
    const auth = requirePermission(request, ['api.system_config.list'])
    if (!auth.ok) {
      return auth.response
    }

    return HttpResponse.json(toGroupedResponse(configs))
  }),

  http.get('*/api/admin/config/:key/reveal/', ({ request, params }) => {
    const auth = requirePermission(request, ['system.config.read_secret'])
    if (!auth.ok) {
      return auth.response
    }

    const configKey = decodeURIComponent(String(params.key))
    const config = configs.find((item) => item.key === configKey)
    if (!config) {
      return notFound('Not found')
    }

    // Reveal endpoint returns the real (unmasked) value once the caller is
    // authorized via system.config.read_secret.
    return HttpResponse.json(serializeConfig(config, { maskSecret: false }))
  }),

  http.get('*/api/admin/config/:key/', ({ request, params }) => {
    const auth = requirePermission(request, ['api.system_config.retrieve'])
    if (!auth.ok) {
      return auth.response
    }

    const configKey = decodeURIComponent(String(params.key))
    const config = configs.find((item) => item.key === configKey)
    if (!config) {
      return notFound('Not found')
    }

    // Secrets are always masked on the normal retrieve path; use the dedicated
    // reveal endpoint (gated by system.config.read_secret) to read real values.
    return HttpResponse.json(
      serializeConfig(config, {
        maskSecret: config.value_type === 'secret',
      })
    )
  }),

  http.patch('*/api/admin/config/:key/', async ({ request, params }) => {
    const auth = requirePermission(request, ['api.system_config.partial_update', 'api.system_config.update'])
    if (!auth.ok) {
      return auth.response
    }

    const configKey = decodeURIComponent(String(params.key))
    const config = configs.find((item) => item.key === configKey)
    if (!config) {
      return notFound('Not found')
    }

    if (!config.is_editable) {
      return HttpResponse.json({ detail: 'Config is not editable' }, { status: 403 })
    }

    const payload = (await request.json()) as { value?: unknown }
    const validationError = validateValueType(config.value_type, payload.value)
    if (validationError) {
      return HttpResponse.json({ detail: validationError }, { status: 400 })
    }

    config.value = payload.value as SystemConfigValue

    return HttpResponse.json(serializeConfig(config, { maskSecret: config.value_type === 'secret' }))
  }),
]
