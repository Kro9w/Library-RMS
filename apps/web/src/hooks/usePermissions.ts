import { trpc } from "../trpc";

export const usePermissions = () => {
  const { data: user, isLoading } = trpc.user.getMe.useQuery();

  const canManageDocuments = user?.roles.some((r: { canManageDocuments: any; }) => r.canManageDocuments) ?? false;
  
  const isUploader = (uploaderId: string | null | undefined): boolean => {
    if (!user || !uploaderId) return false;
    return user.id === uploaderId;
  };

  return {
    canManageDocuments,
    isUploader,
    user,
    isLoading,
  };
};
