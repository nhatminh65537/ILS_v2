'use client'

import { useCallback, useMemo, useState } from 'react'
import { canManageSystemConfig } from '@/lib/rbac-claim'
import { mapSystemConfigErrorToMessageKey } from '@/lib/system-config-error-map'
import {
  isMaskedSecretValue,
  parseConfigValue,
  validateConfigInput,
} from '@/lib/system-config-value'
import { listPermissions } from '@/services/rbac.service'
import {
  getSystemConfigByKey,
  listSystemConfigs,
  updateSystemConfigValue,
} from '@/services/system-config.service'
import { useAuthStore } from '@/stores/auth.store'
import type {
  SystemConfigDto,
  SystemConfigGroupedMap,
  SystemConfigInputValue,
} from '@/types/admin.types'
import type { PermissionDto, SystemConfigCapabilities } from '@/types/rbac.types'

type ActionResult = {
  success: boolean
  messageKey?: string
}

const EMPTY_CAPABILITIES: SystemConfigCapabilities = {
  canList: false,
  canRetrieve: false,
  canUpdate: false,
  canViewSecret: false,
}

const removeFromRecord = <T,>(record: Record<string, T>, key: string): Record<string, T> => {
  const next = { ...record }
  delete next[key]
  return next
}

const updateConfigInGroups = (
  grouped: SystemConfigGroupedMap,
  updatedConfig: SystemConfigDto
): SystemConfigGroupedMap => {
  const next: Record<string, readonly SystemConfigDto[]> = { ...grouped }

  const currentCategoryItems = next[updatedConfig.category] ?? []
  let found = false

  next[updatedConfig.category] = currentCategoryItems.map((item) => {
    if (item.key !== updatedConfig.key) {
      return item
    }

    found = true
    return updatedConfig
  })

  if (!found) {
    next[updatedConfig.category] = [...currentCategoryItems, updatedConfig]
  }

  return next
}

