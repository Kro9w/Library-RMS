// apps/api/src/documents/documents.router.ts

import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../trpc/trpc';
import { PrismaService } from '../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { TRPCError } from '@trpc/server';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DocumentsRouter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  createRouter() {
    return router({
      /**
       * Gets a single document by its ID.
       */
      getById: protectedProcedure
        .meta({
          openapi: {
            method: 'GET',
            path: '/documents.getById',
            tags: ['documents'],
            summary: 'Get a document by ID',
          },
        })
        .input(z.object({ id: z.string() }))
        .output(z.any())
        .query(async ({ ctx, input }) => {
          if (!ctx.dbUser.organizationId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an organization.',
            });
          }
          
          const doc = await this.prisma.document.findFirst({
            where: {
              id: input.id,
              organizationId: ctx.dbUser.organizationId,
            },
            select: {
              id: true,
              title: true,
              createdAt: true,
              fileType: true,
              s3Key: true,
              s3Bucket: true,
              uploadedBy: {
                select: {
                  name: true,
                },
              },
            },
          });

          if (!doc) {
            throw new TRPCError({ code: 'NOT_FOUND' });
          }
          return doc;
        }),

      /**
       * Creates a document record in our database.
       */
      createDocumentRecord: protectedProcedure
        .meta({
          openapi: {
            method: 'POST',
            path: '/documents.createRecord',
            tags: ['documents'],
            summary: 'Create document record after upload',
          },
        })
        .input(
          z.object({
            title: z.string(),
            storageKey: z.string(),
            storageBucket: z.string(),
            fileType: z.string().optional(),
            fileSize: z.number().optional(),
          }),
        )
        .output(z.any())
        .mutation(async ({ ctx, input }) => {
          const { user, dbUser } = ctx;
          if (!ctx.dbUser.organizationId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an organization.',
            });
          }
          return this.prisma.document.create({
            data: {
              title: input.title,
              s3Key: input.storageKey,
              s3Bucket: input.storageBucket,
              content: '',
              uploadedById: user.id,
              organizationId: dbUser.organizationId!,
              fileType: input.fileType,
              fileSize: input.fileSize,
            },
          });
        }),

      /**
       * Gets a temporary signed URL to view a private document.
       */
      getSignedDocumentUrl: protectedProcedure
        .meta({
          openapi: {
            method: 'GET',
            path: '/documents.getSignedUrl',
            tags: ['documents'],
            summary: 'Get a signed URL for a document',
          },
        })
        .input(z.object({ documentId: z.string() }))
        .output(z.object({ signedUrl: z.string() }))
        .query(async ({ ctx, input }) => {
          if (!ctx.dbUser.organizationId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an organization.',
            });
          }
          
          const doc = await this.prisma.document.findFirst({
            where: {
              id: input.documentId,
              organizationId: ctx.dbUser.organizationId,
            },
            select: {
              s3Key: true,
              s3Bucket: true,
            },
          });

          if (!doc) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Document not found in getSignedDocumentUrl',
            });
          }

          if (!doc.s3Key || !doc.s3Bucket) {
             throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Document record is missing storage key or bucket.',
            });
          }

          const { data, error } = await this.supabase
            .getAdminClient()
            .storage.from(doc.s3Bucket)
            .createSignedUrl(doc.s3Key, 300);

          if (error) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `Could not generate signed URL: ${error.message}`,
            });
          }
          return { signedUrl: data.signedUrl };
        }),

      // ... (rest of your procedures: getAppUsers, getAll, etc.)
      getAppUsers: protectedProcedure
        .meta({
          openapi: {
            method: 'GET',
            path: '/documents.getAppUsers',
            tags: ['documents', 'users'],
            summary: 'Get all users in the organization',
          },
        })
        .input(z.void())
        .output(z.any())
        .query(async ({ ctx }) => {
          if (!ctx.dbUser.organizationId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an organization.',
            });
          }
          return this.prisma.user.findMany({
            where: {
              organizationId: ctx.dbUser.organizationId,
            },
          });
        }),

      getAll: protectedProcedure
        .meta({
          openapi: {
            method: 'GET',
            path: '/documents.getAll',
            tags: ['documents'],
            summary: 'Get all documents in the organization',
          },
        })
        .input(z.void())
        .output(z.any())
        .query(async ({ ctx }) => {
          if (!ctx.dbUser.organizationId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an organization.',
            });
          }
          return this.prisma.document.findMany({
            where: {
              organizationId: ctx.dbUser.organizationId,
            },
            select: {
              id: true,
              title: true,
              createdAt: true,
              uploadedBy: { select: { name: true } },
              fileType: true,
              fileSize: true,
              uploadedById: true,
              organizationId: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          });
        }),

      getDocumentsByUserId: protectedProcedure
        .meta({
          openapi: {
            method: 'GET',
            path: '/documents.getDocumentsByUserId',
            tags: ['documents'],
            summary: "Get all documents for a specific user",
          },
        })
        .input(z.string())
        .output(z.any())
        .query(async ({ ctx, input: userId }) => {
          if (!ctx.dbUser.organizationId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an organization.',
            });
          }
          const userToQuery = await this.prisma.user.findFirst({
            where: {
              id: userId,
              organizationId: ctx.dbUser.organizationId,
            },
          });
          if (!userToQuery) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'User not found in your organization.',
            });
          }
          return this.prisma.document.findMany({
            where: {
              organizationId: ctx.dbUser.organizationId,
              uploadedById: userId,
            },
          });
        }),

      deleteDocument: protectedProcedure
        .meta({
          openapi: {
            method: 'DELETE',
            path: '/documents.delete',
            tags: ['documents'],
            summary: 'Delete a document',
          },
        })
        .input(z.object({ id: z.string() }))
        .output(z.any())
        .mutation(async ({ ctx, input }) => {
          if (!ctx.dbUser.organizationId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an organization.',
            });
          }

          const userRoles = await ctx.prisma.userRole.findMany({
            where: { userId: ctx.dbUser.id },
            include: { role: true },
          });

          const canManageDocuments = userRoles.some(
            (userRole) => userRole.role.canManageDocuments
          );

          if (!canManageDocuments) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You do not have permission to delete documents.',
            });
          }

          const doc = await this.prisma.document.findFirst({
            where: {
              id: input.id,
              organizationId: ctx.dbUser.organizationId,
            },
            select: {
              id: true,
              s3Key: true,
              s3Bucket: true,
            },
          });
          if (!doc) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Document not found or you lack permissions.',
            });
          }
          const { error: storageError } = await this.supabase
            .getAdminClient()
            .storage.from(doc.s3Bucket)
            .remove([doc.s3Key]);
          if (storageError) {
            console.error('Failed to delete file from storage:', storageError);
          }
          return this.prisma.document.delete({
            where: { id: doc.id },
          });
        }),

      transferDocument: protectedProcedure
        .meta({
          openapi: {
            method: 'POST',
            path: '/documents.transfer',
            tags: ['documents'],
            summary: 'Transfer a document to another user',
          },
        })
        .input(z.object({ docId: z.string(), newOwnerEmail: z.string() }))
        .output(z.any())
        .mutation(async ({ ctx, input }) => {
          if (!ctx.dbUser.organizationId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an organization.',
            });
          }
          const newOwner = await this.prisma.user.findFirst({
            where: {
              email: input.newOwnerEmail,
              organizationId: ctx.dbUser.organizationId,
            },
          });
          if (!newOwner) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'New owner not found in your organization.',
            });
          }
          const doc = await this.prisma.document.findFirst({
            where: {
              id: input.docId,
              organizationId: ctx.dbUser.organizationId,
            },
          });
          if (!doc) {
            throw new TRPCError({ code: 'NOT_FOUND' });
          }
          return this.prisma.document.update({
            where: { id: doc.id },
            data: {
              uploadedById: newOwner.id,
            },
          });
        }),

      getTags: protectedProcedure
        .meta({
          openapi: {
            method: 'GET',
            path: '/documents.getTags',
            tags: ['tags'],
            summary: 'Get all tags with document count',
          },
        })
        .input(z.void())
        .output(z.any())
        .query(async ({ ctx }) => {
          return this.prisma.tag.findMany({
            include: {
              _count: {
                select: { documents: true },
              },
            },
          });
        }),

      createTag: protectedProcedure
        .meta({
          openapi: {
            method: 'POST',
            path: '/documents.createTag',
            tags: ['tags'],
            summary: 'Create a new tag',
          },
        })
        .input(z.object({ name: z.string().min(1) }))
        .output(z.any())
        .mutation(async ({ ctx, input }) => {
          return this.prisma.tag.create({
            data: {
              name: input.name,
            },
          });
        }),

      updateTag: protectedProcedure
        .meta({
          openapi: {
            method: 'POST',
            path: '/documents.updateTag',
            tags: ['tags'],
            summary: 'Update a tag',
          },
        })
        .input(z.object({ id: z.string(), name: z.string().min(1) }))
        .output(z.any())
        .mutation(async ({ ctx, input }) => {
          return this.prisma.tag.update({
            where: { id: input.id },
            data: { name: input.name },
          });
        }),

      deleteTag: protectedProcedure
        .meta({
          openapi: {
            method: 'DELETE',
            path: '/documents.deleteTag',
            tags: ['tags'],
            summary: 'Delete a tag',
          },
        })
        .input(z.string())
        .output(z.any())
        .mutation(async ({ ctx, input: tagId }) => {
          return this.prisma.tag.delete({
            where: { id: tagId },
          });
        }),
      
      // --- NEW PROCEDURES FOR GLOBAL GRAPH VIEW ---
      getAllOrgs: protectedProcedure
        .meta({
          openapi: {
            method: 'GET',
            path: '/documents.getAllOrgs',
            tags: ['documents', 'admin'],
            summary: 'Get all organizations',
          },
        })
        .input(z.void())
        .output(z.any())
        .query(async ({ ctx }) => {
          // You might want to add admin-level protection here
          return this.prisma.organization.findMany();
        }),

      getAllUsers: protectedProcedure
        .meta({
          openapi: {
            method: 'GET',
            path: '/documents.getAllUsers',
            tags: ['documents', 'admin'],
            summary: 'Get all users in the system',
          },
        })
        .input(z.void())
        .output(z.any())
        .query(async ({ ctx }) => {
          // You might want to add admin-level protection here
          return this.prisma.user.findMany();
        }),
      
      getAllDocs: protectedProcedure
        .meta({
          openapi: {
            method: 'GET',
            path: '/documents.getAllDocs',
            tags: ['documents', 'admin'],
            summary: 'Get all documents in the system',
          },
        })
        .input(z.void())
        .output(z.any())
        .query(async ({ ctx }) => {
          const userRoles = await ctx.prisma.userRole.findMany({
            where: { userId: ctx.dbUser.id },
            include: { role: true },
          });

          const canManageDocuments = userRoles.some(
            (userRole) => userRole.role.canManageDocuments
          );

          if (canManageDocuments) {
            return this.prisma.document.findMany({
              select: {
                id: true,
                title: true,
                createdAt: true,
                uploadedBy: { select: { name: true } },
                fileType: true,
                fileSize: true,
                uploadedById: true,
                organizationId: true,
              },
            });
          }

          if (!ctx.dbUser.organizationId) {
            return [];
          }

          return this.prisma.document.findMany({
            where: {
              organizationId: ctx.dbUser.organizationId,
            },
             select: {
              id: true,
              title: true,
              createdAt: true,
              uploadedBy: { select: { name: true } },
              fileType: true,
              fileSize: true,
              uploadedById: true,
              organizationId: true,
            },
          });
        }),
      // --- END NEW PROCEDURES ---
      
      // --- NEW QUERY ---
      getMyDocuments: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.dbUser.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'User does not belong to an organization.',
          });
        }
        return ctx.prisma.document.findMany({
          where: {
            uploadedById: ctx.dbUser.id,
            organizationId: ctx.dbUser.organizationId,
          },
        });
      }),
      // --- END OF NEW QUERY ---
    });
  }
}