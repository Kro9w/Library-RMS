import { trpc } from "../trpc";

export const usePermissions = () => {
  const { data: user, isLoading } = trpc.user.getMe.useQuery();

  // Defines a minimal role type to avoid using explicit 'any'
  type BaseRole = {
    level: number;
    canManageInstitution: boolean;
    canManageDocuments: boolean;
    canManageUsers: boolean;
    canManageRoles: boolean;
  };

  const highestRoleLevel = user?.roles?.length 
    ? Math.min(...user.roles.map((r: BaseRole) => r.level))
    : 4;

  const canManageInstitution = user?.roles.some((r: BaseRole) => r.canManageInstitution) ?? false;
  const canManageDocuments = canManageInstitution || (user?.roles.some((r: BaseRole) => r.canManageDocuments) ?? false);
  const canManageUsers = canManageInstitution || (user?.roles.some((r: BaseRole) => r.canManageUsers) ?? false);
  const canManageRoles = canManageInstitution || (user?.roles.some((r: BaseRole) => r.canManageRoles) ?? false);

  const isUploader = (uploaderId: string | null | undefined): boolean => {
    if (!user || !uploaderId) return false;
    return user.id === uploaderId;
  };

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
