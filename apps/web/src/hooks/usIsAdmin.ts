// apps/web/src/hooks/usIsAdmin.ts
import { trpc } from "../trpc";

export function useIsAdmin() {
  const { data: user, isLoading } = trpc.user.getMe.useQuery();

  const isAdmin =
    user?.roles.some(
      (role: { canManageRoles: boolean }) =>
        role.canManageRoles
    ) || false;

  return { isAdmin, isLoading };
}
