/**
 * Admin domain types
 * Derived from the active backend contract in docs/API.md section 3.9
 */

export type ConfigType = 'bool' | 'int' | 'string' | 'json' | 'secret'

export type JsonValue = Record<string, unknown> | readonly unknown[]

export type SystemConfigValue = boolean | number | string | JsonValue

export interface SystemConfigDto {
  readonly id: number
  readonly key: string
  readonly value: SystemConfigValue
  readonly value_type: ConfigType
  readonly category: string
  readonly description: string
  readonly is_editable: boolean
  readonly is_runtime: boolean
}

export type SystemConfigGroupedMap = Record<string, readonly SystemConfigDto[]>

export interface UpdateConfigPayload {
  value: SystemConfigValue
}

export type SystemConfigInputValue = string | boolean
