import { useCallback, useMemo } from "react";
import { trpc } from "../trpc";

// Defines a minimal role type to avoid using explicit 'any'
type BaseRole = {
  level: number;
  canManageInstitution: boolean;
  canManageDocuments: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
};

export const usePermissions = () => {
  const { data: user, isLoading } = trpc.user.getMe.useQuery();

  const highestRoleLevel = useMemo(() => {
    return user?.roles?.length 
      ? Math.min(...user.roles.map((r: BaseRole) => r.level))
      : 4;
  }, [user?.roles]);

  const canManageInstitution = useMemo(() => {
    return user?.roles.some((r: BaseRole) => r.canManageInstitution) ?? false;
  }, [user?.roles]);

  const canManageDocuments = useMemo(() => {
    return canManageInstitution || (user?.roles.some((r: BaseRole) => r.canManageDocuments) ?? false);
  }, [canManageInstitution, user?.roles]);

  const canManageUsers = useMemo(() => {
    return canManageInstitution || (user?.roles.some((r: BaseRole) => r.canManageUsers) ?? false);
  }, [canManageInstitution, user?.roles]);

  const canManageRoles = useMemo(() => {
    return canManageInstitution || (user?.roles.some((r: BaseRole) => r.canManageRoles) ?? false);
  }, [canManageInstitution, user?.roles]);

  const isUploader = useCallback(
    (uploaderId: string | null | undefined): boolean => {
      if (!user || !uploaderId) return false;
      return user.id === uploaderId;
    },
    [user]
  );

  return {
    highestRoleLevel,
    canManageInstitution,
    canManageDocuments,
    canManageUsers,
    canManageRoles,
    isUploader,
    user,
    isLoading,
  };
};
