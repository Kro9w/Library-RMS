import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc/trpc';
import { PrismaService } from '../prisma/prisma.service';
import { TRPCError } from '@trpc/server';
import { SupabaseService } from '../supabase/supabase.service';
import { Prisma } from '@prisma/client';
import { env } from '../env';

@Injectable()
export class ArchivesRouter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  createRouter() {
    return router({
      getArchivedDocuments: protectedProcedure
        .input(
          z.object({
            page: z.number().min(1).default(1),
            pageSize: z.number().min(1).max(100).default(10),
            search: z.string().optional(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const { dbUser } = ctx;

          if (!dbUser.institutionId || !dbUser.departmentId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an office/department.',
            });
          }

          const hasAccess = dbUser.roles.some(
            (r) =>
              r.canManageInstitution || (r.canManageDocuments && r.level <= 2),
          );

          if (!hasAccess) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Insufficient permissions to view archives.',
            });
          }

          const skip = (input.page - 1) * input.pageSize;
          const take = input.pageSize;

          const whereClause: Prisma.DocumentWhereInput = {
            institutionId: dbUser.institutionId,
            departmentId: dbUser.departmentId,
            lifecycle: {
              dispositionStatus: 'ARCHIVED',
            },
            title: input.search
              ? { contains: input.search, mode: 'insensitive' }
              : undefined,
          };

          const [totalCount, documents] = await this.prisma.$transaction([
            this.prisma.document.count({ where: whereClause }),
            this.prisma.document.findMany({
              where: whereClause,
              skip,
              take,
              orderBy: { lifecycle: { dispositionDate: 'desc' } },
              include: {
                documentType: true,
                uploadedBy: true,
                lifecycle: true,
              },
            }),
          ]);

          return { documents, totalCount };
        }),

      getDestroyedDocuments: protectedProcedure
        .input(
          z.object({
            page: z.number().min(1).default(1),
            pageSize: z.number().min(1).max(100).default(10),
            search: z.string().optional(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const { dbUser } = ctx;

          if (!dbUser.institutionId || !dbUser.departmentId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an office/department.',
            });
          }

          const hasAccess = dbUser.roles.some(
            (r) =>
              r.canManageInstitution || (r.canManageDocuments && r.level <= 2),
          );

          if (!hasAccess) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Insufficient permissions to view destruction register.',
            });
          }

          const skip = (input.page - 1) * input.pageSize;
          const take = input.pageSize;

          const whereClause: Prisma.DocumentWhereInput = {
            institutionId: dbUser.institutionId,
            departmentId: dbUser.departmentId,
            lifecycle: {
              dispositionStatus: 'DESTROYED',
            },
            title: input.search
              ? { contains: input.search, mode: 'insensitive' }
              : undefined,
          };

          const [totalCount, documents] = await this.prisma.$transaction([
            this.prisma.document.count({ where: whereClause }),
            this.prisma.document.findMany({
              where: whereClause,
              skip,
              take,
              orderBy: { lifecycle: { dispositionDate: 'desc' } },
              include: {
                documentType: true,
                uploadedBy: true,
                lifecycle: true,
              },
            }),
          ]);

          return { documents, totalCount };
        }),

      
      getAllArchivedDocuments: protectedProcedure
        .input(
          z.object({
            page: z.number().min(1).default(1),
            pageSize: z.number().min(1).max(1000).default(50),
            search: z.string().optional(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const { dbUser } = ctx;

          if (!dbUser.institutionId || !dbUser.departmentId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an office/department.',
            });
          }

          const hasAccess = dbUser.roles.some((r) => r.canManageInstitution);

          if (!hasAccess) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Insufficient permissions. Master Archives requires System Admin access.',
            });
          }

          const skip = (input.page - 1) * input.pageSize;
          const take = input.pageSize;

          const whereClause: Prisma.DocumentWhereInput = {
            institutionId: dbUser.institutionId,
            departmentId: dbUser.departmentId,
            lifecycle: {
              dispositionStatus: 'ARCHIVED',
            },
            title: input.search
              ? { contains: input.search, mode: 'insensitive' }
              : undefined,
          };

          const [totalCount, docs] = await this.prisma.$transaction([
            this.prisma.document.count({ where: whereClause }),
            this.prisma.document.findMany({
              where: whereClause,
              skip,
              take,
              orderBy: { lifecycle: { dispositionDate: 'desc' } },
              select: {
                id: true,
                title: true,
                controlNumber: true,
                campus: { select: { id: true, name: true } },
                department: { select: { id: true, name: true } },
                documentType: { select: { name: true, color: true } },
                uploadedBy: { select: { firstName: true, lastName: true } },
                lifecycle: {
                  select: {
                    dispositionDate: true,
                    archiveManifestUrl: true,
                  },
                },
              },
            }),
          ]);

          return { documents: docs, totalCount };
        }),

      getAllDestroyedDocuments: protectedProcedure
        .input(
          z.object({
            page: z.number().min(1).default(1),
            pageSize: z.number().min(1).max(1000).default(50),
            search: z.string().optional(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const { dbUser } = ctx;

          if (!dbUser.institutionId || !dbUser.departmentId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an office/department.',
            });
          }

          const hasAccess = dbUser.roles.some((r) => r.canManageInstitution);

          if (!hasAccess) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Insufficient permissions. Master Destruction Register requires System Admin access.',
            });
          }

          const skip = (input.page - 1) * input.pageSize;
          const take = input.pageSize;

          const whereClause: Prisma.DocumentWhereInput = {
            institutionId: dbUser.institutionId,
            departmentId: dbUser.departmentId,
            lifecycle: {
              dispositionStatus: 'DESTROYED',
            },
            title: input.search
              ? { contains: input.search, mode: 'insensitive' }
              : undefined,
          };

          const [totalCount, docs] = await this.prisma.$transaction([
            this.prisma.document.count({ where: whereClause }),
            this.prisma.document.findMany({
              where: whereClause,
              skip,
              take,
              orderBy: { lifecycle: { dispositionDate: 'desc' } },
              select: {
                id: true,
                title: true,
                controlNumber: true,
                campus: { select: { id: true, name: true } },
                department: { select: { id: true, name: true } },
                documentType: { select: { name: true, color: true } },
                uploadedBy: { select: { firstName: true, lastName: true } },
                lifecycle: {
                  select: {
                    dispositionDate: true,
                    archiveManifestUrl: true,
                  },
                },
              },
            }),
          ]);

          return { documents: docs, totalCount };
        }),

      getArchiveManifestUrl: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
          const { dbUser } = ctx;
          if (!dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an institution.',
            });
          }

          const doc = await this.prisma.document.findUnique({
            where: { id: input.id },
            include: { lifecycle: true },
          });

          if (
            !doc ||
            doc.lifecycle?.dispositionStatus !== 'ARCHIVED' ||
            !doc.lifecycle?.archiveManifestUrl
          ) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Archival manifest not found',
            });
          }

          const { data, error } = await this.supabase
            .getAdminClient()
            .storage.from(env.SUPABASE_ARCHIVE_BUCKET_NAME)
            .createSignedUrl(doc.lifecycle.archiveManifestUrl, 300);

          if (error || !data) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to generate signed URL for manifest',
            });
          }

          return { signedUrl: data.signedUrl };
        }),
    });
  }
}
