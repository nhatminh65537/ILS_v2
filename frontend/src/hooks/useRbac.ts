'use client'

import { useCallback, useMemo, useState } from 'react'
import { mapRbacErrorToMessageKey } from '@/lib/rbac-error-map'
import {
  assignPermissionToRole,
  assignRoleToUser,
  createRole,
  deleteRole,
  getRolePermissions,
  getUserRoles,
  listPermissions,
  listRoles,
  revokePermissionFromRole,
  revokeRoleFromUser,
  updateRole,
} from '@/services/rbac.service'
import type {
  ActionResult,
  PermissionDto,
  RbacListState,
  RoleDto,
  RoleUpsertPayload,
  UserRoleMappingDto,
} from '@/types/rbac.types'

const EMPTY_ROLE_STATE: RbacListState<RoleDto> = {
  data: [],
  isLoading: false,
  errorMessageKey: null,
}

const EMPTY_PERMISSION_STATE: RbacListState<PermissionDto> = {
  data: [],
  isLoading: false,
  errorMessageKey: null,
}

const EMPTY_USER_ROLE_STATE: RbacListState<UserRoleMappingDto> = {
  data: [],
  isLoading: false,
  errorMessageKey: null,
}

export const useRbac = () => {
  const [rolesState, setRolesState] = useState<RbacListState<RoleDto>>(EMPTY_ROLE_STATE)
  const [permissionsState, setPermissionsState] = useState<RbacListState<PermissionDto>>(
    EMPTY_PERMISSION_STATE
  )
  const [userRolesState, setUserRolesState] = useState<RbacListState<UserRoleMappingDto>>(
    EMPTY_USER_ROLE_STATE
  )
  const [rolePermissions, setRolePermissions] = useState<readonly PermissionDto[]>([])
  const [isMutating, setIsMutating] = useState(false)

  const loadRoles = useCallback(async () => {
    setRolesState((state) => ({ ...state, isLoading: true, errorMessageKey: null }))
    try {
      const data = await listRoles()
      setRolesState({ data, isLoading: false, errorMessageKey: null })
    } catch (error) {
      setRolesState((state) => ({
        ...state,
        isLoading: false,
        errorMessageKey: mapRbacErrorToMessageKey(error, 'adminRbac.errors.loadRolesFailed'),
      }))
    }
  }, [])

  const loadPermissions = useCallback(async (includeInactive = false) => {
    setPermissionsState((state) => ({ ...state, isLoading: true, errorMessageKey: null }))
    try {
      const data = await listPermissions(includeInactive)
      setPermissionsState({ data, isLoading: false, errorMessageKey: null })
    } catch (error) {
      setPermissionsState((state) => ({
        ...state,
        isLoading: false,
        errorMessageKey: mapRbacErrorToMessageKey(error, 'adminRbac.errors.loadPermissionsFailed'),
      }))
    }
  }, [])

  const loadRolePermissions = useCallback(async (roleId: number): Promise<ActionResult> => {
    try {
      const data = await getRolePermissions(roleId)
      setRolePermissions(data)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        messageKey: mapRbacErrorToMessageKey(error, 'adminRbac.errors.loadRolePermissionsFailed'),
      }
    }
  }, [])

  const loadUserRoles = useCallback(async (userId: number) => {
    setUserRolesState((state) => ({ ...state, isLoading: true, errorMessageKey: null }))
    try {
      const data = await getUserRoles(userId)
      setUserRolesState({ data, isLoading: false, errorMessageKey: null })
    } catch (error) {
      setUserRolesState((state) => ({
        ...state,
        isLoading: false,
        errorMessageKey: mapRbacErrorToMessageKey(error, 'adminRbac.errors.loadUserRolesFailed'),
      }))
    }
  }, [])

  const submitCreateRole = useCallback(async (payload: RoleUpsertPayload): Promise<ActionResult> => {
    try {
      setIsMutating(true)
      await createRole(payload)
      await loadRoles()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        messageKey: mapRbacErrorToMessageKey(error, 'adminRbac.errors.createRoleFailed'),
      }
    } finally {
      setIsMutating(false)
    }
  }, [loadRoles])

  const submitUpdateRole = useCallback(
    async (roleId: number, payload: RoleUpsertPayload): Promise<ActionResult> => {
      try {
        setIsMutating(true)
        await updateRole(roleId, payload)
        await loadRoles()
        return { success: true }
      } catch (error) {
        return {
          success: false,
          messageKey: mapRbacErrorToMessageKey(error, 'adminRbac.errors.updateRoleFailed'),
        }
      } finally {
        setIsMutating(false)
      }
    },
    [loadRoles]
  )

  const submitDeleteRole = useCallback(
    async (roleId: number): Promise<ActionResult> => {
      try {
        setIsMutating(true)
        await deleteRole(roleId)
        await loadRoles()
        return { success: true }
      } catch (error) {
        return {
          success: false,
          messageKey: mapRbacErrorToMessageKey(error, 'adminRbac.errors.deleteRoleFailed'),
        }
      } finally {
        setIsMutating(false)
      }
    },
    [loadRoles]
  )

  const submitAssignPermission = useCallback(
    async (roleId: number, permissionId: number): Promise<ActionResult> => {
      try {
        setIsMutating(true)
        await assignPermissionToRole(roleId, { permission_id: permissionId })
        await loadRolePermissions(roleId)
        await loadRoles()
        return { success: true }
      } catch (error) {
        return {
          success: false,
          messageKey: mapRbacErrorToMessageKey(error, 'adminRbac.errors.assignPermissionFailed'),
        }
      } finally {
        setIsMutating(false)
      }
    },
    [loadRolePermissions, loadRoles]
  )

  const submitRevokePermission = useCallback(
    async (roleId: number, permissionId: number): Promise<ActionResult> => {
      try {
        setIsMutating(true)
        await revokePermissionFromRole(roleId, permissionId)
        await loadRolePermissions(roleId)
        await loadRoles()
        return { success: true }
      } catch (error) {
        return {
          success: false,
          messageKey: mapRbacErrorToMessageKey(error, 'adminRbac.errors.revokePermissionFailed'),
        }
      } finally {
        setIsMutating(false)
      }
    },
    [loadRolePermissions, loadRoles]
  )

  const submitAssignUserRole = useCallback(
    async (userId: number, roleId: number): Promise<ActionResult> => {
      try {
        setIsMutating(true)
        await assignRoleToUser(userId, { role_id: roleId })
        await loadUserRoles(userId)
        return { success: true }
      } catch (error) {
        return {
          success: false,
          messageKey: mapRbacErrorToMessageKey(error, 'adminRbac.errors.assignUserRoleFailed'),
        }
      } finally {
        setIsMutating(false)
      }
    },
    [loadUserRoles]
  )

  const submitRevokeUserRole = useCallback(
    async (userId: number, roleId: number): Promise<ActionResult> => {
      try {
        setIsMutating(true)
        await revokeRoleFromUser(userId, roleId)
        await loadUserRoles(userId)
        return { success: true }
      } catch (error) {
        return {
          success: false,
          messageKey: mapRbacErrorToMessageKey(error, 'adminRbac.errors.revokeUserRoleFailed'),
        }
      } finally {
        setIsMutating(false)
      }
    },
    [loadUserRoles]
  )

  const activePermissions = useMemo(
    () => permissionsState.data.filter((permission) => permission.is_active),
    [permissionsState.data]
  )

  return {
    rolesState,
    permissionsState,
    userRolesState,
    rolePermissions,
    isMutating,
    activePermissions,
    loadRoles,
    loadPermissions,
    loadRolePermissions,
    loadUserRoles,
    submitCreateRole,
    submitUpdateRole,
    submitDeleteRole,
    submitAssignPermission,
    submitRevokePermission,
    submitAssignUserRole,
    submitRevokeUserRole,
  }
}
