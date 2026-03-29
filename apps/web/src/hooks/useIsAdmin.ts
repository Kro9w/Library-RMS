// apps/web/src/hooks/useIsAdmin.ts
import { usePermissions } from "./usePermissions";

/**
 * @deprecated Use usePermissions() instead for granular access control.
 * This hook is maintained for backward compatibility.
 */
export function useIsAdmin() {
  const { canManageRoles, canManageInstitution, isLoading } = usePermissions();

  // Previously, isAdmin arbitrarily meant "canManageRoles" or "isSuperAdmin/canManageInstitution"
  const isAdmin = canManageInstitution || canManageRoles;

  return { isAdmin, isLoading };
}
