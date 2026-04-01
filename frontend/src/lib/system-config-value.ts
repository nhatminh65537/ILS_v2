import type {
  ConfigType,
  JsonValue,
  SystemConfigDto,
  SystemConfigInputValue,
  SystemConfigValue,
} from '@/types/admin.types'

type ValidationSuccess = {
  isValid: true
  normalizedValue: SystemConfigValue
}

type ValidationFailure = {
  isValid: false
  errorMessageKey: string
}

export type ConfigValidationResult = ValidationSuccess | ValidationFailure

const isJsonContainer = (value: unknown): value is JsonValue => {
  if (Array.isArray(value)) {
    return true
  }

  return typeof value === 'object' && value !== null
}

export const isMaskedSecretValue = (value: unknown): boolean => value === '***'

export const parseConfigValue = (
  valueType: ConfigType,
  value: SystemConfigValue
): SystemConfigInputValue => {
  if (valueType === 'bool') {
    if (typeof value === 'boolean') {
      return value
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (normalized === 'true') {
        return true
      }

      if (normalized === 'false') {
        return false
      }
    }

    return Boolean(value)
  }

  if (valueType === 'json') {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

export const serializeConfigValue = (
  valueType: ConfigType,
  rawInput: SystemConfigInputValue
): ConfigValidationResult => {
  if (valueType === 'bool') {
    if (typeof rawInput !== 'boolean') {
      return { isValid: false, errorMessageKey: 'adminConfig.errors.invalidBoolean' }
    }
    return { isValid: true, normalizedValue: rawInput }
  }

  if (valueType === 'int') {
    const asText = typeof rawInput === 'string' ? rawInput.trim() : ''
    if (!asText) {
      return { isValid: false, errorMessageKey: 'adminConfig.errors.invalidInteger' }
    }

    const parsed = Number(asText)
    if (!Number.isInteger(parsed)) {
      return { isValid: false, errorMessageKey: 'adminConfig.errors.invalidInteger' }
    }

    return { isValid: true, normalizedValue: parsed }
  }

  if (valueType === 'string' || valueType === 'secret') {
    if (typeof rawInput !== 'string') {
      return { isValid: false, errorMessageKey: 'adminConfig.errors.invalidString' }
    }

    return { isValid: true, normalizedValue: rawInput }
  }

  if (valueType === 'json') {
    if (typeof rawInput !== 'string') {
      return { isValid: false, errorMessageKey: 'adminConfig.errors.invalidJson' }
    }

    try {
      const parsed = JSON.parse(rawInput)
      if (!isJsonContainer(parsed)) {
        return { isValid: false, errorMessageKey: 'adminConfig.errors.invalidJson' }
      }

      return { isValid: true, normalizedValue: parsed }
    } catch {
      return { isValid: false, errorMessageKey: 'adminConfig.errors.invalidJson' }
    }
  }

  return { isValid: false, errorMessageKey: 'adminConfig.errors.invalidType' }
}

export const validateConfigInput = (
  config: SystemConfigDto,
  rawInput: SystemConfigInputValue
): ConfigValidationResult => {
  return serializeConfigValue(config.value_type, rawInput)
}
