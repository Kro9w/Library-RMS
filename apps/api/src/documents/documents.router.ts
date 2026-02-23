// apps/api/src/documents/documents.router.ts

import { z } from 'zod';
import {
  protectedProcedure,
  router,
  requirePermission,
  checkPermission,
} from '../trpc/trpc';
import { PrismaService } from '../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { TRPCError } from '@trpc/server';
import { SupabaseService } from '../supabase/supabase.service';
import { LogService } from '../log/log.service';
import { env } from '../env';

function computeLifecycleStatus(doc: {
  createdAt: Date;
  activeRetentionSnapshot: number | null;
  inactiveRetentionSnapshot: number | null;
  dispositionStatus: string | null;
}): 'Active' | 'Inactive' | 'Ready' | 'Archived' | 'Destroyed' | null {
  if (doc.dispositionStatus === 'DESTROYED') return 'Destroyed';
  if (doc.dispositionStatus === 'ARCHIVED') return 'Archived';

  // If no retention schedule, treat as Active
  if (
    doc.activeRetentionSnapshot === null ||
    doc.activeRetentionSnapshot === undefined
  ) {
    return 'Active';
  }

  const now = new Date();
  const created = new Date(doc.createdAt);

  const activeUntil = new Date(created);
  activeUntil.setFullYear(
    activeUntil.getFullYear() + doc.activeRetentionSnapshot,
  );

  if (now < activeUntil) return 'Active';

  const inactiveUntil = new Date(activeUntil);
  inactiveUntil.setFullYear(
    inactiveUntil.getFullYear() + (doc.inactiveRetentionSnapshot || 0),
  );

  if (now < inactiveUntil) return 'Inactive';

  return 'Ready';
}

