import { useCallback } from "react";
import { trpc } from "../trpc";

type BaseRole = {
  level: number;
  canManageInstitution: boolean;
  canManageDocuments: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
};

export const usePermissions = () => {
  const { data: user, isLoading } = trpc.user.getMe.useQuery();

  const highestRoleLevel = user?.roles?.length
    ? Math.min(...user.roles.map((r: BaseRole) => r.level))
    : 4;

  const canManageInstitution =
    user?.roles.some((r: BaseRole) => r.canManageInstitution) ?? false;

  const canManageDocuments =
    canManageInstitution ||
    (user?.roles.some((r: BaseRole) => r.canManageDocuments) ?? false);

  const canManageUsers =
    canManageInstitution ||
    (user?.roles.some((r: BaseRole) => r.canManageUsers) ?? false);

  const canManageRoles =
    canManageInstitution ||
    (user?.roles.some((r: BaseRole) => r.canManageRoles) ?? false);

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
