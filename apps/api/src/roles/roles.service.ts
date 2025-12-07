
// apps/api/src/roles/roles.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async createRole(data: { name: string; canManageUsers?: boolean; canManageRoles?: boolean; canManageDocuments?: boolean, organizationId: string }, userId: string): Promise<Role> {
    const newRole = await this.prisma.role.create({ data });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });
    const roles = user?.roles || [];

    await this.prisma.log.create({
      data: {
        action: `Created role: ${newRole.name}`,
        userId: userId,
        organizationId: data.organizationId,
        userRole: roles.map((role) => role.name).join(', '),
      },
    });

    return newRole;
  }

  async getRoles(organizationId: string): Promise<Role[]> {
    return await this.prisma.role.findMany({ where: { organizationId } });
  }

  async getRoleById(id: string): Promise<Role | null> {
    return await this.prisma.role.findUnique({ where: { id } });
  }

  async updateRole(id: string, data: { name?: string; canManageUsers?: boolean; canManageRoles?: boolean; canManageDocuments?: boolean }, userId: string): Promise<Role> {
    const updatedRole = await this.prisma.role.update({ where: { id }, data });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });
    const roles = user?.roles || [];

    await this.prisma.log.create({
      data: {
        action: `Updated role: ${updatedRole.name}`,
        userId: userId,
        organizationId: updatedRole.organizationId,
        userRole: roles.map((role) => role.name).join(', '),
      },
    });

    return updatedRole;
  }

  async deleteRole(id: string, userId: string): Promise<Role> {
    const deletedRole = await this.prisma.role.delete({ where: { id } });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });
    const roles = user?.roles || [];

    await this.prisma.log.create({
      data: {
        action: `Deleted role: ${deletedRole.name}`,
        userId: userId,
        organizationId: deletedRole.organizationId,
        userRole: roles.map((role) => role.name).join(', '),
      },
    });

    return deletedRole;
  }

  async assignRoleToUser(userId: string, roleId: string, currentUserId: string): Promise<void> {
    // Implicit M:N update
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: {
          connect: { id: roleId },
        },
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      include: { roles: true },
    });
    const currentUserRoles = user?.roles || [];
    
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    const targetUser = await this.prisma.user.findUnique({ where: { id: userId } });

    await this.prisma.log.create({
      data: {
        action: `Assigned role: ${role?.name} to user: ${targetUser?.email}`,
        userId: currentUserId,
        organizationId: role!.organizationId,
        userRole: currentUserRoles.map((r) => r.name).join(', '),
      },
    });
  }

  async unassignRoleFromUser(userId: string, roleId: string, currentUserId: string): Promise<void> {
    // Implicit M:N update
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: {
          disconnect: { id: roleId },
        },
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      include: { roles: true },
    });
    const currentUserRoles = user?.roles || [];

    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    const targetUser = await this.prisma.user.findUnique({ where: { id: userId } });

    await this.prisma.log.create({
      data: {
        action: `Unassigned role: ${role?.name} from user: ${targetUser?.email}`,
        userId: currentUserId,
        organizationId: role!.organizationId,
        userRole: currentUserRoles.map((r) => r.name).join(', '),
      },
    });
  }
}