@Injectable()
export class DocumentsRouter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly logService: LogService,
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
                  firstName: true,
                  middleName: true,
                  lastName: true,
                },
              },
              reviewRequester: {
                select: {
                  firstName: true,
                  middleName: true,
                  lastName: true,
                },
              },
              tags: true,
              activeRetentionSnapshot: true,
              inactiveRetentionSnapshot: true,
              dispositionActionSnapshot: true,
              dispositionStatus: true,
            },
          });

          if (!doc) {
            throw new TRPCError({ code: 'NOT_FOUND' });
          }
          return {
            ...doc,
            lifecycleStatus: computeLifecycleStatus(doc),
          };
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
          if (!dbUser.organizationId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an organization.',
            });
          }

          if (input.storageBucket !== env.SUPABASE_BUCKET_NAME) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Invalid storage bucket.',
            });
          }

          if (!input.storageKey.startsWith(`${user.id}/`)) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Invalid storage key. Must start with your user ID.',
            });
          }

          let retentionSnapshot = {};
          if (input.documentTypeId) {
            const docType = await this.prisma.documentType.findUnique({
              where: { id: input.documentTypeId },
            });
            if (docType) {
              retentionSnapshot = {
                activeRetentionSnapshot: docType.activeRetentionDuration,
                inactiveRetentionSnapshot: docType.inactiveRetentionDuration,
                dispositionActionSnapshot: docType.dispositionAction,
              };
            }
          }

          const document = await this.prisma.document.create({
            data: {
              title: input.title,
              fileName: input.title,
              s3Key: input.storageKey,
              s3Bucket: input.storageBucket,
              content: '',
              uploadedById: user.id,
              organizationId: dbUser.organizationId,
              fileType: input.fileType,
              fileSize: input.fileSize,
              documentTypeId: input.documentTypeId,
              controlNumber: input.controlNumber,
              ...retentionSnapshot,
            },
          });

          await this.logService.logAction(
            user.id,
            dbUser.organizationId,
            'Created Document',
            dbUser.roles.map((r) => r.name),
            document.title,
          );

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
            where: { organizationId: ctx.dbUser.organizationId },
          });
        }),

      // Consolidated getAll procedure
      getAll: protectedProcedure
        .meta({
          openapi: {
            method: 'GET',
            path: '/documents.getAll',
            tags: ['documents'],
            summary: 'Get all documents in the organization',
          },
        })
        .input(
          z.object({
            filter: z.enum(['mine', 'all']).optional(),
          }),
        )
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

          const docs = await this.prisma.document.findMany({
            where: whereClause,
            select: {
              id: true,
              title: true,
              createdAt: true,
              uploadedBy: {
                select: { firstName: true, middleName: true, lastName: true },
              },
              fileType: true,
              fileSize: true,
              uploadedById: true,
              organizationId: true,
              documentType: true,
              controlNumber: true,
              tags: {
                select: {
                  id: true,
                  name: true,
                },
              },
              activeRetentionSnapshot: true,
              inactiveRetentionSnapshot: true,
              dispositionActionSnapshot: true,
              dispositionStatus: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          });

          return docs.map((doc) => ({
            ...doc,
            tags: doc.tags.map((t) => ({ tag: t })),
            lifecycleStatus: computeLifecycleStatus(doc),
          }));
        }),

      // Preserved for backward compatibility but implemented efficiently
      getDocumentsByUserId: protectedProcedure
        .meta({
          openapi: {
            method: 'GET',
            path: '/documents.getDocumentsByUserId',
            tags: ['documents'],
            summary: 'Get all documents for a specific user',
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
          // Verify user exists in org
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

          requirePermission(ctx.dbUser, 'canManageDocuments');

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
              organizationId: true,
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

          await this.logService.logAction(
            ctx.dbUser.id,
            doc.organizationId,
            'Deleted Document',
            ctx.dbUser.roles.map((r) => r.name),
            doc.title,
          );

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

          // Verify ownership of all documents to prevent unauthorized access
          const documents = await this.prisma.document.findMany({
            where: {
              id: input.documentId,
              organizationId: dbUser.organizationId,
            },
          });

          if (documents.length === 0) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'One or more documents not found or access denied.',
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
                set: [
                  ...input.tagIds.map((id) => ({ id })),
                  ...(input.tagsToKeep || []).map((id) => ({ id })),
                ],
              },
            },
          });

          await this.logService.logAction(
            user.id,
            dbUser.organizationId,
            `Sent Document to ${recipient.firstName} ${recipient.lastName}`,
            dbUser.roles.map((r) => r.name),
            updatedDocument.title,
          );

          return updatedDocument;
        }),

      sendMultipleDocuments: protectedProcedure
        .input(
          z.object({
            documentIds: z.array(z.string()),
            recipientId: z.string(),
            tagIds: z.array(z.string()),
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

          // Verify ownership of all documents to prevent unauthorized access
          const documents = await this.prisma.document.findMany({
            where: {
              id: { in: input.documentIds },
              organizationId: dbUser.organizationId,
            },
          });

          if (documents.length !== input.documentIds.length) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'One or more documents not found or access denied.',
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

          // Use transaction for atomicity: all documents are sent or none
          const results = await this.prisma.$transaction(
            input.documentIds.map((documentId) =>
              this.prisma.document.update({
                where: { id: documentId },
                data: {
                  uploadedById: recipient.id,
                  reviewRequesterId: isReview ? user.id : null,
                  tags: {
                    set: input.tagIds.map((id) => ({ id })),
                  },
                },
              }),
            ),
          );

          // Log actions after successful transaction using batch logging
          const userRoles = dbUser.roles.map((r) => r.name);
          await this.logService.logActions(
            results.map((updatedDocument) => ({
              userId: user.id,
              organizationId: dbUser.organizationId!,
              action: `Sent Document to ${recipient.firstName} ${recipient.lastName}`,
              roles: userRoles,
              targetName: updatedDocument.title,
            })),
          );

          return results;
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

          requirePermission(dbUser, 'canManageDocuments');

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

          const statusTag = await this.prisma.tag.findUnique({
            where: { name: input.status },
          });

          const updatedDocument = await this.prisma.document.update({
            where: { id: input.documentId },
            data: {
              status: input.status,
              tags: {
                disconnect: forReviewTag ? [{ id: forReviewTag.id }] : [],
                connect: statusTag ? [{ id: statusTag.id }] : [],
              },
            },
          });

          await this.logService.logAction(
            user.id,
            dbUser.organizationId,
            `Reviewed Document (Status: ${input.status})`,
            dbUser.roles.map((r) => r.name),
            updatedDocument.title,
          );

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
        .query(async () => {
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
        .query(async () => {
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
        .mutation(async ({ input }) => {
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
        .mutation(async ({ input }) => {
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
        .mutation(async ({ input: tagId }) => {
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
                  firstName: true,
                  middleName: true,
                  lastName: true,
                },
              },
            },
          });
        }),

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
          requirePermission(ctx.dbUser, 'canManageDocuments');

          if (!ctx.dbUser.organizationId) {
            return [];
          }

          return this.prisma.organization.findMany({
            where: {
              id: ctx.dbUser.organizationId,
            },
          });
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
          requirePermission(ctx.dbUser, 'canManageUsers');

          if (!ctx.dbUser.organizationId) {
            return [];
          }

          return this.prisma.user.findMany({
            where: {
              organizationId: ctx.dbUser.organizationId,
            },
          });
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
          const canManageDocuments = checkPermission(
            ctx.dbUser,
            'canManageDocuments',
          );

          let docs;
          if (canManageDocuments) {
            if (!ctx.dbUser.organizationId) {
              return [];
            }
            docs = await this.prisma.document.findMany({
              where: {
                organizationId: ctx.dbUser.organizationId,
              },
              select: {
                id: true,
                title: true,
                createdAt: true,
                uploadedBy: {
                  select: { firstName: true, middleName: true, lastName: true },
                },
                fileType: true,
                fileSize: true,
                uploadedById: true,
                organizationId: true,
                documentType: true,
                activeRetentionSnapshot: true,
                inactiveRetentionSnapshot: true,
                dispositionActionSnapshot: true,
                dispositionStatus: true,
              },
            });
          } else if (ctx.dbUser.organizationId) {
            docs = await this.prisma.document.findMany({
              where: {
                organizationId: ctx.dbUser.organizationId,
              },
              select: {
                id: true,
                title: true,
                createdAt: true,
                uploadedBy: {
                  select: { firstName: true, middleName: true, lastName: true },
                },
                fileType: true,
                fileSize: true,
                uploadedById: true,
                organizationId: true,
                activeRetentionSnapshot: true,
                inactiveRetentionSnapshot: true,
                dispositionActionSnapshot: true,
                dispositionStatus: true,
              },
            });
          } else {
            return [];
          }

          return docs.map((doc) => ({
            ...doc,
            lifecycleStatus: computeLifecycleStatus(doc),
          }));
        }),

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

      executeDisposition: protectedProcedure
        .input(z.object({ documentId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const { user, dbUser } = ctx;
          if (!dbUser.organizationId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an organization.',
            });
          }

          requirePermission(dbUser, 'canManageDocuments');

          const doc = await ctx.prisma.document.findUnique({
            where: { id: input.documentId },
          });

          if (!doc) throw new TRPCError({ code: 'NOT_FOUND' });

          const status = computeLifecycleStatus(doc);
          if (status !== 'Ready') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Document is not ready for disposition',
            });
          }

          const action = doc.dispositionActionSnapshot;

          if (action === 'DESTROY') {
            // Delete from S3
            if (doc.s3Key && doc.s3Bucket) {
              const { error: storageError } = await this.supabase
                .getAdminClient()
                .storage.from(doc.s3Bucket)
                .remove([doc.s3Key]);

              if (storageError) {
                console.error(
                  'Failed to delete file from storage during disposition:',
                  storageError,
                );
                // We might still want to proceed with DB update or throw?
                // Proceeding ensures DB reflects intent, but file remains orphan.
              }
            }

            const updatedDoc = await this.prisma.document.update({
              where: { id: doc.id },
              data: { dispositionStatus: 'DESTROYED' },
            });

            await this.logService.logAction(
              user.id,
              dbUser.organizationId,
              'Executed Disposition (DESTROY)',
              dbUser.roles.map((r) => r.name),
              doc.title,
            );
            return updatedDoc;
          } else if (action === 'ARCHIVE') {
            const updatedDoc = await this.prisma.document.update({
              where: { id: doc.id },
              data: { dispositionStatus: 'ARCHIVED' },
            });

            await this.logService.logAction(
              user.id,
              dbUser.organizationId,
              'Executed Disposition (ARCHIVE)',
              dbUser.roles.map((r) => r.name),
              doc.title,
            );
            return updatedDoc;
          }

          return doc;
        }),
    });
  }
}
