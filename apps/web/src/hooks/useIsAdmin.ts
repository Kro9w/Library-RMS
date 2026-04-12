import { usePermissions } from "./usePermissions";

export function useIsAdmin() {
  const { canManageRoles, canManageInstitution, isLoading } = usePermissions();

  const isAdmin = canManageInstitution || canManageRoles;

  return { isAdmin, isLoading };
}
