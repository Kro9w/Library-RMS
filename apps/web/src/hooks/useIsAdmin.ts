// apps/web/src/hooks/useIsAdmin.ts
import { usePermissions } from "./usePermissions";

/**
 * @deprecated Use usePermissions() instead for granular access control.
 * This hook is maintained for backward compatibility.
 */
export function useIsAdmin() {
  const { canManageRoles, isSuperAdmin, isLoading } = usePermissions();

  // Previously, isAdmin arbitrarily meant "canManageRoles" or "isSuperAdmin"
  const isAdmin = isSuperAdmin || canManageRoles;

  return { isAdmin, isLoading };
}
