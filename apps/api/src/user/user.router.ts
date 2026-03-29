// apps/api/src/user/user.router.ts

import { z } from 'zod';
import {
  protectedProcedure,
  router,
  supabaseAuthedProcedure,
  requirePermission,
  checkPermission,
} from '../trpc/trpc';
import { PrismaService } from '../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { TRPCError } from '@trpc/server';
import { LogService } from '../log/log.service';

@Injectable()
export class UserRouter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
  ) {}

  createRouter() {
    return router({
      /**
       * Creates a user in our public.User table after
       * a successful Supabase signup or login.
       */
      syncUser: supabaseAuthedProcedure
        .meta({
          openapi: {
            method: 'POST',
            path: '/user.sync',
            tags: ['user'],
            summary: 'Sync Supabase auth user with local DB',
          },
        })
        .input(
          z.object({
            email: z.string().email(),
            firstName: z.string().min(1),
            middleName: z.string().optional(),
            lastName: z.string().min(1),
          }),
        )
        .output(z.any())
        .mutation(async ({ ctx, input }) => {
          const { user: authUser } = ctx;

          // Efficient upsert
          return this.prisma.user.upsert({
            where: { id: authUser.id },
            update: {
              // We typically don't update name on sync unless we want Supabase metadata to be source of truth
            },
            create: {
              id: authUser.id,
              email: input.email,
              firstName: input.firstName,
              middleName: input.middleName,
              lastName: input.lastName,
            },
          });
        }),

      getMe: protectedProcedure
        .meta({
          openapi: {
            method: 'GET',
            path: '/user.getMe',
            tags: ['user'],
            summary: 'Get current user details',
          },
        })
        .input(z.void())
        .query(async ({ ctx }) => {
          // ctx.dbUser already has institution and roles included
          // Optimization: fetch only campus and department instead of full user
          const userDetails = await this.prisma.user.findUnique({
            where: { id: ctx.dbUser.id },
            select: {
              campus: true,
              department: true,
            },
          });

          return {
            ...ctx.dbUser,
            campus: userDetails?.campus ?? null,
            department: userDetails?.department ?? null,
          };
        }),

      joinInstitution: protectedProcedure
        .meta({
          openapi: {
            method: 'POST',
            path: '/user.joinInstitution',
            tags: ['user', 'institution'],
            summary: 'Join an institution',
          },
        })
        .input(
          z.object({
            institutionId: z.string().min(1),
            campusId: z.string().min(1),
            departmentId: z.string().min(1),
          }),
        )
        .output(z.any())
        .mutation(async ({ ctx, input }) => {
          if (ctx.dbUser.institutionId) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'User already belongs to an institution.',
            });
          }

          // Verify hierarchy
          const dept = await this.prisma.department.findUnique({
            where: { id: input.departmentId },
            include: { campus: true },
          });

          if (!dept || dept.campusId !== input.campusId) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Invalid department for this campus.',
            });
          }

          if (dept.campus.institutionId !== input.institutionId) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Invalid campus for this institution.',
            });
          }

          const institution = await this.prisma.institution.findUnique({
            where: { id: input.institutionId },
          });

          if (!institution) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Institution not found.',
            });
          }

          let targetRoleRecord: { id: string, name: string } | null = null;

          // 1. Check for specific email to get University President role
          if (ctx.dbUser.email === 'jakecalantas.blis@gmail.com' && dept.name === 'Office of the University President') {
            const presidentRole = await this.prisma.role.findFirst({
              where: {
                departmentId: input.departmentId,
                name: 'University President',
              },
            });
            if (presidentRole) {
              targetRoleRecord = presidentRole;
            }
          }

          // 2. If not president, check if this department has a level 1 role and if it's currently vacant.
          // IMPORTANT: Do NOT auto-assign the University President role to a random first user.
          if (!targetRoleRecord && dept.name !== 'Office of the University President') {
            const level1Role = await this.prisma.role.findFirst({
              where: {
                departmentId: input.departmentId,
                level: 1,
              },
              include: {
                users: true,
              },
            });

            // If there's a level 1 role, and it has NO users assigned yet, assign it to this first user
            if (level1Role && level1Role.users.length === 0) {
              targetRoleRecord = level1Role;
            }
          }

          // 3. Fallback to default 'User' role
          if (!targetRoleRecord) {
            const roleName = 'User';
            let userRole = await this.prisma.role.findFirst({
              where: {
                departmentId: input.departmentId,
                name: roleName,
              },
            });

            if (!userRole) {
              userRole = await this.prisma.role.create({
                data: {
                  name: roleName,
                  canManageUsers: false,
                  canManageRoles: false,
                  canManageDocuments: false,
                  departmentId: input.departmentId,
                },
              });
            }
            targetRoleRecord = userRole;
          }

          await this.prisma.user.update({
            where: { id: ctx.dbUser.id },
            data: {
              institutionId: institution.id,
              campusId: input.campusId,
              departmentId: input.departmentId,
              roles: {
                connect: { id: targetRoleRecord.id },
              },
            },
          });

          await this.logService.logAction(
            ctx.dbUser.id,
            institution.id,
            `Joined institution: ${institution.name}, Campus: ${dept.campus.name}, Dept: ${dept.name} as ${targetRoleRecord.name}`,
            [targetRoleRecord.name],
          );

          return institution;
        }),

      // New Mutation: Create Department and Join
      createDepartmentAndJoin: protectedProcedure
        .input(
          z.object({
            institutionId: z.string().min(1),
            campusId: z.string().min(1),
            departmentName: z.string().min(1),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          if (ctx.dbUser.institutionId) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'User already belongs to an institution.',
            });
          }

          const campus = await ctx.prisma.campus.findUnique({
            where: { id: input.campusId },
            include: { institution: true },
          });

          if (!campus || campus.institutionId !== input.institutionId) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Invalid campus or institution.',
            });
          }

          // Find or Create Department
          let dept = await ctx.prisma.department.findFirst({
            where: {
              name: input.departmentName,
              campusId: input.campusId,
            },
          });

          if (!dept) {
            dept = await ctx.prisma.department.create({
              data: {
                name: input.departmentName,
                campusId: input.campusId,
                icon: 'default-icon.png',
              },
            });
          }

          let targetRoleRecord: { id: string, name: string } | null = null;

          // For dynamically created departments, it's very likely they don't have a level 1 role seeded,
          // but we still apply the same logic for consistency, or just fallback to 'User'.
          // IMPORTANT: Do NOT auto-assign the University President role to a random first user.
          if (dept.name !== 'Office of the University President') {
            const level1Role = await ctx.prisma.role.findFirst({
              where: {
                departmentId: dept.id,
                level: 1,
              },
              include: { users: true },
            });

            if (level1Role && level1Role.users.length === 0) {
              targetRoleRecord = level1Role;
            }
          }

          if (!targetRoleRecord) {
            const roleName = 'User';
            let userRole = await ctx.prisma.role.findFirst({
              where: { departmentId: dept.id, name: roleName },
            });

            if (!userRole) {
              userRole = await ctx.prisma.role.create({
                data: {
                  name: roleName,
                  canManageUsers: false,
                  canManageRoles: false,
                  canManageDocuments: false,
                  departmentId: dept.id,
                },
              });
            }
            targetRoleRecord = userRole;
          }

          await ctx.prisma.user.update({
            where: { id: ctx.dbUser.id },
            data: {
              institutionId: input.institutionId,
              campusId: input.campusId,
              departmentId: dept.id,
              roles: { connect: { id: targetRoleRecord.id } },
            },
          });

          await this.logService.logAction(
            ctx.dbUser.id,
            input.institutionId,
            `Created/Joined Department: ${dept.name}, Campus: ${campus.name} as ${targetRoleRecord.name}`,
            [targetRoleRecord.name],
          );

          return { success: true };
        }),

      updateProfile: protectedProcedure
        .input(
          z.object({
            firstName: z.string().min(1),
            middleName: z.string().optional(),
            lastName: z.string().min(1),
            // imageUrl is optional, but if provided, it must be a URL
            imageUrl: z.string().url().optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          return ctx.prisma.user.update({
            where: { id: ctx.dbUser.id },
            data: {
              firstName: input.firstName,
              middleName: input.middleName,
              lastName: input.lastName,
              ...(input.imageUrl && { imageUrl: input.imageUrl }),
            },
          });
        }),

      deleteUser: protectedProcedure
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          requirePermission(ctx.dbUser, 'canManageUsers');

          const deletedUser = await ctx.prisma.user.delete({
            where: { id: input.userId },
          });

          if (ctx.dbUser.institutionId) {
            await this.logService.logAction(
              ctx.dbUser.id,
              ctx.dbUser.institutionId,
              `Deleted user: ${deletedUser.email ?? 'Unknown'}`,
              ctx.dbUser.roles.map((r) => r.name),
            );
          }

          return deletedUser;
        }),

      getUsersWithRoles: protectedProcedure.query(async ({ ctx }) => {
        const canManageInstitution = ctx.dbUser.roles?.some((r) => r.canManageInstitution) ?? false;

        if (canManageInstitution) {
          return ctx.prisma.user.findMany({
            where: { institutionId: ctx.dbUser.institutionId },
            include: { roles: true, campus: true, department: true },
          });
        }

        if (!ctx.dbUser.departmentId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'User does not belong to a department.',
          });
        }

        return ctx.prisma.user.findMany({
          where: {
            departmentId: ctx.dbUser.departmentId,
          },
          include: {
            roles: true,
            campus: true,
            department: true,
          },
        });
      }),

      getAllInstitutions: protectedProcedure.query(async ({ ctx }) => {
        return ctx.prisma.institution.findMany();
      }),

      removeUserFromInstitution: protectedProcedure
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          requirePermission(ctx.dbUser, 'canManageUsers');

          const updatedUser = await ctx.prisma.user.update({
            where: { id: input.userId },
            data: {
              institutionId: null,
              campusId: null,
              departmentId: null,
              roles: { set: [] }, // Clear roles
            },
          });

          if (ctx.dbUser.institutionId) {
            await this.logService.logAction(
              ctx.dbUser.id,
              ctx.dbUser.institutionId,
              `Removed user: ${updatedUser.email ?? 'Unknown'} from institution`,
              ctx.dbUser.roles.map((r) => r.name),
            );
          }

          return updatedUser;
        }),

      // --- New Hierarchy Management Endpoints ---

      getCampuses: protectedProcedure
        .input(z.object({ institutionId: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
          return ctx.prisma.campus.findMany({
            where: { institutionId: input.institutionId },
          });
        }),

      getDepartments: protectedProcedure
        .input(z.object({ campusId: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
          return ctx.prisma.department.findMany({
            where: { campusId: input.campusId },
          });
        }),

      createCampus: protectedProcedure
        .input(z.object({ name: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          requirePermission(ctx.dbUser, 'canManageUsers');

          if (!ctx.dbUser.institutionId) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'User must belong to an institution.',
            });
          }

          return ctx.prisma.campus.create({
            data: {
              name: input.name,
              institutionId: ctx.dbUser.institutionId,
            },
          });
        }),

      updateCampus: protectedProcedure
        .input(z.object({ id: z.string(), name: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
          const canManageInstitution = ctx.dbUser.roles?.some((r) => r.canManageInstitution) ?? false;
          if (!canManageInstitution) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Only Institution Admins can update campuses.',
            });
          }

          const campus = await ctx.prisma.campus.findUnique({
            where: { id: input.id },
          });

          if (!campus || campus.institutionId !== ctx.dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Campus not found or access denied.',
            });
          }

          return ctx.prisma.campus.update({
            where: { id: input.id },
            data: { name: input.name },
          });
        }),

      deleteCampus: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const canManageInstitution = ctx.dbUser.roles?.some((r) => r.canManageInstitution) ?? false;
          if (!canManageInstitution) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Only Institution Admins can delete campuses.',
            });
          }

          const campus = await ctx.prisma.campus.findUnique({
            where: { id: input.id },
          });

          if (!campus || campus.institutionId !== ctx.dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Campus not found or access denied.',
            });
          }

          return ctx.prisma.campus.delete({
            where: { id: input.id },
          });
        }),

      createDepartment: protectedProcedure
        .input(
          z.object({
            name: z.string().min(1),
            campusId: z.string().min(1),
            icon: z.string().optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          requirePermission(ctx.dbUser, 'canManageUsers');

          // Verify campus belongs to same institution
          const campus = await ctx.prisma.campus.findUnique({
            where: { id: input.campusId },
          });

          if (!campus || campus.institutionId !== ctx.dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Cannot create department in this campus.',
            });
          }

          return ctx.prisma.department.create({
            data: {
              name: input.name,
              campusId: input.campusId,
              icon: input.icon || 'default-icon.png',
            },
          });
        }),

      updateDepartment: protectedProcedure
        .input(
          z.object({
            id: z.string(),
            name: z.string().optional(),
            icon: z.string().optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          requirePermission(ctx.dbUser, 'canManageUsers');

          // Verify ownership
          const dept = await ctx.prisma.department.findUnique({
            where: { id: input.id },
            include: { campus: true },
          });

          if (!dept || dept.campus.institutionId !== ctx.dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Department not found or access denied.',
            });
          }

          return ctx.prisma.department.update({
            where: { id: input.id },
            data: {
              name: input.name,
              icon: input.icon,
            },
          });
        }),

      deleteDepartment: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const canManageInstitution = ctx.dbUser.roles?.some((r) => r.canManageInstitution) ?? false;
          if (!canManageInstitution) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Only Institution Admins can delete departments.',
            });
          }

          const dept = await ctx.prisma.department.findUnique({
            where: { id: input.id },
            include: { campus: true },
          });

          if (!dept || dept.campus.institutionId !== ctx.dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Department not found or access denied.',
            });
          }

          return ctx.prisma.department.delete({
            where: { id: input.id },
          });
        }),

      updateUserHierarchy: protectedProcedure
        .input(
          z.object({
            userId: z.string(),
            campusId: z.string(),
            departmentId: z.string(),
            roleId: z.string().optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const canManageInstitution = ctx.dbUser.roles?.some((r) => r.canManageInstitution) ?? false;
          if (!canManageInstitution) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Only Institution Admins can reassign users globally.',
            });
          }

          const targetUser = await ctx.prisma.user.findUnique({
            where: { id: input.userId },
          });

          if (
            !targetUser ||
            targetUser.institutionId !== ctx.dbUser.institutionId
          ) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User not found or access denied.',
            });
          }

          const dept = await ctx.prisma.department.findUnique({
            where: { id: input.departmentId },
            include: { campus: true },
          });

          if (
            !dept ||
            dept.campusId !== input.campusId ||
            dept.campus.institutionId !== ctx.dbUser.institutionId
          ) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Invalid campus or department hierarchy.',
            });
          }

          let rolesToConnect: { id: string }[] = [];

          if (input.roleId) {
            const role = await ctx.prisma.role.findUnique({
              where: { id: input.roleId },
            });
            if (role && role.departmentId === input.departmentId) {
              rolesToConnect = [{ id: role.id }];
            }
          }

          return ctx.prisma.user.update({
            where: { id: input.userId },
            data: {
              campusId: input.campusId,
              departmentId: input.departmentId,
              roles: {
                set: rolesToConnect, // Overwrite roles
              },
            },
          });
        }),

      getInstitutionHierarchy: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.dbUser.institutionId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User must belong to an institution.',
          });
        }

        const canSeeAllDocs = checkPermission(ctx.dbUser, 'canManageDocuments');

        const org = await ctx.prisma.institution.findUnique({
          where: { id: ctx.dbUser.institutionId },
          include: {
            campuses: {
              include: {
                departments: {
                  include: {
                    users: {
                      include: {
                        roles: true,
                        documents: {
                          // If user cannot manage documents, they can only see their own
                          where: canSeeAllDocs
                            ? undefined
                            : { uploadedById: ctx.dbUser.id },
                          select: {
                            id: true,
                            title: true,
                            documentType: { select: { color: true } },
                            uploadedById: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!org) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Institution not found.',
          });
        }

        return org;
      }),
    });
  }
}
