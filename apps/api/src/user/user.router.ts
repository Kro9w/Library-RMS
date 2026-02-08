// apps/api/src/user/user.router.ts

import { z } from 'zod';
import {
  protectedProcedure,
  router,
  supabaseAuthedProcedure,
  requirePermission,
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
        .output(z.any())
        .query(async ({ ctx }) => {
          // ctx.dbUser already has organization and roles included
          // We fetch the full user with campus and department relations
          const user = await this.prisma.user.findUnique({
             where: { id: ctx.dbUser.id },
             include: {
                 organization: true,
                 roles: true,
                 campus: true,
                 department: true
             }
          });
          return user;
        }),

      createOrganization: protectedProcedure
        .meta({
          openapi: {
            method: 'POST',
            path: '/user.createOrganization',
            tags: ['user', 'organization'],
            summary: 'Create a new organization',
          },
        })
        .input(z.object({ orgName: z.string().min(1), orgAcronym: z.string().min(1) }))
        .output(z.any())
        .mutation(async ({ ctx, input }) => {
          if (ctx.dbUser.organizationId) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'User already belongs to an organization.',
            });
          }

          const result = await this.prisma.$transaction(async (tx) => {
            const newOrg = await tx.organization.create({
              data: {
                name: input.orgName,
                acronym: input.orgAcronym,
              },
            });

            // Default Main Campus
            const mainCampus = await tx.campus.create({
                data: {
                    name: 'Main Campus',
                    organizationId: newOrg.id
                }
            });

            // Default Admin Department
            const adminDept = await tx.department.create({
                data: {
                    name: 'Admin Department',
                    campusId: mainCampus.id,
                    icon: 'admin-default.png'
                }
            });

            const adminRole = await tx.role.create({
              data: {
                name: 'Admin',
                canManageUsers: true,
                canManageRoles: true,
                canManageDocuments: true,
                campusId: mainCampus.id,
              },
            });

            // Connect user to Org, Campus, Dept, Role
            await tx.user.update({
               where: { id: ctx.dbUser.id },
               data: {
                   organizationId: newOrg.id,
                   campusId: mainCampus.id,
                   departmentId: adminDept.id,
                   roles: {
                       connect: { id: adminRole.id }
                   }
               }
            });
            
            return newOrg;
          });

          await this.logService.logAction(
             ctx.dbUser.id,
             result.id,
             `Created organization: ${result.name}`,
             ['Admin'] // They just became admin
          );

          return result;
        }),

      joinOrganization: protectedProcedure
        .meta({
          openapi: {
            method: 'POST',
            path: '/user.joinOrganization',
            tags: ['user', 'organization'],
            summary: 'Join an organization',
          },
        })
        .input(z.object({ 
            orgId: z.string().min(1),
            campusId: z.string().min(1),
            departmentId: z.string().min(1)
        }))
        .output(z.any())
        .mutation(async ({ ctx, input }) => {
          if (ctx.dbUser.organizationId) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'User already belongs to an organization.',
            });
          }

          // Verify hierarchy
          const dept = await this.prisma.department.findUnique({
              where: { id: input.departmentId },
              include: { campus: true }
          });

          if (!dept || dept.campusId !== input.campusId) {
              throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid department for this campus.' });
          }

          if (dept.campus.organizationId !== input.orgId) {
              throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid campus for this organization.' });
          }

          const org = await this.prisma.organization.findUnique({
            where: { id: input.orgId },
          });

          if (!org) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Organization not found.',
            });
          }

          // Check if this user is the FIRST user in this Campus
          // Actually, we need to check if ANY user is in this Campus.
          const existingUserInCampus = await this.prisma.user.findFirst({
              where: { campusId: input.campusId }
          });
          const isFirstUserInCampus = !existingUserInCampus;

          let roleName = isFirstUserInCampus ? 'Admin' : 'User';
          
          // Find or Create Role for this Campus
          let roleRecord = await this.prisma.role.findFirst({
            where: {
              campusId: input.campusId,
              name: roleName,
            },
          });

          if (!roleRecord) {
            roleRecord = await this.prisma.role.create({
              data: {
                name: roleName,
                canManageUsers: roleName === 'Admin',
                canManageRoles: roleName === 'Admin',
                canManageDocuments: roleName === 'Admin',
                campusId: input.campusId,
              },
            });
          }

          // Disconnect any old roles (if moving, but here we check if orgId exists so new join)
          
          await this.prisma.user.update({
            where: { id: ctx.dbUser.id },
            data: {
              organizationId: org.id,
              campusId: input.campusId,
              departmentId: input.departmentId,
              roles: {
                  connect: { id: roleRecord.id }
              }
            },
          });

          await this.logService.logAction(
             ctx.dbUser.id,
             org.id,
             `Joined organization: ${org.name}, Campus: ${dept.campus.name}, Dept: ${dept.name} as ${roleName}`,
             [roleName]
          );

          return org;
        }),

      // New Mutation: Create Department and Join
      createDepartmentAndJoin: protectedProcedure
        .input(z.object({
            orgId: z.string().min(1),
            campusId: z.string().min(1),
            departmentName: z.string().min(1)
        }))
        .mutation(async ({ ctx, input }) => {
            if (ctx.dbUser.organizationId) {
                 throw new TRPCError({ code: 'BAD_REQUEST', message: 'User already belongs to an organization.' });
            }

            const campus = await ctx.prisma.campus.findUnique({
                where: { id: input.campusId },
                include: { organization: true }
            });

            if(!campus || campus.organizationId !== input.orgId) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid campus or organization.' });
            }

            // Find or Create Department
            let dept = await ctx.prisma.department.findFirst({
                where: {
                    name: input.departmentName,
                    campusId: input.campusId
                }
            });

            if (!dept) {
                dept = await ctx.prisma.department.create({
                    data: {
                        name: input.departmentName,
                        campusId: input.campusId,
                        icon: 'default-icon.png'
                    }
                });
            }

            // Role Logic (First in Campus?)
            const existingUserInCampus = await ctx.prisma.user.findFirst({
                where: { campusId: input.campusId }
            });
            const isFirstUserInCampus = !existingUserInCampus;
            let roleName = isFirstUserInCampus ? 'Admin' : 'User';

            let roleRecord = await ctx.prisma.role.findFirst({
                where: { campusId: input.campusId, name: roleName }
            });

            if (!roleRecord) {
                roleRecord = await ctx.prisma.role.create({
                    data: {
                        name: roleName,
                        canManageUsers: roleName === 'Admin',
                        canManageRoles: roleName === 'Admin',
                        canManageDocuments: roleName === 'Admin',
                        campusId: input.campusId,
                    }
                });
            }

            await ctx.prisma.user.update({
                where: { id: ctx.dbUser.id },
                data: {
                    organizationId: input.orgId,
                    campusId: input.campusId,
                    departmentId: dept.id,
                    roles: { connect: { id: roleRecord.id } }
                }
            });

             await this.logService.logAction(
                 ctx.dbUser.id,
                 input.orgId,
                 `Created/Joined Department: ${dept.name}, Campus: ${campus.name} as ${roleName}`,
                 [roleName]
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

          await this.logService.logAction(
              ctx.dbUser.id,
              ctx.dbUser.organizationId!,
              `Deleted user: ${deletedUser.email}`,
              ctx.dbUser.roles.map(r => r.name)
          );

          return deletedUser;
        }),
      
      getUsersWithRoles: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.dbUser.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'User does not belong to an organization.',
          });
        }
        return ctx.prisma.user.findMany({
          where: {
            organizationId: ctx.dbUser.organizationId,
          },
          include: {
            roles: true,
            campus: true,
            department: true
          },
        });
      }),

      getAllOrgs: protectedProcedure.query(async ({ ctx }) => {
        return ctx.prisma.organization.findMany();
      }),

      removeUserFromOrg: protectedProcedure
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          requirePermission(ctx.dbUser, 'canManageUsers');

          const updatedUser = await ctx.prisma.user.update({
            where: { id: input.userId },
            data: {
              organizationId: null,
              campusId: null,
              departmentId: null,
              roles: { set: [] } // Clear roles
            },
          });

          await this.logService.logAction(
            ctx.dbUser.id,
            ctx.dbUser.organizationId!,
            `Removed user: ${updatedUser.email} from organization`,
            ctx.dbUser.roles.map(r => r.name)
          );

          return updatedUser;
        }),

      // --- New Hierarchy Management Endpoints ---

      getCampuses: protectedProcedure
        .input(z.object({ orgId: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.campus.findMany({
                where: { organizationId: input.orgId }
            });
        }),

      getDepartments: protectedProcedure
        .input(z.object({ campusId: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.department.findMany({
                where: { campusId: input.campusId }
            });
        }),
      
      createCampus: protectedProcedure
        .input(z.object({ name: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            requirePermission(ctx.dbUser, 'canManageUsers');
            
            if (!ctx.dbUser.organizationId) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'User must belong to an organization.' });
            }

            return ctx.prisma.campus.create({
                data: {
                    name: input.name,
                    organizationId: ctx.dbUser.organizationId
                }
            });
        }),

      createDepartment: protectedProcedure
        .input(z.object({ 
            name: z.string().min(1),
            campusId: z.string().min(1),
            icon: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            requirePermission(ctx.dbUser, 'canManageUsers');

            // Verify campus belongs to same organization
            const campus = await ctx.prisma.campus.findUnique({
                where: { id: input.campusId }
            });

            if (!campus || campus.organizationId !== ctx.dbUser.organizationId) {
                 throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot create department in this campus.' });
            }

            return ctx.prisma.department.create({
                data: {
                    name: input.name,
                    campusId: input.campusId,
                    icon: input.icon || 'default-icon.png'
                }
            });
        }),

      updateDepartment: protectedProcedure
        .input(z.object({
            id: z.string(),
            name: z.string().optional(),
            icon: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
             requirePermission(ctx.dbUser, 'canManageUsers');
             
             // Verify ownership
             const dept = await ctx.prisma.department.findUnique({
                 where: { id: input.id },
                 include: { campus: true }
             });

             if (!dept || dept.campus.organizationId !== ctx.dbUser.organizationId) {
                 throw new TRPCError({ code: 'FORBIDDEN', message: 'Department not found or access denied.' });
             }

             return ctx.prisma.department.update({
                 where: { id: input.id },
                 data: {
                     name: input.name,
                     icon: input.icon
                 }
             });
        }),

      getOrgHierarchy: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.dbUser.organizationId) {
             throw new TRPCError({ code: 'BAD_REQUEST', message: 'User must belong to an organization.' });
        }
        
        const org = await ctx.prisma.organization.findUnique({
            where: { id: ctx.dbUser.organizationId },
            include: {
                campuses: {
                    include: {
                        departments: {
                            include: {
                                users: {
                                    include: {
                                        documents: {
                                            select: {
                                                id: true,
                                                title: true,
                                                documentType: { select: { color: true } },
                                                uploadedById: true,
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!org) {
             throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found.' });
        }

        return org;
      }),
    });
  }
}
