import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../trpc/trpc';
import { LogService } from '../log/log.service';
import { DispositionAction } from '@prisma/client';

@Injectable()
export class DocumentTypesRouter {
  constructor(private readonly logService: LogService) {}

  createRouter() {
    return router({
      getAll: protectedProcedure.query(async ({ ctx }) => {
        const departmentId = ctx.dbUser.departmentId;

        // If the user does not have a department, return all document types.
        if (!departmentId) {
          return ctx.prisma.documentType.findMany({
            orderBy: { name: 'asc' },
            include: { recordsSeries: true },
          });
        }

        // Check if the department has any linked document types.
        const department = await ctx.prisma.department.findUnique({
          where: { id: departmentId },
          include: { documentTypes: { select: { id: true } } },
        });

        // If there are linked document types, only return those.
        if (department && department.documentTypes.length > 0) {
          return ctx.prisma.documentType.findMany({
            where: {
              departments: {
                some: { id: departmentId },
              },
            },
            orderBy: { name: 'asc' },
            include: { recordsSeries: true },
          });
        }

        // If no types are linked to the department, return all.
        return ctx.prisma.documentType.findMany({
          orderBy: { name: 'asc' },
          include: { recordsSeries: true },
        });
      }),

      getAllUnfiltered: protectedProcedure.query(async ({ ctx }) => {
        return ctx.prisma.documentType.findMany({
          orderBy: { name: 'asc' },
          include: { recordsSeries: true },
        });
      }),

      getForDepartment: protectedProcedure
        .input(z.object({ departmentId: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
          return ctx.prisma.documentType.findMany({
            where: {
              departments: {
                some: { id: input.departmentId },
              },
            },
            orderBy: { name: 'asc' },
            include: { recordsSeries: true },
          });
        }),

      updateDepartmentTypes: protectedProcedure
        .input(
          z.object({
            departmentId: z.string().min(1),
            documentTypeIds: z.array(z.string()),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const { roles, departmentId: userDeptId } = ctx.dbUser;

          const highestRoleLevel = roles?.length
            ? Math.min(...roles.map((r) => r.level))
            : 4;
          const canManageInstitution =
            roles?.some((r) => r.canManageInstitution) ?? false;
          const canManageDocuments =
            roles?.some((r) => r.canManageDocuments) ?? false;

          const isEligibleLevel = highestRoleLevel <= 1 && canManageDocuments;

          if (
            !canManageInstitution &&
            (!isEligibleLevel || userDeptId !== input.departmentId)
          ) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message:
                'You do not have permission to manage document types for this department.',
            });
          }

          const existingTypes = await ctx.prisma.documentType.findMany({
            where: {
              departments: {
                some: { id: input.departmentId },
              },
            },
            select: { id: true },
          });

          const existingIds = existingTypes.map((t) => t.id);
          const toDisconnect = existingIds.filter(
            (id) => !input.documentTypeIds.includes(id),
          );
          const toConnect = input.documentTypeIds.filter(
            (id) => !existingIds.includes(id),
          );

          return ctx.prisma.department.update({
            where: { id: input.departmentId },
            data: {
              documentTypes: {
                disconnect: toDisconnect.map((id) => ({ id })),
                connect: toConnect.map((id) => ({ id })),
              },
            },
          });
        }),

      create: protectedProcedure
        .input(
          z.object({
            name: z.string().min(1),
            color: z.string().min(1),
            recordsSeriesId: z.string().min(1),
            activeRetentionDuration: z.number().min(0).nullable().optional(),
            activeRetentionMonths: z.number().min(0).nullable().optional(),
            activeRetentionDays: z.number().min(0).nullable().optional(),
            inactiveRetentionDuration: z.number().min(0).nullable().optional(),
            inactiveRetentionMonths: z.number().min(0).nullable().optional(),
            inactiveRetentionDays: z.number().min(0).nullable().optional(),
            dispositionAction: z
              .nativeEnum(DispositionAction)
              .nullable()
              .optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const canManageInstitution =
            ctx.dbUser.roles?.some((r) => r.canManageInstitution) ?? false;
          if (!canManageInstitution) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Only global admins can manage document types.',
            });
          }
          const newDocType = await ctx.prisma.documentType.create({
            data: {
              name: input.name,
              color: input.color,
              recordsSeriesId: input.recordsSeriesId,
              activeRetentionDuration: input.activeRetentionDuration,
              activeRetentionMonths: input.activeRetentionMonths,
              activeRetentionDays: input.activeRetentionDays,
              inactiveRetentionDuration: input.inactiveRetentionDuration,
              inactiveRetentionMonths: input.inactiveRetentionMonths,
              inactiveRetentionDays: input.inactiveRetentionDays,
              dispositionAction: input.dispositionAction,
            },
          });

          await this.logService.logAction(
            ctx.dbUser.id,
            `Created document type: ${newDocType.name}`,
            ctx.dbUser.roles.map((r) => r.name),
            undefined,
            ctx.dbUser.campusId || undefined,
            ctx.dbUser.departmentId || undefined,
          );

          return newDocType;
        }),

      update: protectedProcedure
        .input(
          z.object({
            id: z.string(),
            name: z.string().min(1),
            color: z.string().min(1),
            recordsSeriesId: z.string().min(1).optional(),
            activeRetentionDuration: z.number().min(0).nullable().optional(),
            activeRetentionMonths: z.number().min(0).nullable().optional(),
            activeRetentionDays: z.number().min(0).nullable().optional(),
            inactiveRetentionDuration: z.number().min(0).nullable().optional(),
            inactiveRetentionMonths: z.number().min(0).nullable().optional(),
            inactiveRetentionDays: z.number().min(0).nullable().optional(),
            dispositionAction: z
              .nativeEnum(DispositionAction)
              .nullable()
              .optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const canManageInstitution =
            ctx.dbUser.roles?.some((r) => r.canManageInstitution) ?? false;
          if (!canManageInstitution) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Only global admins can manage document types.',
            });
          }
          return ctx.prisma.documentType.update({
            where: { id: input.id },
            data: {
              name: input.name,
              color: input.color,
              ...(input.recordsSeriesId
                ? { recordsSeriesId: input.recordsSeriesId }
                : {}),
              activeRetentionDuration: input.activeRetentionDuration,
              activeRetentionMonths: input.activeRetentionMonths,
              activeRetentionDays: input.activeRetentionDays,
              inactiveRetentionDuration: input.inactiveRetentionDuration,
              inactiveRetentionMonths: input.inactiveRetentionMonths,
              inactiveRetentionDays: input.inactiveRetentionDays,
              dispositionAction: input.dispositionAction,
            },
          });
        }),

      delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const canManageInstitution =
            ctx.dbUser.roles?.some((r) => r.canManageInstitution) ?? false;
          if (!canManageInstitution) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Only global admins can manage document types.',
            });
          }
          const deletedDocType = await ctx.prisma.documentType.delete({
            where: { id: input.id },
          });

          await this.logService.logAction(
            ctx.dbUser.id,
            `Deleted document type: ${deletedDocType.name}`,
            ctx.dbUser.roles.map((r) => r.name),
            undefined,
            ctx.dbUser.campusId || undefined,
            ctx.dbUser.departmentId || undefined,
          );

          return deletedDocType;
        }),
    });
  }
}
