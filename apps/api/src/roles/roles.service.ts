
// apps/api/src/roles/roles.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, UserRole } from '@prisma/client';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async createRole(data: { name: string; canManageUsers?: boolean; canManageRoles?: boolean; canManageDocuments?: boolean, organizationId: string }): Promise<Role> {
    return await this.prisma.role.create({ data });
  }

  async getRoles(organizationId: string): Promise<Role[]> {
    return await this.prisma.role.findMany({ where: { organizationId } });
  }

  async getRoleById(id: string): Promise<Role | null> {
    return await this.prisma.role.findUnique({ where: { id } });
  }

  async updateRole(id: string, data: { name?: string; canManageUsers?: boolean; canManageRoles?: boolean; canManageDocuments?: boolean }): Promise<Role> {
    return await this.prisma.role.update({ where: { id }, data });
  }

  async deleteRole(id: string): Promise<Role> {
    return await this.prisma.role.delete({ where: { id } });
  }

  async assignRoleToUser(userId: string, roleId: string): Promise<UserRole> {
    return await this.prisma.userRole.create({ data: { userId, roleId } });
  }

  async unassignRoleFromUser(userId: string, roleId: string): Promise<UserRole> {
    return await this.prisma.userRole.delete({ where: { userId_roleId: { userId, roleId } } });
  }
}
