import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async createRole(
    data: {
      name: string;
      canManageUsers?: boolean;
      canManageRoles?: boolean;
      canManageDocuments?: boolean;
      departmentId: string;
    },
    userId: string,
  ): Promise<Role> {
    const newRole = await this.prisma.role.create({ data });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    const department = await this.prisma.department.findUnique({
      where: { id: data.departmentId },
      include: { campus: true },
    });

    await this.prisma.log.create({
      data: {
        action: `Created role: ${newRole.name} for department: ${department?.name}`,
        userId: userId,
        userRole: user?.roles.map((role) => role.name).join(', ') || '',
      },
    });

    return newRole;
  }

  async getRolesByDepartment(departmentId: string): Promise<Role[]> {
    return await this.prisma.role.findMany({ where: { departmentId } });
  }

  async getAllRoles(): Promise<Role[]> {
    return await this.prisma.role.findMany({
      include: {
        department: { include: { campus: true } },
      },
    });
  }

  async getRoleById(id: string): Promise<Role | null> {
    return await this.prisma.role.findUnique({
      where: { id },
      include: { department: { include: { campus: true } } },
    });
  }

  async updateRole(
    id: string,
    data: {
      name?: string;
      canManageUsers?: boolean;
      canManageRoles?: boolean;
      canManageDocuments?: boolean;
    },
    userId: string,
  ): Promise<Role> {
    const updatedRole = await this.prisma.role.update({
      where: { id },
      data,
      include: { department: { include: { campus: true } } },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    await this.prisma.log.create({
      data: {
        action: `Updated role: ${updatedRole.name}`,
        userId: userId,
        userRole: user?.roles.map((role) => role.name).join(', ') || '',
      },
    });

    return updatedRole;
  }

  async deleteRole(id: string, userId: string): Promise<Role> {
    const roleToDelete = await this.prisma.role.findUnique({
      where: { id },
      include: { department: { include: { campus: true } } },
    });

    if (!roleToDelete) {
      throw new Error('Role not found');
    }

    const deletedRole = await this.prisma.role.delete({ where: { id } });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    await this.prisma.log.create({
      data: {
        action: `Deleted role: ${roleToDelete.name}`,
        userId: userId,
        userRole: user?.roles.map((role) => role.name).join(', ') || '',
      },
    });

    return deletedRole;
  }

  async assignRoleToUser(
    userId: string,
    roleId: string,
    currentUserId: string,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: {
          connect: { id: roleId },
        },
      },
    });

    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { department: { include: { campus: true } } },
    });
    if (!role) throw new Error('Role not found');

    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      include: { roles: true },
    });

    await this.prisma.log.create({
      data: {
        action: `Assigned role: ${role.name} to user: ${targetUser?.email}`,
        userId: currentUserId,
        userRole: currentUser?.roles.map((r) => r.name).join(', ') || '',
      },
    });
  }

  async unassignRoleFromUser(
    userId: string,
    roleId: string,
    currentUserId: string,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: {
          disconnect: { id: roleId },
        },
      },
    });

    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { department: { include: { campus: true } } },
    });
    if (!role) throw new Error('Role not found');

    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      include: { roles: true },
    });

    await this.prisma.log.create({
      data: {
        action: `Unassigned role: ${role.name} from user: ${targetUser?.email}`,
        userId: currentUserId,
        userRole: currentUser?.roles.map((r) => r.name).join(', ') || '',
      },
    });
  }
}
