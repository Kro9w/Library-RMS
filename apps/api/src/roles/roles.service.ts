
// apps/api/src/roles/roles.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, UserRole } from '@prisma/client';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async createRole(data: { name: string; canManageUsers?: boolean; canManageRoles?: boolean; canManageDocuments?: boolean, organizationId: string }, userId: string): Promise<Role> {
    const newRole = await this.prisma.role.create({ data });

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: userId },
      include: { role: true },
    });

    await this.prisma.log.create({
      data: {
        action: `Created role: ${newRole.name}`,
        userId: userId,
        organizationId: data.organizationId,
        userRole: userRoles.map((userRole) => userRole.role.name).join(', '),
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

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: userId },
      include: { role: true },
    });

    await this.prisma.log.create({
      data: {
        action: `Updated role: ${updatedRole.name}`,
        userId: userId,
        organizationId: updatedRole.organizationId,
        userRole: userRoles.map((userRole) => userRole.role.name).join(', '),
      },
    });

    return updatedRole;
  }

  async deleteRole(id: string, userId: string): Promise<Role> {
    const deletedRole = await this.prisma.role.delete({ where: { id } });

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: userId },
      include: { role: true },
    });

    await this.prisma.log.create({
      data: {
        action: `Deleted role: ${deletedRole.name}`,
        userId: userId,
        organizationId: deletedRole.organizationId,
        userRole: userRoles.map((userRole) => userRole.role.name).join(', '),
      },
    });

    return deletedRole;
  }

  async assignRoleToUser(userId: string, roleId: string, currentUserId: string): Promise<UserRole> {
    const assignedRole = await this.prisma.userRole.create({ data: { userId, roleId } });

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: currentUserId },
      include: { role: true },
    });
    
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    await this.prisma.log.create({
      data: {
        action: `Assigned role: ${role?.name} to user: ${user?.email}`,
        userId: currentUserId,
        organizationId: role!.organizationId,
        userRole: userRoles.map((userRole) => userRole.role.name).join(', '),
      },
    });

    return assignedRole;
  }

  async unassignRoleFromUser(userId: string, roleId: string, currentUserId: string): Promise<UserRole> {
    const unassignedRole = await this.prisma.userRole.delete({ where: { userId_roleId: { userId, roleId } } });

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: currentUserId },
      include: { role: true },
    });

    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    await this.prisma.log.create({
      data: {
        action: `Unassigned role: ${role?.name} from user: ${user?.email}`,
        userId: currentUserId,
        organizationId: role!.organizationId,
        userRole: userRoles.map((userRole) => userRole.role.name).join(', '),
      },
    });

    return unassignedRole;
  }
}