export const useSystemConfig = () => {
  const accessToken = useAuthStore((state) => state.accessToken)

  const [groupedConfigs, setGroupedConfigs] = useState<SystemConfigGroupedMap>({})
  const [isLoading, setIsLoading] = useState(false)
  const [loadErrorMessageKey, setLoadErrorMessageKey] = useState<string | null>(null)

  const [permissionsCatalog, setPermissionsCatalog] = useState<readonly PermissionDto[]>([])
  const [isLoadingCapabilities, setIsLoadingCapabilities] = useState(false)
  const [capabilitiesErrorMessageKey, setCapabilitiesErrorMessageKey] = useState<string | null>(null)

  const [editingValues, setEditingValues] = useState<Record<string, SystemConfigInputValue>>({})
  const [rowErrorMessageKeys, setRowErrorMessageKeys] = useState<Record<string, string>>({})
  const [revealedSecretValues, setRevealedSecretValues] = useState<Record<string, string>>({})
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set<string>())

  const capabilities = useMemo<SystemConfigCapabilities>(() => {
    if (!accessToken || permissionsCatalog.length === 0) {
      return EMPTY_CAPABILITIES
    }

    return canManageSystemConfig(accessToken, permissionsCatalog)
  }, [accessToken, permissionsCatalog])

  const allConfigs = useMemo(() => {
    return Object.values(groupedConfigs).flat()
  }, [groupedConfigs])

  const categoryOrder = useMemo(() => {
    return Object.keys(groupedConfigs).sort((left, right) => left.localeCompare(right))
  }, [groupedConfigs])

  const loadCapabilities = useCallback(async () => {
    setIsLoadingCapabilities(true)
    setCapabilitiesErrorMessageKey(null)

    try {
      const permissions = await listPermissions(true)
      setPermissionsCatalog(permissions)
    } catch (error) {
      setPermissionsCatalog([])
      setCapabilitiesErrorMessageKey(mapSystemConfigErrorToMessageKey(error))
    } finally {
      setIsLoadingCapabilities(false)
    }
  }, [])

  const loadConfigs = useCallback(async () => {
    setIsLoading(true)
    setLoadErrorMessageKey(null)

    try {
      const grouped = await listSystemConfigs()
      setGroupedConfigs(grouped)
    } catch (error) {
      setLoadErrorMessageKey(mapSystemConfigErrorToMessageKey(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshCategory = useCallback(
    async (category: string) => {
      void category
      await loadConfigs()
    },
    [loadConfigs]
  )

  const startEdit = useCallback((config: SystemConfigDto) => {
    setEditingValues((previous) => ({
      ...previous,
      [config.key]: parseConfigValue(config.value_type, config.value),
    }))
    setRowErrorMessageKeys((previous) => removeFromRecord(previous, config.key))
  }, [])

  const cancelEdit = useCallback((key: string) => {
    setEditingValues((previous) => removeFromRecord(previous, key))
    setRowErrorMessageKeys((previous) => removeFromRecord(previous, key))
  }, [])

  const updateEditValue = useCallback((key: string, value: SystemConfigInputValue) => {
    setEditingValues((previous) => ({ ...previous, [key]: value }))
  }, [])

  const submitUpdate = useCallback(
    async (config: SystemConfigDto): Promise<ActionResult> => {
      if (!config.is_editable) {
        setRowErrorMessageKeys((previous) => ({
          ...previous,
          [config.key]: 'adminConfig.errors.notEditable',
        }))
        return { success: false, messageKey: 'adminConfig.errors.notEditable' }
      }

      const candidateValue =
        editingValues[config.key] ?? parseConfigValue(config.value_type, config.value)
      const validation = validateConfigInput(config, candidateValue)

      if (!validation.isValid) {
        setRowErrorMessageKeys((previous) => ({
          ...previous,
          [config.key]: validation.errorMessageKey,
        }))
        return { success: false, messageKey: validation.errorMessageKey }
      }

      setSavingKeys((previous) => {
        const next = new Set(previous)
        next.add(config.key)
        return next
      })

      try {
        const updated = await updateSystemConfigValue(config.key, {
          value: validation.normalizedValue,
        })

        setGroupedConfigs((previous) => updateConfigInGroups(previous, updated))
        setEditingValues((previous) => removeFromRecord(previous, config.key))
        setRowErrorMessageKeys((previous) => removeFromRecord(previous, config.key))

        if (config.value_type === 'secret') {
          setRevealedSecretValues((previous) => removeFromRecord(previous, config.key))
        }

        return { success: true }
      } catch (error) {
        const messageKey = mapSystemConfigErrorToMessageKey(error)
        setRowErrorMessageKeys((previous) => ({
          ...previous,
          [config.key]: messageKey,
        }))

        return { success: false, messageKey }
      } finally {
        setSavingKeys((previous) => {
          const next = new Set(previous)
          next.delete(config.key)
          return next
        })
      }
    },
    [editingValues]
  )

  const requestSecretReveal = useCallback(
    async (config: SystemConfigDto): Promise<ActionResult> => {
      if (config.value_type !== 'secret') {
        return { success: true }
      }

      if (!capabilities.canViewSecret || !capabilities.canRetrieve) {
        return { success: false, messageKey: 'adminConfig.errors.secretRevealForbidden' }
      }

      setSavingKeys((previous) => {
        const next = new Set(previous)
        next.add(config.key)
        return next
      })

      try {
        const detail = await getSystemConfigByKey(config.key)
        const secretValue = detail.value

        if (typeof secretValue !== 'string' || isMaskedSecretValue(secretValue)) {
          return { success: false, messageKey: 'adminConfig.errors.secretRevealUnavailable' }
        }

        setRevealedSecretValues((previous) => ({
          ...previous,
          [config.key]: secretValue,
        }))

        return { success: true }
      } catch (error) {
        return {
          success: false,
          messageKey: mapSystemConfigErrorToMessageKey(error),
        }
      } finally {
        setSavingKeys((previous) => {
          const next = new Set(previous)
          next.delete(config.key)
          return next
        })
      }
    },
    [capabilities.canRetrieve, capabilities.canViewSecret]
  )

  const isSavingKey = useCallback(
    (key: string): boolean => {
      return savingKeys.has(key)
    },
    [savingKeys]
  )

  return {
    groupedConfigs,
    allConfigs,
    categoryOrder,
    isLoading,
    isLoadingCapabilities,
    loadErrorMessageKey,
    capabilitiesErrorMessageKey,
    capabilities,
    editingValues,
    rowErrorMessageKeys,
    revealedSecretValues,
    loadConfigs,
    loadCapabilities,
    refreshCategory,
    startEdit,
    cancelEdit,
    updateEditValue,
    submitUpdate,
    requestSecretReveal,
    isSavingKey,
  }
}
