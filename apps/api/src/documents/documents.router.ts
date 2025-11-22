// apps/api/src/documents/documents.router.ts

import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../trpc/trpc';
import { PrismaService } from '../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { TRPCError } from '@trpc/server';
import { SupabaseService } from '../supabase/supabase.service';
import { UserService } from '../user/user.service';

@Injectable()
export class DocumentsRouter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly userService: UserService,
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
              documentType: true,
              uploadedBy: {
                select: {
                  name: true,
                },
              },
              reviewRequester: {
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
            documentTypeId: z.string().optional(),
            controlNumber: z.string().optional().nullable(),
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

          const userRoles = await this.userService.getUserRoles(user.id);

          const document = await this.prisma.document.create({
            data: {
              title: input.title,
              fileName: input.title,
              s3Key: input.storageKey,
              s3Bucket: input.storageBucket,
              content: '',
              uploadedById: user.id,
              organizationId: dbUser.organizationId!,
              fileType: input.fileType,
              fileSize: input.fileSize,
              documentTypeId: input.documentTypeId,
              controlNumber: input.controlNumber,
            },
          });

          await this.prisma.log.create({
            data: {
              action: `Created document: ${document.title}`,
              userId: user.id,
              organizationId: dbUser.organizationId!,
              userRole: userRoles.map((userRole) => userRole.role.name).join(', '),
            },
          });

          return document;
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
          return this.prisma.user.findMany();
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
        .input(z.object({ filter: z.string() }))
        .output(z.any())
        .query(async ({ ctx, input }) => {
          if (!ctx.dbUser.organizationId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an organization.',
            });
          }

          const whereClause: any = {
            organizationId: ctx.dbUser.organizationId,
          };

          if (input.filter === 'mine') {
            whereClause.uploadedById = ctx.user.id;
          }

          return this.prisma.document.findMany({
            where: whereClause,
            select: {
              id: true,
              title: true,
              createdAt: true,
              uploadedBy: { select: { name: true } },
              fileType: true,
              fileSize: true,
              uploadedById: true,
              organizationId: true,
              documentType: true,
              controlNumber: true,
              tags: {
                select: {
                  tag: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
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

          const userRoles = await this.userService.getUserRoles(ctx.dbUser.id);

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
              title: true,
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
          
          await this.prisma.log.create({
            data: {
              action: `Deleted document: ${doc.title}`,
              userId: ctx.dbUser.id,
              organizationId: ctx.dbUser.organizationId!,
              userRole: userRoles.map((userRole) => userRole.role.name).join(', '),
            },
          });

          return this.prisma.document.delete({
            where: { id: doc.id },
          });
        }),

      sendDocument: protectedProcedure
        .input(
          z.object({
            documentId: z.string(),
            recipientId: z.string(),
            tagIds: z.array(z.string()),
            tagsToKeep: z.array(z.string()).optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const { user, dbUser } = ctx;

          if (!dbUser.organizationId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an organization.',
            });
          }

          const recipient = await this.prisma.user.findUnique({
            where: { id: input.recipientId },
          });

          if (!recipient) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Recipient not found.',
            });
          }

          const tags = await this.prisma.tag.findMany({
            where: {
              id: {
                in: input.tagIds,
              },
            },
          });

          const isReview = tags.some((tag) => tag.name === 'for review');

          const updatedDocument = await this.prisma.document.update({
            where: { id: input.documentId },
            data: {
              uploadedById: recipient.id,
              reviewRequesterId: isReview ? user.id : null,
              tags: {
                deleteMany: {
                  NOT: {
                    tagId: {
                      in: input.tagsToKeep || [],
                    },
                  },
                },
                create: input.tagIds.map((tagId) => ({
                  tagId,
                })),
              },
            },
          });

          const userRoles = await this.userService.getUserRoles(user.id);

          await this.prisma.log.create({
            data: {
              action: `Sent document: ${updatedDocument.title} to ${recipient.name}`,
              userId: user.id,
              organizationId: dbUser.organizationId,
              userRole: userRoles.map((userRole) => userRole.role.name).join(', '),
            },
          });

          return updatedDocument;
        }),

      reviewDocument: protectedProcedure
        .input(
          z.object({
            documentId: z.string(),
            status: z.enum(['approved', 'returned', 'disapproved']),
            remarks: z.string().optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const { user, dbUser } = ctx;

          if (!dbUser.organizationId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an organization.',
            });
          }

          const userRoles = await this.userService.getUserRoles(user.id);
          const canManageDocuments = userRoles.some(
            (userRole) => userRole.role.canManageDocuments,
          );

          if (!canManageDocuments) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You do not have permission to review documents.',
            });
          }

          const document = await this.prisma.document.findUnique({
            where: { id: input.documentId },
          });

          if (!document) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Document not found.',
            });
          }

          if (input.remarks) {
            await this.prisma.remark.create({
              data: {
                message: input.remarks,
                documentId: input.documentId,
                authorId: user.id,
              },
            });
          }

          const forReviewTag = await this.prisma.tag.findUnique({
            where: { name: 'for review' },
          });

          const updatedDocument = await this.prisma.document.update({
            where: { id: input.documentId },
            data: {
              status: input.status,
              tags: {
                deleteMany: forReviewTag ? { tagId: forReviewTag.id } : {},
                create: {
                  tag: {
                    connect: { name: input.status },
                  },
                },
              },
            },
          });

          await this.prisma.log.create({
            data: {
              action: `Reviewed document: ${updatedDocument.title} with status ${input.status}`,
              userId: user.id,
              organizationId: dbUser.organizationId,
              userRole: userRoles.map((userRole) => userRole.role.name).join(', '),
            },
          });

          return updatedDocument;
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
            where: {
              isGlobal: false,
            },
            include: {
              _count: {
                select: { documents: true },
              },
            },
          });
        }),
      
      getGlobalTags: protectedProcedure
        .meta({
          openapi: {
            method: 'GET',
            path: '/documents.getGlobalTags',
            tags: ['tags'],
            summary: 'Get all global tags with document count',
          },
        })
        .input(z.void())
        .output(z.any())
        .query(async ({ ctx }) => {
          return this.prisma.tag.findMany({
            where: {
              isGlobal: true,
            },
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

      getRemarks: protectedProcedure
        .input(z.object({ documentId: z.string() }))
        .query(async ({ ctx, input }) => {
          if (!ctx.dbUser.organizationId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an organization.',
            });
          }

          return this.prisma.remark.findMany({
            where: {
              documentId: input.documentId,
            },
            orderBy: {
              createdAt: 'desc',
            },
            include: {
              author: {
                select: {
                  name: true,
                },
              },
            },
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
                documentType: true,
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