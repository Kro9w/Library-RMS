import { z } from 'zod';
import { Prisma, PermissionLevel } from '@prisma/client';
import { protectedProcedure, publicProcedure, router } from '../trpc/trpc';
import { PrismaService } from '../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { TRPCError } from '@trpc/server';
import { SupabaseService } from '../supabase/supabase.service';
import { LogService } from '../log/log.service';
import { AccessControlService } from './access-control.service';
import { DocumentLifecycleService } from './document-lifecycle.service';
import { DocumentWorkflowService } from './document-workflow.service';
import { env } from '../env';

@Injectable()
export class DocumentsRouter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly logService: LogService,
    private readonly accessControlService: AccessControlService,
    private readonly documentLifecycleService: DocumentLifecycleService,
    private readonly documentWorkflowService: DocumentWorkflowService,
  ) {}

  createRouter() {
    return router({
      lookupByControlNumber: publicProcedure
        .input(z.object({ controlNumber: z.string() }))
        .output(z.any())
        .query(async ({ input }) => {
          const doc = await this.prisma.document.findFirst({
            where: {
              controlNumber: input.controlNumber,
              OR: [
                { workflow: { recordStatus: 'IN_TRANSIT' } },
                { category: 'FOR_APPROVAL' },
                { workflow: { status: { not: null } } },
              ],
            },
            select: {
              id: true,
              title: true,
              controlNumber: true,
              workflow: {
                select: {
                  recordStatus: true,
                  status: true,
                },
              },
              category: true,
              createdAt: true,
              transitRoutes: {
                orderBy: { sequenceOrder: 'asc' },
                include: {
                  department: {
                    select: { name: true },
                  },
                },
              },
              remarks: {
                orderBy: { createdAt: 'desc' },
                include: {
                  author: {
                    select: {
                      firstName: true,
                      lastName: true,
                      department: {
                        select: { name: true },
                      },
                      roles: {
                        select: { id: true, name: true, level: true },
                      },
                    },
                  },
                },
              },
            },
          });

          if (!doc) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message:
                'No active document or routing progress found for this Control Number.',
            });
          }

          const resultDoc = {
            ...doc,
            status: doc.workflow?.status || null,
          };

          return resultDoc;
        }),

      sendDocument: protectedProcedure
        .input(
          z.object({
            documentId: z.string(),
            isInstitutional: z.boolean().default(false),
            campusIds: z.array(z.string()),
            departmentIds: z.array(z.string()),
            userIds: z.array(z.string()),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          return this.documentWorkflowService.sendDocument(ctx, input);
        }),

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
          const aclWhere = this.accessControlService.generateAclWhereClause(
            ctx.dbUser,
          );

          const doc = await this.prisma.document.findFirst({
            where: {
              id: input.id,
              AND: [aclWhere],
            },
            select: {
              id: true,
              title: true,
              createdAt: true,
              documentType: {
                include: {
                  recordsSeries: true,
                },
              },
              workflow: {
                select: {
                  recordStatus: true,
                  isCheckedOut: true,
                  checkedOutById: true,
                  checkedOutBy: {
                    select: {
                      id: true,
                      firstName: true,
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
                  status: true,
                },
              },
              versions: {
                orderBy: { versionNumber: 'desc' },
                include: {
                  uploadedBy: {
                    select: {
                      firstName: true,
                      lastName: true,
                      department: {
                        select: { name: true },
                      },
                      roles: {
                        select: { id: true, name: true, level: true },
                      },
                    },
                  },
                },
              },
              uploadedBy: {
                select: {
                  firstName: true,
                  middleName: true,
                  lastName: true,
                  department: {
                    select: {
                      id: true,
                      name: true,
                      campus: { select: { name: true } },
                    },
                  },
                },
              },
              remarks: {
                include: {
                  author: {
                    select: {
                      firstName: true,
                      lastName: true,
                      department: {
                        select: { name: true },
                      },
                      roles: {
                        select: { id: true, name: true, level: true },
                      },
                    },
                  },
                },
                orderBy: {
                  createdAt: 'desc',
                },
              },
              lifecycle: {
                select: {
                  activeRetentionSnapshot: true,
                  activeRetentionMonthsSnapshot: true,
                  activeRetentionDaysSnapshot: true,
                  inactiveRetentionSnapshot: true,
                  inactiveRetentionMonthsSnapshot: true,
                  inactiveRetentionDaysSnapshot: true,
                  dispositionActionSnapshot: true,
                  dispositionStatus: true,
                  dispositionDate: true,
                  isUnderLegalHold: true,
                  legalHoldReason: true,
                  dispositionRequesterId: true,
                },
              },
              category: true,
              originalSenderId: true,
              uploadedById: true,
              transitRoutes: {
                orderBy: { sequenceOrder: 'asc' },
                include: {
                  department: true,
                  approvedBy: {
                    select: {
                      firstName: true,
                      middleName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          });

          if (!doc) {
            throw new TRPCError({ code: 'NOT_FOUND' });
          }

          const latestVersion = doc.versions[0];

          return {
            ...doc,
            status: doc.workflow?.status || null,
            fileType: latestVersion?.fileType,
            s3Key: latestVersion?.s3Key,
            s3Bucket: latestVersion?.s3Bucket,
            lifecycleStatus:
              this.documentLifecycleService.computeLifecycleStatus(doc as any),
          };
        }),

      checkDuplicateControlNumber: protectedProcedure
        .input(z.object({ controlNumber: z.string() }))
        .output(z.boolean())
        .mutation(async ({ input }) => {
          if (!input.controlNumber) return false;
          const existingDoc = await this.prisma.document.findFirst({
            where: { controlNumber: input.controlNumber },
            select: { id: true },
          });
          return !!existingDoc;
        }),

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
            category: z
              .enum([
                'INSTITUTIONAL',
                'INTERNAL',
                'DEPARTMENTAL',
                'RESTRICTED',
                'EXTERNAL',
                'FOR_APPROVAL',
              ])
              .optional()
              .default('RESTRICTED'),
            transitRoute: z.array(z.string()).optional(),
            metadata: z.record(z.string(), z.any()).optional(),
          }),
        )
        .output(z.any())
        .mutation(async ({ ctx, input }) => {
          const { user, dbUser } = ctx;
          const highestRoleLevel =
            dbUser.roles.length > 0
              ? dbUser.roles.reduce(
                  (min, role) => Math.min(min, role.level),
                  Infinity,
                )
              : 4;

          const canManageDocs = this.accessControlService.checkPermission(
            dbUser,
            'canManageDocuments',
          );

          if (
            input.category === 'FOR_APPROVAL' &&
            (!input.transitRoute || input.transitRoute.length === 0)
          ) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message:
                'A transit route is required for documents marked FOR_APPROVAL.',
            });
          }

          if (
            input.category === 'INSTITUTIONAL' ||
            input.category === 'INTERNAL'
          ) {
            if (highestRoleLevel > 1 && !canManageDocs) {
              throw new TRPCError({
                code: 'FORBIDDEN',
                message:
                  'Only Executives, Level 1 users, or Admins can send Institutional or Internal documents.',
              });
            }
          }

          if (input.category === 'DEPARTMENTAL') {
            if (highestRoleLevel > 2 && !canManageDocs) {
              throw new TRPCError({
                code: 'FORBIDDEN',
                message:
                  'Only Level 1 and 2 users or Admins can send Departmental documents.',
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

          if (
            input.category === 'INSTITUTIONAL' ||
            input.category === 'INTERNAL'
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
                message: `Published Institutional or Internal documents must be finalized formats (PDF or images). Received: ${input.fileType || 'Unknown'}`,
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

          let retentionSnapshot:
            | Prisma.DocumentLifecycleCreateWithoutDocumentInput
            | undefined = undefined;
          if (input.documentTypeId) {
            const docType = await this.prisma.documentType.findUnique({
              where: { id: input.documentTypeId },
              include: { recordsSeries: true },
            });
            if (docType) {
              const series = docType.recordsSeries;
              retentionSnapshot = {
                activeRetentionSnapshot:
                  docType.activeRetentionDuration ??
                  series?.activeRetentionDuration ??
                  0,
                activeRetentionMonthsSnapshot:
                  docType.activeRetentionMonths ??
                  series?.activeRetentionMonths ??
                  0,
                activeRetentionDaysSnapshot:
                  docType.activeRetentionDays ??
                  series?.activeRetentionDays ??
                  0,
                inactiveRetentionSnapshot:
                  docType.inactiveRetentionDuration ??
                  series?.inactiveRetentionDuration ??
                  0,
                inactiveRetentionMonthsSnapshot:
                  docType.inactiveRetentionMonths ??
                  series?.inactiveRetentionMonths ??
                  0,
                inactiveRetentionDaysSnapshot:
                  docType.inactiveRetentionDays ??
                  series?.inactiveRetentionDays ??
                  0,
                dispositionActionSnapshot:
                  docType.dispositionAction ??
                  series?.dispositionAction ??
                  'ARCHIVE',
              };
            }
          }

          let finalRecordStatus = isFinal;
          if (input.category === 'FOR_APPROVAL') {
            finalRecordStatus = 'IN_TRANSIT';
          }

          const now = new Date();
          const maturityDate = new Date(now);
          if (retentionSnapshot) {
            maturityDate.setFullYear(
              maturityDate.getFullYear() +
                (retentionSnapshot.activeRetentionSnapshot ?? 0) +
                (retentionSnapshot.inactiveRetentionSnapshot ?? 0),
            );
            maturityDate.setMonth(
              maturityDate.getMonth() +
                (retentionSnapshot.activeRetentionMonthsSnapshot ?? 0) +
                (retentionSnapshot.inactiveRetentionMonthsSnapshot ?? 0),
            );
            maturityDate.setDate(
              maturityDate.getDate() +
                (retentionSnapshot.activeRetentionDaysSnapshot ?? 0) +
                (retentionSnapshot.inactiveRetentionDaysSnapshot ?? 0),
            );
          }

          if (input.controlNumber) {
            const existingDoc = await this.prisma.document.findFirst({
              where: { controlNumber: input.controlNumber },
              select: { id: true },
            });
            if (existingDoc) {
              throw new TRPCError({
                code: 'CONFLICT',
                message: `A document with control number ${input.controlNumber} already exists.`,
              });
            }
          }

          const document = await this.prisma.document.create({
            data: {
              title: input.title,
              fileName: input.title,
              content: '',
              uploadedById: user.id,
              originalSenderId: user.id,
              campusId: dbUser.campusId,
              departmentId: dbUser.departmentId,
              documentTypeId: input.documentTypeId,
              controlNumber: input.controlNumber,
              category: input.category as any,
              metadata: input.metadata
                ? (input.metadata as Prisma.InputJsonValue)
                : Prisma.JsonNull,
              lifecycle: retentionSnapshot
                ? {
                    create: {
                      ...retentionSnapshot,
                      dispositionMaturityDate: maturityDate,
                    },
                  }
                : undefined,
              workflow: {
                create: {
                  recordStatus: finalRecordStatus as any,
                },
              },
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

          if (
            input.category === 'FOR_APPROVAL' &&
            input.transitRoute &&
            input.transitRoute.length > 0
          ) {
            await this.prisma.documentTransitRoute.createMany({
              data: input.transitRoute.map((deptId, index) => ({
                documentId: document.id,
                departmentId: deptId,
                sequenceOrder: index,
                status: 'PENDING',
              })),
            });
          }

          const accessesToCreate: any[] = [];

          accessesToCreate.push({
            documentId: (document as any).id,
            userId: user.id,
            permission: PermissionLevel.WRITE,
          });

          await this.prisma.documentAccess.createMany({
            data: accessesToCreate,
          });

          await this.logService.logAction(
            user.id,
            'Created Document',
            dbUser.roles.map((r) => r.name),
            (document as any).title,
            dbUser.campusId || undefined,
            dbUser.departmentId || undefined,
          );

          return document as any;
        }),

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
        .output(z.object({ signedUrl: z.string().nullable() }))
        .query(async ({ ctx, input }) => {
          const aclWhere = this.accessControlService.generateAclWhereClause(
            ctx.dbUser,
          );

          const doc = await this.prisma.document.findFirst({
            where: {
              id: input.documentId,
              AND: [aclWhere],
            },
            select: {
              category: true,
              uploadedById: true,
              originalSenderId: true,
              lifecycle: {
                select: {
                  dispositionStatus: true,
                },
              },
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

          if (doc.lifecycle?.dispositionStatus === 'DESTROYED') {
            return { signedUrl: null };
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

      getPendingDispositions: protectedProcedure.query(async ({ ctx }) => {
        this.accessControlService.requirePermission(
          ctx.dbUser,
          'canManageDocuments',
        );

        const isHighLevelAdmin = ctx.dbUser.roles.some(
          (r) =>
            r.canManageInstitution || (r.canManageDocuments && r.level <= 1),
        );

        if (!isHighLevelAdmin) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message:
              'You must be at least a Level 1 Administrator to view pending dispositions.',
          });
        }

        const docs = await ctx.prisma.document.findMany({
          where: {
            lifecycle: {
              dispositionStatus: 'PENDING_DISPOSITION',
            },
          },
          include: {
            documentType: {
              include: {
                recordsSeries: true,
              },
            },
            lifecycle: true,
          },
        });

        return docs;
      }),

      getDocumentsToReview: protectedProcedure.query(async ({ ctx }) => {
        const { dbUser } = ctx;

        if (!dbUser.departmentId) {
          return [];
        }

        const documents = await ctx.prisma.document.findMany({
          where: {
            category: 'FOR_APPROVAL',
            workflow: {
              recordStatus: 'IN_TRANSIT',
            },
            distributions: {
              some: {
                recipient: {
                  departmentId: dbUser.departmentId,
                },
                status: 'RECEIVED',
              },
            },
          },
          include: {
            uploadedBy: {
              select: {
                id: true,
                firstName: true,
                middleName: true,
                lastName: true,
                roles: {
                  select: { id: true, name: true, level: true },
                },
                department: {
                  select: { name: true },
                },
              },
            },
            transitRoutes: {
              orderBy: {
                sequenceOrder: 'asc',
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        return documents.map((doc) => {
          const currentRoute = doc.transitRoutes.find(
            (route) => route.departmentId === dbUser.departmentId,
          );

          const isReviewed = currentRoute ? !!currentRoute.decision : false;

          return {
            ...doc,
            isReviewed,
          };
        });
      }),

      approveManyDispositions: protectedProcedure
        .input(z.object({ documentIds: z.array(z.string()) }))
        .mutation(async ({ ctx, input }) => {
          const { user, dbUser } = ctx;

          const isGlobalAdmin = dbUser.roles.some(
            (r) => r.canManageInstitution,
          );

          const docs = await ctx.prisma.document.findMany({
            where: { id: { in: input.documentIds } },
            include: {
              lifecycle: true,
              workflow: true,
              versions: true,
              documentType: true,
              uploadedBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  departmentId: true,
                },
              },
              campus: true,
              department: true,
            },
          });

          if (docs.length !== input.documentIds.length) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'One or more documents not found.',
            });
          }

          const docsToDestroy: typeof docs = [];
          const docsToArchive: typeof docs = [];

          for (const doc of docs) {
            if (
              doc.workflow?.recordStatus === 'IN_TRANSIT' ||
              doc.workflow?.recordStatus === 'DRAFT'
            ) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: `Disposition cannot be approved for active document ${doc.controlNumber || doc.title}.`,
              });
            }

            const isOriginator =
              doc.uploadedById === user.id || doc.originalSenderId === user.id;
            const isOriginatingOffice =
              dbUser.departmentId === doc.uploadedBy?.departmentId &&
              dbUser.roles.some((r) => r.level <= 1);

            if (!isOriginator && !isOriginatingOffice && !isGlobalAdmin) {
              throw new TRPCError({
                code: 'FORBIDDEN',
                message: `You do not have permission to execute disposition for document ${doc.controlNumber || doc.title}.`,
              });
            }

            if (doc.lifecycle?.isUnderLegalHold) {
              throw new TRPCError({
                code: 'FORBIDDEN',
                message: `Document ${doc.controlNumber || doc.title} is under legal hold`,
              });
            }

            if (doc.lifecycle?.dispositionStatus !== 'PENDING_DISPOSITION') {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: `Document ${doc.controlNumber || doc.title} disposition must be requested before it can be executed.`,
              });
            }

            if (
              doc.lifecycle?.dispositionRequesterId &&
              user.id === doc.lifecycle?.dispositionRequesterId
            ) {
              throw new TRPCError({
                code: 'FORBIDDEN',
                message: `You cannot approve your own disposition request for document ${doc.controlNumber || doc.title}.`,
              });
            }

            const action = doc.lifecycle?.dispositionActionSnapshot;
            if (action === 'DESTROY') {
              docsToDestroy.push(doc);
            } else if (action === 'ARCHIVE') {
              docsToArchive.push(doc);
            }
          }

          const adminClient = this.supabase.getAdminClient();

          // Process DESTROY Documents
          if (docsToDestroy.length > 0) {
            const allVersionsToDestroy = docsToDestroy.flatMap(
              (doc) => doc.versions,
            );

            const keysByBucket = allVersionsToDestroy.reduce(
              (acc, version) => {
                if (
                  version.s3Key &&
                  version.s3Bucket &&
                  version.s3Key !== 'DESTROYED'
                ) {
                  if (!acc[version.s3Bucket]) {
                    acc[version.s3Bucket] = [];
                  }
                  acc[version.s3Bucket].push(version.s3Key);
                }
                return acc;
              },
              {} as Record<string, string[]>,
            );

            const bucketEntries = Object.entries(keysByBucket);

            if (bucketEntries.length > 0) {
              await Promise.all(
                bucketEntries.map(async ([bucket, keys]) => {
                  const { error: storageError } = await adminClient.storage
                    .from(bucket)
                    .remove(keys);

                  if (storageError) {
                    this.logService.logError(
                      `Failed to batch delete files from storage bucket ${bucket} during multi-disposition:`,
                      storageError,
                    );
                  }
                }),
              );
            }

            const updatePromises = allVersionsToDestroy
              .filter(
                (version) =>
                  version.s3Key &&
                  version.s3Bucket &&
                  version.s3Key !== 'DESTROYED',
              )
              .map((version) =>
                ctx.prisma.documentVersion.update({
                  where: { id: version.id },
                  data: {
                    s3Key: `DESTROYED-${version.id}`,
                    fileSize: 0,
                  },
                }),
              );

            const documentUpdates = docsToDestroy.map((doc) =>
              ctx.prisma.document.update({
                where: { id: doc.id },
                data: {
                  lifecycle: {
                    update: {
                      dispositionStatus: 'DESTROYED',
                      dispositionDate: new Date(),
                    },
                  },
                },
              }),
            );

            if (updatePromises.length > 0 || documentUpdates.length > 0) {
              await ctx.prisma.$transaction([
                ...updatePromises,
                ...documentUpdates,
              ]);
            }

            for (const doc of docsToDestroy) {
              await this.logService.logAction(
                user.id,
                'Approved and Executed Disposition (DESTROY)',
                dbUser.roles.map((r) => r.name),
                doc.title,
                dbUser.campusId || undefined,
                dbUser.departmentId || undefined,
              );
            }
          }

          // Process ARCHIVE Documents
          if (docsToArchive.length > 0) {
            for (const doc of docsToArchive) {
              const versions = doc.versions || [];
              // We sort to ensure `versions[0]` is the latest, but we don't declare unused `latestVersion`
              versions.sort((a, b) => b.versionNumber - a.versionNumber);
              let latestHash: string | null = null;

              for (const version of versions) {
                if (version.s3Key && version.s3Bucket) {
                  const { data: fileData, error: downloadError } =
                    await adminClient.storage
                      .from(version.s3Bucket)
                      .download(version.s3Key);

                  if (downloadError || !fileData) {
                    console.error(
                      'Failed to download from active bucket during multi-disposition:',
                      downloadError,
                    );
                    continue; // Skip version if download fails
                  }

                  const archiveBucketName =
                    process.env.SUPABASE_ARCHIVE_BUCKET_NAME || 'csu-archives';

                  const { error: uploadError } = await adminClient.storage
                    .from(archiveBucketName)
                    .upload(version.s3Key, fileData, {
                      contentType: fileData.type,
                      upsert: true,
                    });

                  if (uploadError) {
                    console.error(
                      'Failed to upload to archive bucket during multi-disposition:',
                      uploadError,
                    );
                    continue; // Skip if upload fails
                  }

                  await ctx.prisma.documentVersion.update({
                    where: { id: version.id },
                    data: { s3Bucket: archiveBucketName },
                  });

                  await adminClient.storage
                    .from(version.s3Bucket)
                    .remove([version.s3Key]);
                }
              }

              const manifest = {
                documentId: doc.id,
                title: doc.title,
                controlNumber: doc.controlNumber,
                category: doc.category,
                createdAt: doc.createdAt,
                archivedAt: new Date(),
                fileHash: latestHash,
                creator: doc.uploadedBy
                  ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`
                  : null,
                campus: doc.campus?.name,
                department: doc.department?.name,
                documentType: doc.documentType?.name,
                versions: doc.versions?.map((v) => ({
                  version: v.versionNumber,
                  fileType: v.fileType,
                  fileSize: v.fileSize,
                })),
              };

              const manifestBuffer = Buffer.from(
                JSON.stringify(manifest, null, 2),
                'utf-8',
              );
              const manifestKey = `manifests/${doc.id}-manifest.json`;
              const archiveBucketName =
                process.env.SUPABASE_ARCHIVE_BUCKET_NAME || 'csu-archives';

              const { error: manifestUploadError } = await adminClient.storage
                .from(archiveBucketName)
                .upload(manifestKey, manifestBuffer, {
                  contentType: 'application/json',
                  upsert: true,
                });

              if (manifestUploadError) {
                console.error(
                  'Failed to upload archive manifest during multi-disposition:',
                  manifestUploadError,
                );
              }

              await ctx.prisma.document.update({
                where: { id: doc.id },
                data: {
                  lifecycle: {
                    update: {
                      dispositionStatus: 'ARCHIVED',
                      dispositionDate: new Date(),
                      archiveManifestUrl: manifestKey,
                      archiveHash: latestHash,
                    },
                  },
                },
              });

              await this.logService.logAction(
                user.id,
                'Approved and Executed Disposition (ARCHIVE)',
                dbUser.roles.map((r) => r.name),
                doc.title,
                dbUser.campusId || undefined,
                dbUser.departmentId || undefined,
              );
            }
          }

          // Fetch the updated docs to return
          const finalUpdatedDocs = await ctx.prisma.document.findMany({
            where: { id: { in: input.documentIds } },
            include: { lifecycle: true, documentType: true },
          });

          return finalUpdatedDocs;
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
        .query(async () => {
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
        .input(
          z.object({
            page: z.number().min(1).default(1),
            perPage: z.number().min(1).max(100).default(25),
            search: z.string().optional(),
            searchType: z
              .enum(['name', 'owner', 'controlNumber'])
              .default('name'),
            documentTypeId: z.string().optional(),
          }),
        )
        .output(
          z.object({
            documents: z.array(z.any()),
            totalCount: z.number(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const { page, perPage, search, searchType, documentTypeId } = input;
          const skip = (page - 1) * perPage;

          const mapDocuments = (documents: any[]) => {
            return documents.map((doc) => ({
              ...doc,
              fileType: doc.versions?.[0]?.fileType,
              fileSize: doc.versions?.[0]?.fileSize,
              lifecycleStatus:
                this.documentLifecycleService.computeLifecycleStatus(doc),
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

            documentType: true,
            controlNumber: true,
            workflow: {
              select: {
                recordStatus: true,
                isCheckedOut: true,
              },
            },
            versions: {
              orderBy: { versionNumber: 'desc' as const },
              take: 1,
            },
            lifecycle: {
              select: {
                activeRetentionSnapshot: true,
                activeRetentionMonthsSnapshot: true,
                activeRetentionDaysSnapshot: true,
                inactiveRetentionSnapshot: true,
                inactiveRetentionMonthsSnapshot: true,
                inactiveRetentionDaysSnapshot: true,
                dispositionActionSnapshot: true,
                dispositionStatus: true,
                dispositionDate: true,
                isUnderLegalHold: true,
                legalHoldReason: true,
                dispositionRequesterId: true,
              },
            },
            category: true,
            originalSenderId: true,
          };

          const andConditions: Prisma.DocumentWhereInput[] = [];

          const aclWhere = this.accessControlService.generateAclWhereClause(
            ctx.dbUser,
          );
          andConditions.push(aclWhere);

          andConditions.push({
            OR: [
              { lifecycle: { dispositionStatus: null } },
              {
                lifecycle: {
                  dispositionStatus: { notIn: ['ARCHIVED', 'DESTROYED'] },
                },
              },
              { lifecycle: null },
            ],
          });

          if (search && search.trim() !== '') {
            if (searchType === 'name') {
              const parsedSearch = search.trim().split(/\s+/).join(' & ');
              andConditions.push({
                OR: [
                  { title: { search: parsedSearch } },
                  { fileName: { search: parsedSearch } },
                ],
              });
            } else if (searchType === 'owner') {
              andConditions.push({
                uploadedBy: {
                  OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { middleName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                  ],
                },
              });
            } else if (searchType === 'controlNumber') {
              andConditions.push({
                controlNumber: { contains: search, mode: 'insensitive' },
              });
            }
          }

          if (documentTypeId) {
            andConditions.push({ documentTypeId });
          }

          const whereClause: Prisma.DocumentWhereInput = {
            AND: andConditions,
          };

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
          this.accessControlService.requirePermission(
            ctx.dbUser,
            'canManageDocuments',
          );

          const aclWhere = this.accessControlService.generateAclWhereClause(
            ctx.dbUser,
          );

          const doc = await this.prisma.document.findFirst({
            where: {
              id: input.id,
              AND: [aclWhere],
            },
            select: {
              id: true,
              title: true,
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

          const keysByBucket = doc.versions.reduce(
            (acc, version) => {
              if (version.s3Key && version.s3Bucket) {
                if (!acc[version.s3Bucket]) {
                  acc[version.s3Bucket] = [];
                }
                acc[version.s3Bucket].push(version.s3Key);
              }
              return acc;
            },
            {} as Record<string, string[]>,
          );

          const bucketEntries = Object.entries(keysByBucket);

          if (bucketEntries.length > 0) {
            const adminClient = this.supabase.getAdminClient();
            await Promise.all(
              bucketEntries.map(async ([bucket, keys]) => {
                const { error: storageError } = await adminClient.storage
                  .from(bucket)
                  .remove(keys);

                if (storageError) {
                  this.logService.logError(
                    `Failed to batch delete files from storage bucket ${bucket}:`,
                    storageError,
                  );
                }
              }),
            );
          }

          await this.logService.logAction(
            ctx.dbUser.id,
            'Deleted Document',
            ctx.dbUser.roles.map((r) => r.name),
            doc.title,
            ctx.dbUser.campusId || undefined,
            ctx.dbUser.departmentId || undefined,
          );

          return this.prisma.document.delete({
            where: { id: doc.id },
          });
        }),

      forwardDocument: protectedProcedure
        .input(
          z.object({
            documentId: z.string(),
            recipientId: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          return this.documentWorkflowService.forwardDocument(ctx, input);
        }),

      receiveDocument: protectedProcedure
        .input(
          z.object({
            controlNumber: z.string().optional(),
            distributionId: z.string().optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const { user, dbUser } = ctx;

          if (!input.controlNumber && !input.distributionId) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message:
                'Must provide either a control number or distribution ID.',
            });
          }

          let document;
          let senderId = '';

          if (input.distributionId) {
            const distribution =
              await this.prisma.documentDistribution.findUnique({
                where: { id: input.distributionId },
                include: { document: true },
              });

            if (!distribution) {
              throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Distribution not found.',
              });
            }

            if (distribution.recipientId !== user.id) {
              throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'Not authorized to receive this document.',
              });
            }

            if (distribution.status === 'RECEIVED') {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Document has already been received.',
              });
            }

            document = distribution.document as any;
            senderId = distribution.senderId;

            await this.prisma.documentDistribution.update({
              where: { id: distribution.id },
              data: {
                status: 'RECEIVED',
                receivedAt: new Date(),
              },
            });
          } else if (input.controlNumber) {
            document = (await this.prisma.document.findFirst({
              where: {
                controlNumber: input.controlNumber,
              },
            })) as any;

            if (!document) {
              throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Document with this Control Number not found.',
              });
            }

            senderId = document.uploadedById;

            if (senderId === user.id) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'You cannot receive your own document.',
              });
            }

            if (document.category === 'FOR_APPROVAL') {
              if (!dbUser.departmentId) {
                throw new TRPCError({
                  code: 'BAD_REQUEST',
                  message:
                    'You cannot receive this document. You are not assigned to a department.',
                });
              }

              const routeWithDepartment =
                await this.prisma.documentTransitRoute.findFirst({
                  where: {
                    documentId: document.id,
                    departmentId: dbUser.departmentId,
                  },
                });

              if (!routeWithDepartment) {
                throw new TRPCError({
                  code: 'BAD_REQUEST',
                  message:
                    'You cannot receive this document. Your department is not part of the route. If you think this is a mistake, please contact the uploader of the document.',
                });
              }

              const precedingPendingStops =
                await this.prisma.documentTransitRoute.findMany({
                  where: {
                    documentId: document.id,
                    sequenceOrder: { lt: routeWithDepartment.sequenceOrder },
                    status: { notIn: ['APPROVED', 'REJECTED'] },
                  },
                  include: {
                    department: true,
                  },
                  orderBy: {
                    sequenceOrder: 'asc',
                  },
                });

              if (precedingPendingStops.length > 0) {
                const pendingOfficesList = precedingPendingStops
                  .map((stop: any) => `\n• ${stop.department.name}`)
                  .join('');

                throw new TRPCError({
                  code: 'BAD_REQUEST',
                  message: `This document must first undergo the review of:${pendingOfficesList}`,
                });
              }
            }

            const existingAccess = await this.prisma.documentAccess.findFirst({
              where: {
                documentId: document.id,
                userId: user.id,
              },
            });

            if (existingAccess) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'You already have access to this document.',
              });
            }

            const pendingDistribution =
              await this.prisma.documentDistribution.findFirst({
                where: {
                  documentId: document.id,
                  recipientId: user.id,
                  status: 'PENDING',
                },
              });

            if (pendingDistribution) {
              await this.prisma.documentDistribution.update({
                where: { id: pendingDistribution.id },
                data: {
                  status: 'RECEIVED',
                  receivedAt: new Date(),
                },
              });
            } else {
              await this.prisma.documentDistribution.create({
                data: {
                  documentId: document.id,
                  senderId,
                  recipientId: user.id,
                  status: 'RECEIVED',
                  receivedAt: new Date(),
                },
              });
            }
          }

          await this.prisma.documentAccess.create({
            data: {
              documentId: document.id,
              userId: user.id,
              permission: PermissionLevel.READ,
            },
          });

          await this.logService.logAction(
            user.id,
            `Received Document via Control Number/Distribution`,
            dbUser.roles.map((r) => r.name),
            document.title,
            dbUser.campusId || undefined,
            dbUser.departmentId || undefined,
          );

          await this.documentWorkflowService.createNotification(
            senderId,
            'Document Received',
            `${dbUser.firstName} ${dbUser.lastName} has successfully received "${document.title}".`,
            document.id,
          );

          return document;
        }),

      getMyPendingDistributions: protectedProcedure.query(async ({ ctx }) => {
        return this.prisma.documentDistribution.findMany({
          where: {
            recipientId: ctx.user.id,
            status: 'PENDING',
          },
          include: {
            document: {
              select: {
                id: true,
                title: true,
                controlNumber: true,
                category: true,
              },
            },
            sender: {
              select: {
                firstName: true,
                lastName: true,
                department: {
                  select: {
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

      getDocumentDistributions: protectedProcedure
        .input(z.object({ documentId: z.string() }))
        .query(async ({ ctx, input }) => {
          const aclWhere = this.accessControlService.generateAclWhereClause(
            ctx.dbUser,
          );
          const doc = await this.prisma.document.findFirst({
            where: {
              id: input.documentId,
              AND: [aclWhere],
            },
          });

          if (!doc) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Document not found or access denied.',
            });
          }

          const isOwner =
            doc.uploadedById === ctx.user.id ||
            doc.originalSenderId === ctx.user.id;
          const isAdmin = this.accessControlService.checkPermission(
            ctx.dbUser,
            'canManageDocuments',
          );

          const distributionWhere: any = {
            documentId: input.documentId,
          };

          if (!isOwner && !isAdmin) {
            distributionWhere.OR = [
              { senderId: ctx.user.id },
              { recipientId: ctx.user.id },
            ];
          }

          return this.prisma.documentDistribution.findMany({
            where: distributionWhere,
            include: {
              recipient: {
                select: {
                  firstName: true,
                  lastName: true,
                  department: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
              sender: {
                select: {
                  firstName: true,
                  lastName: true,
                  department: {
                    select: {
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

      reviewDocument: protectedProcedure
        .input(
          z.object({
            documentId: z.string(),
            status: z.enum([
              'Approved',
              'Noted',
              'For Endorsement',
              'Returned for Corrections/Revision/Clarification',
              'For the review of the Executive Committee',
              'Disapproved',
            ]),
            remarks: z.string().optional(),
            finalFileType: z.string().optional(),
            finalFileSize: z.number().optional(),
            finalStorageKey: z.string().optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          return this.documentWorkflowService.reviewDocument(ctx, input);
        }),

      getRemarks: protectedProcedure
        .input(z.object({ documentId: z.string() }))
        .query(async ({ input }) => {
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
          this.accessControlService.requirePermission(
            ctx.dbUser,
            'canManageUsers',
          );

          return this.prisma.user.findMany({});
        }),

      applyLegalHold: protectedProcedure
        .input(z.object({ documentId: z.string(), reason: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const { user, dbUser } = ctx;

          this.accessControlService.requirePermission(
            dbUser,
            'canManageDocuments',
          );

          const doc = await ctx.prisma.document.update({
            where: {
              id: input.documentId,
            },
            data: {
              lifecycle: {
                update: {
                  isUnderLegalHold: true,
                  legalHoldReason: input.reason,
                },
              },
            },
            include: { lifecycle: true },
          });

          await this.logService.logAction(
            user.id,
            `Applied Legal Hold: ${input.reason}`,
            dbUser.roles.map((r) => r.name),
            doc.title,
            dbUser.campusId || undefined,
            dbUser.departmentId || undefined,
          );

          return doc;
        }),

      removeLegalHold: protectedProcedure
        .input(z.object({ documentId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const { user, dbUser } = ctx;

          this.accessControlService.requirePermission(
            dbUser,
            'canManageDocuments',
          );

          const doc = await ctx.prisma.document.update({
            where: {
              id: input.documentId,
            },
            data: {
              lifecycle: {
                update: {
                  isUnderLegalHold: false,
                  legalHoldReason: null,
                },
              },
            },
            include: { lifecycle: true },
          });

          await this.logService.logAction(
            user.id,
            'Removed Legal Hold',
            dbUser.roles.map((r) => r.name),
            doc.title,
            dbUser.campusId || undefined,
            dbUser.departmentId || undefined,
          );

          return doc;
        }),

      requestDisposition: protectedProcedure
        .input(z.object({ documentId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const { user, dbUser } = ctx;

          const doc = await ctx.prisma.document.findUnique({
            where: { id: input.documentId },
            include: { lifecycle: true, workflow: true },
          });

          if (!doc) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Document not found',
            });
          }

          if (
            doc.workflow?.recordStatus === 'IN_TRANSIT' ||
            doc.workflow?.recordStatus === 'DRAFT'
          ) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message:
                'Disposition cannot be requested while the document is active or in transit.',
            });
          }

          const isOriginator =
            doc.uploadedById === user.id || doc.originalSenderId === user.id;
          const isGlobalAdmin = dbUser.roles.some(
            (r) => r.canManageInstitution,
          );

          if (!isOriginator && !isGlobalAdmin) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message:
                'Only the originator or a global administrator can request disposition for this document.',
            });
          }

          if (doc.lifecycle?.isUnderLegalHold) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Document is under legal hold',
            });
          }

          const status = this.documentLifecycleService.computeLifecycleStatus(
            doc as any,
          );
          if (status !== 'Ready') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Document is not ready for disposition',
            });
          }

          const updatedDoc = await this.prisma.document.update({
            where: { id: input.documentId },
            data: {
              lifecycle: {
                update: {
                  dispositionStatus: 'PENDING_DISPOSITION',
                  dispositionRequesterId: user.id,
                },
              },
            },
            include: { lifecycle: true },
          });

          await this.logService.logAction(
            user.id,
            'Disposition Approval Requested',
            dbUser.roles.map((r) => r.name),
            doc.title,
            dbUser.campusId || undefined,
            dbUser.departmentId || undefined,
          );

          return updatedDoc;
        }),

      approveDisposition: protectedProcedure
        .input(z.object({ documentId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const { user, dbUser } = ctx;

          const doc = await ctx.prisma.document.findUnique({
            where: { id: input.documentId },
            include: {
              lifecycle: true,
              workflow: true,
              uploadedBy: {
                select: {
                  departmentId: true,
                },
              },
            },
          });

          if (!doc) throw new TRPCError({ code: 'NOT_FOUND' });

          if (
            doc.workflow?.recordStatus === 'IN_TRANSIT' ||
            doc.workflow?.recordStatus === 'DRAFT'
          ) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message:
                'Disposition cannot be approved while the document is active or in transit.',
            });
          }

          const isOriginator =
            doc.uploadedById === user.id || doc.originalSenderId === user.id;
          const isOriginatingOffice =
            dbUser.departmentId === doc.uploadedBy?.departmentId &&
            dbUser.roles.some((r) => r.level <= 1);
          const isGlobalAdmin = dbUser.roles.some(
            (r) => r.canManageInstitution,
          );

          if (!isOriginator && !isOriginatingOffice && !isGlobalAdmin) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message:
                'Only the originator, office head, or a global administrator can approve disposition for this document.',
            });
          }

          if (doc.lifecycle?.dispositionStatus !== 'PENDING_DISPOSITION') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message:
                'Disposition must be requested before it can be executed',
            });
          }

          if (doc.lifecycle?.isUnderLegalHold) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Document is under legal hold',
            });
          }

          if (
            doc.lifecycle?.dispositionRequesterId &&
            user.id === doc.lifecycle?.dispositionRequesterId
          ) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message:
                'Separation of duties violation: You cannot approve a disposition you requested.',
            });
          }

          const action = doc.lifecycle?.dispositionActionSnapshot;

          if (action === 'DESTROY') {
            const versions = await this.prisma.documentVersion.findMany({
              where: { documentId: doc.id },
            });

            const keysByBucket = versions.reduce(
              (acc, version) => {
                if (
                  version.s3Key &&
                  version.s3Bucket &&
                  version.s3Key !== 'DESTROYED'
                ) {
                  if (!acc[version.s3Bucket]) {
                    acc[version.s3Bucket] = [];
                  }
                  acc[version.s3Bucket].push(version.s3Key);
                }
                return acc;
              },
              {} as Record<string, string[]>,
            );

            const bucketEntries = Object.entries(keysByBucket);

            if (bucketEntries.length > 0) {
              const adminClient = this.supabase.getAdminClient();
              await Promise.all(
                bucketEntries.map(async ([bucket, keys]) => {
                  const { error: storageError } = await adminClient.storage
                    .from(bucket)
                    .remove(keys);

                  if (storageError) {
                    this.logService.logError(
                      `Failed to batch delete files from storage bucket ${bucket} during disposition:`,
                      storageError,
                    );
                    throw new TRPCError({
                      code: 'INTERNAL_SERVER_ERROR',
                      message: 'Failed to delete physical file from storage.',
                    });
                  }
                }),
              );
            }

            const updatePromises = versions
              .filter(
                (version) =>
                  version.s3Key &&
                  version.s3Bucket &&
                  version.s3Key !== 'DESTROYED',
              )
              .map((version) =>
                this.prisma.documentVersion.update({
                  where: { id: version.id },
                  data: {
                    s3Key: `DESTROYED-${version.id}`,
                    fileSize: 0,
                  },
                }),
              );

            if (updatePromises.length > 0) {
              await this.prisma.$transaction(updatePromises);
            }

            const updatedDoc = await this.prisma.document.update({
              where: { id: doc.id },
              data: {
                lifecycle: {
                  update: {
                    dispositionStatus: 'DESTROYED',
                    dispositionDate: new Date(),
                  },
                },
              },
              include: { lifecycle: true },
            });

            await this.logService.logAction(
              user.id,
              'Approved and Executed Disposition (DESTROY)',
              dbUser.roles.map((r) => r.name),
              doc.title,
              dbUser.campusId || undefined,
              dbUser.departmentId || undefined,
            );
            return updatedDoc;
          } else if (action === 'ARCHIVE') {
            const versions = await this.prisma.documentVersion.findMany({
              where: { documentId: doc.id },
            });

            let latestHash: string | null = null;

            for (const version of versions) {
              if (version.s3Key && version.s3Bucket) {
                const adminClient = this.supabase.getAdminClient();

                const { data: fileData, error: downloadError } =
                  await adminClient.storage
                    .from(version.s3Bucket)
                    .download(version.s3Key);

                if (downloadError || !fileData) {
                  console.error(
                    'Failed to download from active bucket:',
                    downloadError,
                  );
                  throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to download document for archival.',
                  });
                }

                latestHash = 'omitted-for-memory-safety';

                const { error: uploadError } = await adminClient.storage
                  .from(env.SUPABASE_ARCHIVE_BUCKET_NAME)
                  .upload(version.s3Key, fileData, {
                    contentType: fileData.type,
                  });

                if (uploadError) {
                  console.error(
                    'Failed to upload to archive bucket:',
                    uploadError,
                  );
                  throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to upload document to archive bucket.',
                  });
                }

                await this.prisma.documentVersion.update({
                  where: { id: version.id },
                  data: { s3Bucket: env.SUPABASE_ARCHIVE_BUCKET_NAME },
                });

                await adminClient.storage
                  .from(version.s3Bucket)
                  .remove([version.s3Key]);
              }
            }

            const fullDoc = await this.prisma.document.findUnique({
              where: { id: doc.id },
              include: {
                uploadedBy: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
                versions: true,
                documentType: true,
                campus: true,
                department: true,
              },
            });

            const manifest = {
              documentId: fullDoc?.id,
              title: fullDoc?.title,
              controlNumber: fullDoc?.controlNumber,
              category: fullDoc?.category,
              createdAt: fullDoc?.createdAt,
              archivedAt: new Date(),
              fileHash: latestHash,
              creator: fullDoc?.uploadedBy
                ? `${fullDoc.uploadedBy.firstName} ${fullDoc.uploadedBy.lastName}`
                : null,
              campus: fullDoc?.campus?.name,
              department: fullDoc?.department?.name,
              documentType: fullDoc?.documentType?.name,
              versions: fullDoc?.versions?.map((v) => ({
                version: v.versionNumber,
                fileType: v.fileType,
                fileSize: v.fileSize,
              })),
            };

            const manifestBuffer = Buffer.from(
              JSON.stringify(manifest, null, 2),
              'utf-8',
            );
            const manifestKey = `manifests/${doc.id}-manifest.json`;

            const { error: manifestUploadError } = await this.supabase
              .getAdminClient()
              .storage.from(env.SUPABASE_ARCHIVE_BUCKET_NAME)
              .upload(manifestKey, manifestBuffer, {
                contentType: 'application/json',
              });

            if (manifestUploadError) {
              console.error(
                'Failed to upload archive manifest:',
                manifestUploadError,
              );
              throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to upload archival manifest.',
              });
            }

            const updatedDoc = await this.prisma.document.update({
              where: { id: doc.id },
              data: {
                lifecycle: {
                  update: {
                    dispositionStatus: 'ARCHIVED',
                    dispositionDate: new Date(),
                    archiveManifestUrl: manifestKey,
                    archiveHash: latestHash,
                  },
                },
              },
              include: { lifecycle: true },
            });

            await this.logService.logAction(
              user.id,
              'Approved and Executed Disposition (ARCHIVE)',
              dbUser.roles.map((r) => r.name),
              doc.title,
              dbUser.campusId || undefined,
              dbUser.departmentId || undefined,
            );
            return updatedDoc;
          }

          return doc;
        }),

      rejectDisposition: protectedProcedure
        .input(z.object({ documentId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const { user, dbUser } = ctx;

          const doc = await ctx.prisma.document.findUnique({
            where: { id: input.documentId },
            include: {
              lifecycle: true,
              workflow: true,
              uploadedBy: {
                select: {
                  departmentId: true,
                },
              },
            },
          });

          if (!doc) throw new TRPCError({ code: 'NOT_FOUND' });

          if (
            doc.workflow?.recordStatus === 'IN_TRANSIT' ||
            doc.workflow?.recordStatus === 'DRAFT'
          ) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message:
                'Disposition cannot be rejected while the document is active or in transit.',
            });
          }

          const isOriginator =
            doc.uploadedById === user.id || doc.originalSenderId === user.id;
          const isOriginatingOffice =
            dbUser.departmentId === doc.uploadedBy?.departmentId &&
            dbUser.roles.some((r) => r.level <= 1);
          const isGlobalAdmin = dbUser.roles.some(
            (r) => r.canManageInstitution,
          );

          if (!isOriginator && !isOriginatingOffice && !isGlobalAdmin) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message:
                'Only the originator, office head, or a global administrator can reject disposition for this document.',
            });
          }

          if (doc.lifecycle?.dispositionStatus !== 'PENDING_DISPOSITION') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Document is not pending disposition',
            });
          }

          const updatedDoc = await this.prisma.document.update({
            where: { id: input.documentId },
            data: {
              lifecycle: {
                update: {
                  dispositionStatus: null,
                  dispositionRequesterId: null,
                },
              },
            },
            include: { lifecycle: true },
          });

          await this.logService.logAction(
            user.id,
            'Rejected Disposition Request',
            dbUser.roles.map((r) => r.name),
            doc.title,
            dbUser.campusId || undefined,
            dbUser.departmentId || undefined,
          );

          return updatedDoc;
        }),

      checkOutDocument: protectedProcedure
        .input(z.object({ documentId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const { user, dbUser } = ctx;

          const aclWhere = this.accessControlService.generateAclWhereClause(
            ctx.dbUser,
          );

          const updatedDoc = await this.prisma.$transaction(async (tx) => {
            const lockedDocs = await tx.$queryRaw<any[]>`
              SELECT id FROM "Document"
              WHERE id = ${input.documentId}
              FOR UPDATE
            `;

            if (lockedDocs.length === 0) {
              throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Document not found or access denied.',
              });
            }

            const doc = await tx.document.findFirst({
              where: {
                id: input.documentId,
                AND: [aclWhere],
              },
              include: {
                documentAccesses: true,
                workflow: true,
              },
            });

            if (!doc) {
              throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Document not found or access denied.',
              });
            }

            if (doc.workflow?.recordStatus === 'FINAL') {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Cannot check out a final document.',
              });
            }

            if (doc.workflow?.isCheckedOut) {
              throw new TRPCError({
                code: 'CONFLICT',
                message: 'Document is already checked out.',
              });
            }

            let hasWriteAccess = false;

            if (doc.workflow?.recordStatus === 'IN_TRANSIT') {
              const documentWithRoutes = await tx.document.findUnique({
                where: { id: doc.id },
                include: { transitRoutes: true },
              });
              const currentRouteStop = documentWithRoutes?.transitRoutes.find(
                (r) => r.status === 'CURRENT',
              );

              const isReturnedOrDisapproved =
                doc.workflow?.status ===
                  'Returned for Corrections/Revision/Clarification' ||
                doc.workflow?.status === 'Disapproved';

              if (isReturnedOrDisapproved) {
                if (
                  doc.uploadedById === user.id ||
                  doc.originalSenderId === user.id
                ) {
                  hasWriteAccess = true;
                }

                if (
                  !hasWriteAccess &&
                  !this.accessControlService.checkPermission(
                    dbUser,
                    'canManageDocuments',
                  )
                ) {
                  throw new TRPCError({
                    code: 'FORBIDDEN',
                    message:
                      'Only the originator can check out a returned or disapproved document.',
                  });
                }
              } else {
                if (
                  currentRouteStop &&
                  dbUser.departmentId === currentRouteStop.departmentId
                ) {
                  const hasLevel1Or2 = dbUser.roles.some(
                    (r) =>
                      (r.level === 1 || r.level === 2) &&
                      r.departmentId === currentRouteStop.departmentId,
                  );
                  if (hasLevel1Or2) {
                    hasWriteAccess = true;
                  }
                }

                if (
                  !hasWriteAccess &&
                  !this.accessControlService.checkPermission(
                    dbUser,
                    'canManageDocuments',
                  )
                ) {
                  throw new TRPCError({
                    code: 'FORBIDDEN',
                    message:
                      'Only Level 1 or 2 users of the currently active office in the transit route can check out this document.',
                  });
                }
              }
            } else {
              if (
                this.accessControlService.checkPermission(
                  dbUser,
                  'canManageDocuments',
                ) ||
                doc.uploadedById === user.id
              ) {
                hasWriteAccess = true;
              } else {
                const writeAclWhere =
                  this.accessControlService.generateAclWhereClause(
                    dbUser,
                    'WRITE',
                  );

                const writeAccessCheck = await tx.document.findFirst({
                  where: {
                    id: input.documentId,
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
            }

            return tx.document.update({
              where: { id: input.documentId },
              data: {
                workflow: {
                  update: {
                    isCheckedOut: true,
                    checkedOutById: user.id,
                  },
                },
              },
              select: {
                id: true,
                title: true,
                workflow: {
                  select: {
                    isCheckedOut: true,
                    checkedOutById: true,
                  },
                },
              },
            });
          });

          await this.logService.logAction(
            user.id,
            'Checked Out Document',
            dbUser.roles.map((r) => r.name),
            updatedDoc.title,
            dbUser.campusId || undefined,
            dbUser.departmentId || undefined,
          );

          return updatedDoc;
        }),

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

          const doc = await this.prisma.document.findUnique({
            where: { id: input.documentId },
            include: { workflow: true },
          });

          if (!doc) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Document not found.',
            });
          }

          if (
            !doc.workflow?.isCheckedOut ||
            doc.workflow?.checkedOutById !== user.id
          ) {
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
          let isFinal =
            input.fileType && allowedFinalFormats.includes(input.fileType)
              ? 'FINAL'
              : 'DRAFT';

          if (
            doc.category === 'FOR_APPROVAL' &&
            doc.workflow?.recordStatus === 'IN_TRANSIT'
          ) {
            isFinal = 'IN_TRANSIT';
          }

          const maxVersion = await this.prisma.documentVersion.aggregate({
            where: { documentId: input.documentId },
            _max: { versionNumber: true },
          });
          const nextVersionNumber = (maxVersion._max.versionNumber || 0) + 1;

          const updatedDoc = await this.prisma.document.update({
            where: { id: input.documentId },
            data: {
              workflow: {
                update: {
                  isCheckedOut: false,
                  checkedOutById: null,
                  recordStatus: isFinal as any,
                },
              },
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
            select: {
              id: true,
              title: true,
              workflow: {
                select: {
                  isCheckedOut: true,
                  checkedOutById: true,
                  recordStatus: true,
                },
              },
              versions: {
                orderBy: { versionNumber: 'desc' as const },
                take: 1,
                select: {
                  id: true,
                  versionNumber: true,
                },
              },
            },
          });

          await this.logService.logAction(
            user.id,
            `Checked In Document (v${nextVersionNumber})`,
            dbUser.roles.map((r) => r.name),
            doc.title,
            dbUser.campusId || undefined,
            dbUser.departmentId || undefined,
          );

          return updatedDoc;
        }),

      discardCheckOut: protectedProcedure
        .input(z.object({ documentId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const { user, dbUser } = ctx;

          const doc = await this.prisma.document.findUnique({
            where: { id: input.documentId },
            include: { workflow: true },
          });

          if (!doc) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Document not found.',
            });
          }

          if (!doc.workflow?.isCheckedOut) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Document is not checked out.',
            });
          }

          const canManageDocuments = this.accessControlService.checkPermission(
            dbUser,
            'canManageDocuments',
          );

          if (
            doc.workflow?.checkedOutById !== user.id &&
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
              workflow: {
                update: {
                  isCheckedOut: false,
                  checkedOutById: null,
                },
              },
            },
            include: { workflow: true },
          });

          await this.logService.logAction(
            user.id,
            'Discarded Check Out',
            dbUser.roles.map((r) => r.name),
            doc.title,
            dbUser.campusId || undefined,
            dbUser.departmentId || undefined,
          );

          return updatedDoc;
        }),
    });
  }
}
