import { trpc } from "../trpc";

export const usePermissions = () => {
  const { data: user, isLoading } = trpc.user.getMe.useQuery();

  const isSuperAdmin = user?.isSuperAdmin ?? false;
  const canManageDocuments = isSuperAdmin || (user?.roles.some((r) => r.canManageDocuments) ?? false);
  const canManageUsers = isSuperAdmin || (user?.roles.some((r) => r.canManageUsers) ?? false);
  const canManageRoles = isSuperAdmin || (user?.roles.some((r) => r.canManageRoles) ?? false);

  const isUploader = (uploaderId: string | null | undefined): boolean => {
    if (!user || !uploaderId) return false;
    return user.id === uploaderId;
  };

  return {
    isSuperAdmin,
    canManageDocuments,
    canManageUsers,
    canManageRoles,
    isUploader,
    user,
    isLoading,
  };
};
