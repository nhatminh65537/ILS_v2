/**
 * Admin domain types
 * Derived from DATA_MODEL.md Admin Domain section
 */

export enum ConfigType {
  Bool = 'bool',
  Int = 'int',
  String = 'string',
  Json = 'json',
  Secret = 'secret',
}

/** System configuration entity */
export interface SystemConfig {
  readonly key: string // unique identifier (e.g., "auth.local_login_enabled")
  readonly value: string // raw value
  readonly value_type: ConfigType
  readonly category: string // for grouping (e.g., "auth", "ai")
  readonly is_editable: boolean // can admin change this?
  readonly is_runtime: boolean // takes effect without restart?
  readonly created_at: string
  readonly updated_at: string
}

/** Request/response payloads */
export interface UpdateConfigPayload {
  value: string
}

export interface SystemConfigGrouped {
  readonly category: string
  readonly configs: readonly SystemConfig[]
}

export interface SystemConfigListResponse {
  readonly groups: readonly SystemConfigGrouped[]
}

/**
 * Type-coerced config value
 * Automatically parsed based on value_type
 */
export type ConfigValue = boolean | number | string | Record<string, unknown> | null

export interface ParsedConfig {
  readonly key: string
  readonly value: ConfigValue
  readonly value_type: ConfigType
  readonly category: string
  readonly is_editable: boolean
  readonly is_runtime: boolean
}
