// apps/api/src/documents/documents.router.ts

import { z } from 'zod';
import { Prisma, PermissionLevel } from '@prisma/client';
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
import { AccessControlService } from './access-control.service';
import { env } from '../env';

function computeLifecycleStatus(doc: {
  createdAt: Date;
  activeRetentionSnapshot: number | null;
  inactiveRetentionSnapshot: number | null;
  dispositionStatus: string | null;
  isUnderLegalHold: boolean;
}):
  | 'Active'
  | 'Inactive'
  | 'Ready'
  | 'Archived'
  | 'Destroyed'
  | 'Legal Hold'
  | null {
  if (doc.isUnderLegalHold) return 'Legal Hold';

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
    private readonly accessControlService: AccessControlService,
  ) {}

  createRouter() {
    return router({
      /**
       * Get storage configuration (bucket name)
       */
      getStorageConfig: protectedProcedure
        .meta({
          openapi: {
            method: 'GET',
            path: '/documents.getStorageConfig',
            tags: ['documents', 'config'],
            summary: 'Get storage configuration',
          },
        })
        .input(z.void())
        .output(z.object({ bucketName: z.string() }))
        .query(() => {
          return { bucketName: env.SUPABASE_BUCKET_NAME };
        }),

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
          if (!ctx.dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an institution.',
            });
          }

          const aclWhere = this.accessControlService.generateAclWhereClause(
            ctx.dbUser,
          );

          const doc = await this.prisma.document.findFirst({
            where: {
              id: input.id,
              institutionId: ctx.dbUser.institutionId,
              AND: [aclWhere],
            },
            select: {
              id: true,
              title: true,
              createdAt: true,
              documentType: true,
              recordStatus: true,
              isCheckedOut: true,
              checkedOutBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
              versions: {
                orderBy: { versionNumber: 'desc' },
                include: {
                  uploadedBy: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
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
              status: true,
              remarks: {
                include: {
                  author: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
                orderBy: {
                  createdAt: 'desc',
                },
              },
              activeRetentionSnapshot: true,
              inactiveRetentionSnapshot: true,
              dispositionActionSnapshot: true,
              dispositionStatus: true,
              classification: true,
              originalSenderId: true,
              uploadedById: true,
              isUnderLegalHold: true,
              legalHoldReason: true,
              dispositionRequesterId: true,
            },
          });

          if (!doc) {
            throw new TRPCError({ code: 'NOT_FOUND' });
          }

          const latestVersion = doc.versions[0];

          return {
            ...doc,
            fileType: latestVersion?.fileType,
            s3Key: latestVersion?.s3Key,
            s3Bucket: latestVersion?.s3Bucket,
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
            classification: z
              .enum(['INSTITUTIONAL', 'CAMPUS', 'INTERNAL', 'CONFIDENTIAL'])
              .optional()
              .default('CONFIDENTIAL'),
          }),
        )
        .output(z.any())
        .mutation(async ({ ctx, input }) => {
          const { user, dbUser } = ctx;
          if (!dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an institution.',
            });
          }

          const highestRoleLevel =
            dbUser.roles.length > 0
              ? dbUser.roles.reduce(
                  (min, role) => Math.min(min, role.level),
                  Infinity,
                )
              : 4; // Default to lowest privilege if no roles are assigned

          const canManageDocs = checkPermission(dbUser, 'canManageDocuments');

          // Allow Level 1 users OR Admin equivalents (canManageDocuments) to broadcast wide
          if (
            input.classification === 'INSTITUTIONAL' ||
            input.classification === 'CAMPUS'
          ) {
            if (highestRoleLevel > 1 && !canManageDocs) {
              throw new TRPCError({
                code: 'FORBIDDEN',
                message:
                  'Only Level 1 users or Admins can broadcast Institutional or Campus documents.',
              });
            }
          }
          // Allow Level 1 & 2 users OR Admin equivalents to broadcast internally
          if (input.classification === 'INTERNAL') {
            if (highestRoleLevel > 2 && !canManageDocs) {
              throw new TRPCError({
                code: 'FORBIDDEN',
                message:
                  'Only Level 1 and 2 users or Admins can broadcast Internal department documents.',
              });
            }
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

          // Format Immutability: Institutional & Campus broadcasts must be non-editable formats
          if (
            input.classification === 'INSTITUTIONAL' ||
            input.classification === 'CAMPUS'
          ) {
            const allowedFormats = [
              'application/pdf',
              'image/jpeg',
              'image/png',
              'image/tiff',
            ];

            if (!input.fileType || !allowedFormats.includes(input.fileType)) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: `Published Institutional or Campus documents must be finalized formats (PDF or images). Received: ${input.fileType || 'Unknown'}`,
              });
            }
          }

          const allowedFinalFormats = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/tiff',
          ];
          const isFinal =
            input.fileType && allowedFinalFormats.includes(input.fileType)
              ? 'FINAL'
              : 'DRAFT';

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
              content: '',
              uploadedById: user.id,
              originalSenderId: user.id,
              institutionId: dbUser.institutionId,
              campusId: dbUser.campusId,
              departmentId: dbUser.departmentId,
              documentTypeId: input.documentTypeId,
              controlNumber: input.controlNumber,
              classification: input.classification,
              recordStatus: isFinal,
              ...retentionSnapshot,
              versions: {
                create: {
                  versionNumber: 1,
                  s3Key: input.storageKey,
                  s3Bucket: input.storageBucket,
                  fileType: input.fileType,
                  fileSize: input.fileSize,
                  uploadedById: user.id,
                },
              },
            },
          });

          const accessesToCreate: any[] = [];

          accessesToCreate.push({
            documentId: document.id,
            userId: user.id,
            permission: PermissionLevel.WRITE,
          });

          if (
            input.classification === 'INSTITUTIONAL' &&
            dbUser.institutionId
          ) {
            accessesToCreate.push({
              documentId: document.id,
              institutionId: dbUser.institutionId,
              permission: PermissionLevel.READ,
            });
          } else if (input.classification === 'CAMPUS' && dbUser.campusId) {
            accessesToCreate.push({
              documentId: document.id,
              campusId: dbUser.campusId,
              permission: PermissionLevel.READ,
            });
          } else if (
            input.classification === 'INTERNAL' &&
            dbUser.departmentId
          ) {
            accessesToCreate.push({
              documentId: document.id,
              departmentId: dbUser.departmentId,
              permission: PermissionLevel.READ,
            });
          }

          await this.prisma.documentAccess.createMany({
            data: accessesToCreate,
          });

          await this.logService.logAction(
            user.id,
            dbUser.institutionId,
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
        .input(
          z.object({
            documentId: z.string(),
            versionId: z.string().optional(),
          }),
        )
        .output(z.object({ signedUrl: z.string() }))
        .query(async ({ ctx, input }) => {
          if (!ctx.dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an institution.',
            });
          }

          const aclWhere = this.accessControlService.generateAclWhereClause(
            ctx.dbUser,
          );

          const doc = await this.prisma.document.findFirst({
            where: {
              id: input.documentId,
              institutionId: ctx.dbUser.institutionId,
              AND: [aclWhere],
            },
            select: {
              classification: true,
              uploadedById: true,
              originalSenderId: true,
              versions: {
                where: input.versionId ? { id: input.versionId } : undefined,
                orderBy: { versionNumber: 'desc' as const },
                take: 1,
              },
            },
          });

          if (!doc) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Document not found in getSignedDocumentUrl',
            });
          }

          const targetVersion = doc.versions[0];

          if (
            !targetVersion ||
            !targetVersion.s3Key ||
            !targetVersion.s3Bucket
          ) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Document version is missing storage key or bucket.',
            });
          }

          const { data, error } = await this.supabase
            .getAdminClient()
            .storage.from(targetVersion.s3Bucket)
            .createSignedUrl(targetVersion.s3Key, 300);

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
            summary: 'Get all users in the institution',
          },
        })
        .input(z.void())
        .output(z.any())
        .query(async ({ ctx }) => {
          if (!ctx.dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an institution.',
            });
          }
          return this.prisma.user.findMany({
            where: { institutionId: ctx.dbUser.institutionId },
          });
        }),

      // Consolidated getAll procedure
      getAll: protectedProcedure
        .meta({
          openapi: {
            method: 'GET',
            path: '/documents.getAll',
            tags: ['documents'],
            summary: 'Get all documents in the institution',
          },
        })
        .input(
          z.object({
            filter: z.enum(['mine', 'all']).optional(),
            page: z.number().min(1).default(1),
            perPage: z.number().min(1).max(100).default(25),
            search: z.string().optional(),
            lifecycleFilter: z.enum(['all', 'ready']).optional(),
          }),
        )
        .output(
          z.object({
            documents: z.array(z.any()),
            totalCount: z.number(),
          }),
        )
        .query(async ({ ctx, input }) => {
          if (!ctx.dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an institution.',
            });
          }

          const { page, perPage, search, filter, lifecycleFilter } = input;
          const skip = (page - 1) * perPage;

          // Helper to map and compute status
          const mapDocuments = (documents: any[]) => {
            return documents.map((doc) => ({
              ...doc,
              fileType: doc.versions?.[0]?.fileType,
              fileSize: doc.versions?.[0]?.fileSize,
              tags: doc.tags.map((t: any) => ({ tag: t })),
              lifecycleStatus: computeLifecycleStatus(doc),
            }));
          };

          const selectFields = {
            id: true,
            title: true,
            createdAt: true,
            uploadedBy: {
              select: {
                firstName: true,
                middleName: true,
                lastName: true,
                departmentId: true,
              },
            },
            uploadedById: true,
            institutionId: true,
            documentType: true,
            controlNumber: true,
            recordStatus: true,
            isCheckedOut: true,
            versions: {
              orderBy: { versionNumber: 'desc' as const },
              take: 1,
            },
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
            classification: true,
            originalSenderId: true,
            isUnderLegalHold: true,
            legalHoldReason: true,
            dispositionRequesterId: true,
          };

          // Optimized path for "Ready for Disposition"
          if (lifecycleFilter === 'ready') {
            const institutionId = ctx.dbUser.institutionId;

            const aclWhere = this.accessControlService.generateAclWhereClause(
              ctx.dbUser,
            );

            const lifecycleWhereClause: Prisma.DocumentWhereInput = {
              institutionId: ctx.dbUser.institutionId,
              dispositionStatus: { notIn: ['DESTROYED', 'ARCHIVED'] },
              activeRetentionSnapshot: { not: null },
              AND: [aclWhere],
            };

            if (filter === 'mine') {
              lifecycleWhereClause.uploadedById = ctx.user.id;
            }

            if (search) {
              lifecycleWhereClause.title = {
                contains: search,
                mode: 'insensitive',
              };
            }

            const rawQuery = Prisma.sql`
              SELECT d.id
              FROM "Document" d
              WHERE d."institutionId" = ${institutionId}
                AND d."dispositionStatus" NOT IN ('DESTROYED', 'ARCHIVED')
                AND d."activeRetentionSnapshot" IS NOT NULL
                AND d."isUnderLegalHold" = false
                AND (d."createdAt" + make_interval(years => d."activeRetentionSnapshot")) <= NOW()
                AND (d."createdAt" + make_interval(years => d."activeRetentionSnapshot") + make_interval(years => COALESCE(d."inactiveRetentionSnapshot", 0))) <= NOW()
            `;

            const rawResults =
              await this.prisma.$queryRaw<{ id: string }[]>(rawQuery);
            const matchingLifecycleIds = rawResults.map((r) => r.id);

            if (matchingLifecycleIds.length === 0) {
              return { documents: [], totalCount: 0 };
            }

            lifecycleWhereClause.id = { in: matchingLifecycleIds };

            const [totalCount, documents] = await this.prisma.$transaction([
              this.prisma.document.count({ where: lifecycleWhereClause }),
              this.prisma.document.findMany({
                where: lifecycleWhereClause,
                select: selectFields,
                orderBy: { createdAt: 'desc' },
                skip,
                take: perPage,
              }),
            ]);

            return {
              documents: mapDocuments(documents),
              totalCount,
            };
          }

          // Standard path (No lifecycle filter or 'all')
          const whereClause: Prisma.DocumentWhereInput = {
            institutionId: ctx.dbUser.institutionId,
          };

          if (filter === 'mine') {
            whereClause.uploadedById = ctx.user.id;
          }

          if (search) {
            whereClause.title = {
              contains: search,
              mode: 'insensitive',
            };
          }

          const aclWhere = this.accessControlService.generateAclWhereClause(
            ctx.dbUser,
          );

          whereClause.AND = [aclWhere];

          const [totalCount, documents] = await this.prisma.$transaction([
            this.prisma.document.count({ where: whereClause }),
            this.prisma.document.findMany({
              where: whereClause,
              select: selectFields,
              orderBy: {
                createdAt: 'desc',
              },
              skip,
              take: perPage,
            }),
          ]);

          return {
            documents: mapDocuments(documents),
            totalCount,
          };
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
          if (!ctx.dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an institution.',
            });
          }

          requirePermission(ctx.dbUser, 'canManageDocuments');

          const aclWhere = this.accessControlService.generateAclWhereClause(
            ctx.dbUser,
          );

          const doc = await this.prisma.document.findFirst({
            where: {
              id: input.id,
              institutionId: ctx.dbUser.institutionId,
              AND: [aclWhere],
            },
            select: {
              id: true,
              title: true,
              institutionId: true,
              versions: {
                select: {
                  s3Key: true,
                  s3Bucket: true,
                },
              },
            },
          });
          if (!doc) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Document not found or you lack permissions.',
            });
          }

          for (const version of doc.versions) {
            if (version.s3Key && version.s3Bucket) {
              const { error: storageError } = await this.supabase
                .getAdminClient()
                .storage.from(version.s3Bucket)
                .remove([version.s3Key]);
              if (storageError) {
                console.error(
                  'Failed to delete file from storage:',
                  storageError,
                );
              }
            }
          }

          await this.logService.logAction(
            ctx.dbUser.id,
            doc.institutionId,
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

          if (!dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an institution.',
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
          const whereClause: any = {
            id: input.documentId,
            institutionId: dbUser.institutionId,
          };

          if (!checkPermission(dbUser, 'canManageDocuments')) {
            whereClause.uploadedById = user.id;
          }

          const documents = await this.prisma.document.findMany({
            where: whereClause,
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

          if (isReview && documents[0].classification !== 'CONFIDENTIAL') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Only confidential documents can be sent for review.',
            });
          }

          const updatedDocument = await this.prisma.document.update({
            where: { id: input.documentId },
            data: {
              uploadedById: recipient.id,
              reviewRequesterId: isReview ? user.id : null,
              status: isReview ? null : undefined, // Clear status if re-submitting for review
              tags: {
                set: [
                  ...input.tagIds.map((id) => ({ id })),
                  ...(input.tagsToKeep || []).map((id) => ({ id })),
                ],
              },
            },
          });

          await this.prisma.documentAccess.create({
            data: {
              documentId: updatedDocument.id,
              userId: recipient.id,
              permission: PermissionLevel.WRITE,
            },
          });

          await this.logService.logAction(
            user.id,
            dbUser.institutionId,
            `Sent Document to ${recipient.firstName} ${recipient.lastName}`,
            dbUser.roles.map((r) => r.name),
            updatedDocument.title,
          );

          // Notifications
          const senderName = `${dbUser.firstName} ${dbUser.lastName}`.trim();
          if (isReview) {
            await this.prisma.notification.create({
              data: {
                userId: recipient.id,
                title: 'Review Requested',
                message: `${senderName} has sent you a confidential document for review: "${updatedDocument.title}".`,
                documentId: updatedDocument.id,
              },
            });
          } else {
            await this.prisma.notification.create({
              data: {
                userId: recipient.id,
                title: 'Document Received',
                message: `${senderName} sent you a document: "${updatedDocument.title}".`,
                documentId: updatedDocument.id,
              },
            });
          }

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

          if (!dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an institution.',
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
          const whereClause: any = {
            id: { in: input.documentIds },
            institutionId: dbUser.institutionId,
          };

          if (!checkPermission(dbUser, 'canManageDocuments')) {
            whereClause.uploadedById = user.id;
          }

          const documents = await this.prisma.document.findMany({
            where: whereClause,
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

          if (isReview) {
            const hasNonConfidential = documents.some(
              (doc) => doc.classification !== 'CONFIDENTIAL',
            );
            if (hasNonConfidential) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Only confidential documents can be sent for review.',
              });
            }
          }

          // Use transaction for atomicity: all documents are sent or none
          const results = await this.prisma.$transaction(
            input.documentIds.map((documentId) =>
              this.prisma.document.update({
                where: { id: documentId },
                data: {
                  uploadedById: recipient.id,
                  reviewRequesterId: isReview ? user.id : null,
                  status: isReview ? null : undefined, // Clear status if re-submitting for review
                  tags: {
                    set: input.tagIds.map((id) => ({ id })),
                  },
                },
              }),
            ),
          );

          await this.prisma.documentAccess.createMany({
            data: results.map((doc) => ({
              documentId: doc.id,
              userId: recipient.id,
              permission: PermissionLevel.WRITE,
            })),
          });

          // Log actions after successful transaction using batch logging
          const userRoles = dbUser.roles.map((r) => r.name);
          await this.logService.logActions(
            results.map((updatedDocument) => ({
              userId: user.id,
              institutionId: dbUser.institutionId!,
              action: `Sent Document to ${recipient.firstName} ${recipient.lastName}`,
              roles: userRoles,
              targetName: updatedDocument.title,
            })),
          );

          // Notifications
          const senderName = `${dbUser.firstName} ${dbUser.lastName}`.trim();
          await this.prisma.notification.createMany({
            data: results.map((doc) => ({
              userId: recipient.id,
              title: isReview ? 'Review Requested' : 'Document Received',
              message: isReview
                ? `${senderName} has sent you a confidential document for review: "${doc.title}".`
                : `${senderName} sent you a document: "${doc.title}".`,
              documentId: doc.id,
            })),
          });

          return results;
        }),

      reviewDocument: protectedProcedure
        .input(
          z.object({
            documentId: z.string(),
            status: z.enum(['approved', 'returned', 'disapproved']),
            remarks: z.string().optional(),
            finalFileType: z.string().optional(),
            finalFileSize: z.number().optional(),
            finalStorageKey: z.string().optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const { user, dbUser } = ctx;

          if (!dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an institution.',
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

          // Format Immutability: You cannot approve a draft (editable format)
          if (input.status === 'approved') {
            const allowedFinalFormats = [
              'application/pdf',
              'image/jpeg',
              'image/png',
              'image/tiff',
            ];

            // Look up latest version file type
            const latestVersion = await this.prisma.documentVersion.findFirst({
              where: { documentId: document.id },
              orderBy: { versionNumber: 'desc' },
            });
            const fileTypeToCheck =
              input.finalFileType || latestVersion?.fileType;

            if (
              !fileTypeToCheck ||
              !allowedFinalFormats.includes(fileTypeToCheck)
            ) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message:
                  'Cannot approve an editable draft format. The final version must be uploaded as a PDF or image.',
              });
            }
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

          const maxVersion = await this.prisma.documentVersion.aggregate({
            where: { documentId: input.documentId },
            _max: { versionNumber: true },
          });
          const nextVersionNumber = (maxVersion._max.versionNumber || 0) + 1;

          const updateData: Prisma.DocumentUpdateInput = {
            status: input.status,
            tags: {
              disconnect: forReviewTag ? [{ id: forReviewTag.id }] : [],
              connect: statusTag ? [{ id: statusTag.id }] : [],
            },
          };

          if (input.status === 'approved' && input.finalStorageKey) {
            updateData.recordStatus = 'FINAL';
            updateData.versions = {
              create: {
                versionNumber: nextVersionNumber,
                s3Key: input.finalStorageKey,
                s3Bucket: env.SUPABASE_BUCKET_NAME,
                fileType: input.finalFileType,
                fileSize: input.finalFileSize,
                uploadedById: user.id,
              },
            };
          }

          const updatedDocument = await this.prisma.document.update({
            where: { id: input.documentId },
            data: updateData,
          });

          await this.logService.logAction(
            user.id,
            dbUser.institutionId,
            `Reviewed Document (Status: ${input.status})`,
            dbUser.roles.map((r) => r.name),
            updatedDocument.title,
          );

          // Notification to the requester
          if (document.reviewRequesterId) {
            const reviewerName =
              `${dbUser.firstName} ${dbUser.lastName}`.trim();
            await this.prisma.notification.create({
              data: {
                userId: document.reviewRequesterId,
                title: 'Review Completed',
                message: `${reviewerName} has marked your document "${updatedDocument.title}" as ${input.status}.`,
                documentId: updatedDocument.id,
              },
            });
          }

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
        .mutation(async ({ ctx, input: tagId }) => {
          const { dbUser } = ctx;

          if (!dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an institution.',
            });
          }

          requirePermission(dbUser, 'canManageDocuments');

          const tag = await this.prisma.tag.findUnique({
            where: { id: tagId },
          });

          if (!tag) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Tag not found.',
            });
          }

          if (tag.isGlobal || tag.isLocked) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Cannot delete global or locked tags.',
            });
          }

          // Check if tag is used by other institutions
          const isUsedByOthers = await this.prisma.document.findFirst({
            where: {
              tags: { some: { id: tagId } },
              institutionId: { not: dbUser.institutionId },
            },
          });

          if (isUsedByOthers) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Tag is in use by other institutions.',
            });
          }

          return this.prisma.tag.delete({
            where: { id: tagId },
          });
        }),

      getRemarks: protectedProcedure
        .input(z.object({ documentId: z.string() }))
        .query(async ({ ctx, input }) => {
          if (!ctx.dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an institution.',
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

      getAllInstitutions: protectedProcedure
        .meta({
          openapi: {
            method: 'GET',
            path: '/documents.getAllInstitutions',
            tags: ['documents', 'admin'],
            summary: 'Get all institutions',
          },
        })
        .input(z.void())
        .output(z.any())
        .query(async ({ ctx }) => {
          requirePermission(ctx.dbUser, 'canManageDocuments');

          if (!ctx.dbUser.institutionId) {
            return [];
          }

          return this.prisma.institution.findMany({
            where: {
              id: ctx.dbUser.institutionId,
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

          if (!ctx.dbUser.institutionId) {
            return [];
          }

          return this.prisma.user.findMany({
            where: {
              institutionId: ctx.dbUser.institutionId,
            },
          });
        }),

      applyLegalHold: protectedProcedure
        .input(z.object({ documentId: z.string(), reason: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const { user, dbUser } = ctx;
          if (!dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an institution.',
            });
          }

          requirePermission(dbUser, 'canManageDocuments');

          const doc = await ctx.prisma.document.update({
            where: {
              id: input.documentId,
              institutionId: dbUser.institutionId,
            },
            data: {
              isUnderLegalHold: true,
              legalHoldReason: input.reason,
            },
          });

          await this.logService.logAction(
            user.id,
            dbUser.institutionId,
            `Applied Legal Hold: ${input.reason}`,
            dbUser.roles.map((r) => r.name),
            doc.title,
          );

          return doc;
        }),

      removeLegalHold: protectedProcedure
        .input(z.object({ documentId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const { user, dbUser } = ctx;
          if (!dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an institution.',
            });
          }

          requirePermission(dbUser, 'canManageDocuments');

          const doc = await ctx.prisma.document.update({
            where: {
              id: input.documentId,
              institutionId: dbUser.institutionId,
            },
            data: {
              isUnderLegalHold: false,
              legalHoldReason: null,
            },
          });

          await this.logService.logAction(
            user.id,
            dbUser.institutionId,
            'Removed Legal Hold',
            dbUser.roles.map((r) => r.name),
            doc.title,
          );

          return doc;
        }),

      requestDisposition: protectedProcedure
        .input(z.object({ documentId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const { user, dbUser } = ctx;
          if (!dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an institution.',
            });
          }

          requirePermission(dbUser, 'canManageDocuments');

          const doc = await ctx.prisma.document.findUnique({
            where: { id: input.documentId },
          });

          if (!doc || doc.institutionId !== dbUser.institutionId) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Document not found',
            });
          }

          if (doc.isUnderLegalHold) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Document is under legal hold',
            });
          }

          const status = computeLifecycleStatus(doc);
          if (status !== 'Ready') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Document is not ready for disposition',
            });
          }

          const updatedDoc = await this.prisma.document.update({
            where: { id: input.documentId },
            data: {
              dispositionStatus: 'PENDING_DISPOSITION',
              dispositionRequesterId: user.id,
            },
          });

          await this.logService.logAction(
            user.id,
            dbUser.institutionId,
            'Disposition Approval Requested',
            dbUser.roles.map((r) => r.name),
            doc.title,
          );

          return updatedDoc;
        }),

      approveDisposition: protectedProcedure
        .input(z.object({ documentId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const { user, dbUser } = ctx;
          if (!dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an institution.',
            });
          }

          requirePermission(dbUser, 'canManageDocuments');

          const doc = await ctx.prisma.document.findUnique({
            where: { id: input.documentId },
          });

          if (!doc) throw new TRPCError({ code: 'NOT_FOUND' });

          if (doc.isUnderLegalHold) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Document is under legal hold',
            });
          }

          if (doc.dispositionStatus !== 'PENDING_DISPOSITION') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Document is not pending disposition',
            });
          }

          if (user.id === doc.dispositionRequesterId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message:
                'Separation of duties violation: You cannot approve a disposition you requested.',
            });
          }

          const action = doc.dispositionActionSnapshot;

          if (action === 'DESTROY') {
            // Delete from S3 for all versions
            const versions = await this.prisma.documentVersion.findMany({
              where: { documentId: doc.id },
            });

            for (const version of versions) {
              if (version.s3Key && version.s3Bucket) {
                const { error: storageError } = await this.supabase
                  .getAdminClient()
                  .storage.from(version.s3Bucket)
                  .remove([version.s3Key]);

                if (storageError) {
                  console.error(
                    'Failed to delete file from storage during disposition:',
                    storageError,
                  );
                }
              }
            }

            const updatedDoc = await this.prisma.document.update({
              where: { id: doc.id },
              data: { dispositionStatus: 'DESTROYED' },
            });

            await this.logService.logAction(
              user.id,
              dbUser.institutionId,
              'Approved and Executed Disposition (DESTROY)',
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
              dbUser.institutionId,
              'Approved and Executed Disposition (ARCHIVE)',
              dbUser.roles.map((r) => r.name),
              doc.title,
            );
            return updatedDoc;
          }

          return doc;
        }),

      rejectDisposition: protectedProcedure
        .input(z.object({ documentId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const { user, dbUser } = ctx;
          if (!dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an institution.',
            });
          }

          requirePermission(dbUser, 'canManageDocuments');

          const doc = await ctx.prisma.document.findUnique({
            where: { id: input.documentId },
          });

          if (!doc) throw new TRPCError({ code: 'NOT_FOUND' });

          if (doc.dispositionStatus !== 'PENDING_DISPOSITION') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Document is not pending disposition',
            });
          }

          const updatedDoc = await this.prisma.document.update({
            where: { id: input.documentId },
            data: {
              dispositionStatus: null,
              dispositionRequesterId: null,
            },
          });

          await this.logService.logAction(
            user.id,
            dbUser.institutionId,
            'Rejected Disposition Request',
            dbUser.roles.map((r) => r.name),
            doc.title,
          );

          return updatedDoc;
        }),

      /**
       * Check out a document for editing
       */
      checkOutDocument: protectedProcedure
        .input(z.object({ documentId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const { user, dbUser } = ctx;

          if (!dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an institution.',
            });
          }

          const aclWhere = this.accessControlService.generateAclWhereClause(
            ctx.dbUser,
          );
          const doc = await this.prisma.document.findFirst({
            where: {
              id: input.documentId,
              institutionId: dbUser.institutionId,
              AND: [aclWhere],
            },
            include: {
              documentAccesses: true,
            },
          });

          if (!doc) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Document not found or access denied.',
            });
          }

          if (doc.recordStatus === 'FINAL') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Cannot check out a final document.',
            });
          }

          if (doc.isCheckedOut) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'Document is already checked out.',
            });
          }

          // Verify write access
          let hasWriteAccess = false;
          if (
            checkPermission(dbUser, 'canManageDocuments') ||
            doc.uploadedById === user.id
          ) {
            hasWriteAccess = true;
          } else {
            // Correctly verify using AccessControlService write clause
            const writeAclWhere =
              this.accessControlService.generateAclWhereClause(dbUser, 'WRITE');

            const writeAccessCheck = await this.prisma.document.findFirst({
              where: {
                id: input.documentId,
                institutionId: dbUser.institutionId,
                AND: [writeAclWhere],
              },
            });
            if (writeAccessCheck) hasWriteAccess = true;
          }

          if (!hasWriteAccess) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You do not have write access to this document.',
            });
          }

          const updatedDoc = await this.prisma.document.update({
            where: { id: input.documentId },
            data: {
              isCheckedOut: true,
              checkedOutById: user.id,
            },
          });

          await this.logService.logAction(
            user.id,
            dbUser.institutionId,
            'Checked Out Document',
            dbUser.roles.map((r) => r.name),
            doc.title,
          );

          return updatedDoc;
        }),

      /**
       * Check in a new version of a document
       */
      checkInDocument: protectedProcedure
        .input(
          z.object({
            documentId: z.string(),
            storageKey: z.string(),
            storageBucket: z.string(),
            fileType: z.string().optional(),
            fileSize: z.number().optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const { user, dbUser } = ctx;

          if (!dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an institution.',
            });
          }

          const doc = await this.prisma.document.findUnique({
            where: { id: input.documentId },
          });

          if (!doc || doc.institutionId !== dbUser.institutionId) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Document not found.',
            });
          }

          if (!doc.isCheckedOut || doc.checkedOutById !== user.id) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You must check out the document first to check it in.',
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

          const allowedFinalFormats = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/tiff',
          ];
          const isFinal =
            input.fileType && allowedFinalFormats.includes(input.fileType)
              ? 'FINAL'
              : 'DRAFT';

          const maxVersion = await this.prisma.documentVersion.aggregate({
            where: { documentId: input.documentId },
            _max: { versionNumber: true },
          });
          const nextVersionNumber = (maxVersion._max.versionNumber || 0) + 1;

          const updatedDoc = await this.prisma.document.update({
            where: { id: input.documentId },
            data: {
              isCheckedOut: false,
              checkedOutById: null,
              recordStatus: isFinal,
              versions: {
                create: {
                  versionNumber: nextVersionNumber,
                  s3Key: input.storageKey,
                  s3Bucket: input.storageBucket,
                  fileType: input.fileType,
                  fileSize: input.fileSize,
                  uploadedById: user.id,
                },
              },
            },
            include: {
              versions: {
                orderBy: { versionNumber: 'desc' as const },
                take: 1,
              },
            },
          });

          await this.logService.logAction(
            user.id,
            dbUser.institutionId,
            `Checked In Document (v${nextVersionNumber})`,
            dbUser.roles.map((r) => r.name),
            doc.title,
          );

          return updatedDoc;
        }),

      /**
       * Discard Check Out
       */
      discardCheckOut: protectedProcedure
        .input(z.object({ documentId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const { user, dbUser } = ctx;

          if (!dbUser.institutionId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an institution.',
            });
          }

          const doc = await this.prisma.document.findUnique({
            where: { id: input.documentId },
          });

          if (!doc || doc.institutionId !== dbUser.institutionId) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Document not found.',
            });
          }

          if (!doc.isCheckedOut) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Document is not checked out.',
            });
          }

          const canManageDocuments = checkPermission(
            dbUser,
            'canManageDocuments',
          );

          if (
            doc.checkedOutById !== user.id &&
            doc.uploadedById !== user.id &&
            !canManageDocuments
          ) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You do not have permission to discard this check out.',
            });
          }

          const updatedDoc = await this.prisma.document.update({
            where: { id: input.documentId },
            data: {
              isCheckedOut: false,
              checkedOutById: null,
            },
          });

          await this.logService.logAction(
            user.id,
            dbUser.institutionId,
            'Discarded Check Out',
            dbUser.roles.map((r) => r.name),
            doc.title,
          );

          return updatedDoc;
        }),
    });
  }
}
