// apps/web/src/hooks/useIsAdmin.ts
import { trpc } from "../trpc";

export function useIsAdmin() {
  const { data: user, isLoading } = trpc.user.getMe.useQuery();

  const isAdmin =
    user?.roles.some(
      (role) =>
        role.canManageRoles
    ) || false;

  return { isAdmin, isLoading };
}
