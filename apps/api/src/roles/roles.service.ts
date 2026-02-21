// apps/api/src/roles/roles.service.ts
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
      campusId: string;
    },
    userId: string,
  ): Promise<Role> {
    const newRole = await this.prisma.role.create({ data });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    // Retrieve org id via campus
    const campus = await this.prisma.campus.findUnique({
      where: { id: data.campusId },
    });

    await this.prisma.log.create({
      data: {
        action: `Created role: ${newRole.name} for campus: ${campus?.name}`,
        userId: userId,
        organizationId: campus?.organizationId || '',
        userRole: user?.roles.map((role) => role.name).join(', ') || '',
      },
    });

    return newRole;
  }

  // Get all roles for a CAMPUS
  async getRolesByCampus(campusId: string): Promise<Role[]> {
    return await this.prisma.role.findMany({ where: { campusId } });
  }

  // Get all roles for an ORGANIZATION (traversing campuses)
  async getRolesByOrganization(organizationId: string): Promise<Role[]> {
    return await this.prisma.role.findMany({
      where: {
        campus: {
          organizationId: organizationId,
        },
      },
      include: {
        campus: true, // useful for frontend to see which campus it belongs to
      },
    });
  }

  async getRoleById(id: string): Promise<Role | null> {
    return await this.prisma.role.findUnique({
      where: { id },
      include: { campus: true },
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
      include: { campus: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    await this.prisma.log.create({
      data: {
        action: `Updated role: ${updatedRole.name}`,
        userId: userId,
        organizationId: updatedRole.campus.organizationId,
        userRole: user?.roles.map((role) => role.name).join(', ') || '',
      },
    });

    return updatedRole;
  }

  async deleteRole(id: string, userId: string): Promise<Role> {
    // Need to fetch campus info before deletion for logging (or assume cascade delete handles relations, but we need orgId for log)
    const roleToDelete = await this.prisma.role.findUnique({
      where: { id },
      include: { campus: true },
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
        organizationId: roleToDelete.campus.organizationId,
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
      include: { campus: true },
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
        organizationId: role.campus.organizationId,
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
      include: { campus: true },
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
        organizationId: role.campus.organizationId,
        userRole: currentUser?.roles.map((r) => r.name).join(', ') || '',
      },
    });
  }
}
