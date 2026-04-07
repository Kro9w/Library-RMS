import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogService } from '../log/log.service';
import { AccessControlService } from './access-control.service';
import { TRPCError } from '@trpc/server';
import { env } from '../env';
import { Prisma } from '@prisma/client';

@Injectable()
export class DocumentWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
    private readonly accessControlService: AccessControlService,
  ) {}

  public async createNotification(
    userIds: string | string[],
    title: string,
    message: string,
    documentId: string,
  ) {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    if (ids.length === 0) return;

    const notifData = ids.map((userId) => ({
      userId,
      title,
      message,
      documentId,
    }));

    await this.prisma.notification.createMany({
      data: notifData,
    });
  }

  public async sendDocument(
    ctx: any,
    input: {
      documentId: string;
      institutionIds: string[];
      campusIds: string[];
      departmentIds: string[];
      userIds: string[];
    },
  ) {
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
            (min: number, role: any) => Math.min(min, role.level),
            Infinity,
          )
        : 4; // Default to lowest privilege if no roles are assigned

    const canManageDocs = this.accessControlService.checkPermission(
      dbUser,
      'canManageDocuments',
    );
    const canManageInstitution = this.accessControlService.checkPermission(
      dbUser,
      'canManageInstitution',
    );
    const isOriginator = async (docId: string) => {
      const d = await this.prisma.document.findUnique({
        where: { id: docId },
      });
      return d?.uploadedById === user.id || d?.originalSenderId === user.id;
    };

    const document = await this.prisma.document.findUnique({
      where: {
        id: input.documentId,
        institutionId: dbUser.institutionId,
      },
    });

    if (!document) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Document not found.',
      });
    }

    const docWorkflow = await this.prisma.documentWorkflow.findUnique({
      where: { documentId: document.id },
    });

    if (
      document.classification === 'FOR_APPROVAL' ||
      docWorkflow?.recordStatus === 'IN_TRANSIT'
    ) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message:
          'Documents FOR_APPROVAL cannot be sent directly; use the Forward routing system instead.',
      });
    }

    const _isOriginator = await isOriginator(input.documentId);

    // Authority Check based on classification
    if (document.classification === 'CONFIDENTIAL') {
      // For CONFIDENTIAL documents, strictly only the originator or global admins can broadcast.
      // Intermediate reviewers who received the document through routing cannot.
      if (!_isOriginator && !canManageInstitution) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            'Only the originator or institution administrators can broadcast CONFIDENTIAL documents.',
        });
      }
    } else if (
      document.classification === 'INSTITUTIONAL' ||
      document.classification === 'INTERNAL'
    ) {
      if (!_isOriginator && highestRoleLevel > 1 && !canManageInstitution) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            'Only Executives, Level 1 users, Originators, or Admins can cascade/send Institutional or Internal documents.',
        });
      }
    } else if (document.classification === 'DEPARTMENTAL') {
      if (!_isOriginator && highestRoleLevel > 2 && !canManageDocs) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            'Only Level 1/2 users, Originators, or Admins can send Departmental documents.',
        });
      }
    }

    const accessesToCreate: any[] = [];

    if (document.classification === 'INSTITUTIONAL') {
      for (const id of input.institutionIds)
        accessesToCreate.push({
          documentId: document.id,
          institutionId: id,
          permission: 'READ',
        });
    }
    if (
      document.classification === 'INSTITUTIONAL' ||
      document.classification === 'INTERNAL'
    ) {
      for (const id of input.campusIds)
        accessesToCreate.push({
          documentId: document.id,
          campusId: id,
          permission: 'READ',
        });
    }
    if (
      document.classification === 'INSTITUTIONAL' ||
      document.classification === 'INTERNAL' ||
      document.classification === 'DEPARTMENTAL'
    ) {
      for (const id of input.departmentIds)
        accessesToCreate.push({
          documentId: document.id,
          departmentId: id,
          permission: 'READ',
        });
    }
    for (const id of input.userIds)
      accessesToCreate.push({
        documentId: document.id,
        userId: id,
        permission: 'READ',
      });

    if (accessesToCreate.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No valid targets were selected.',
      });
    }

    // In PostgreSQL/Prisma, createMany will fail if duplicate unique constraints are hit. To avoid failing on re-sends,
    // we should first fetch existing accesses and filter out duplicates.
    const existingAccesses = await this.prisma.documentAccess.findMany({
      where: { documentId: document.id },
    });

    const isDuplicate = (req: any) =>
      existingAccesses.some(
        (ex) =>
          ex.institutionId === req.institutionId &&
          ex.campusId === req.campusId &&
          ex.departmentId === req.departmentId &&
          ex.userId === req.userId,
      );

    const finalAccesses = accessesToCreate.filter((a) => !isDuplicate(a));

    if (finalAccesses.length > 0) {
      await this.prisma.documentAccess.createMany({
        data: finalAccesses,
      });
    }

    // Build generic log
    let broadTargetName = '';
    if (input.institutionIds.length > 0) broadTargetName = 'Institution(s)';
    else if (input.campusIds.length > 0) broadTargetName = 'Campus(es)';
    else if (input.departmentIds.length > 0) broadTargetName = 'Department(s)';
    else if (input.userIds.length > 0) broadTargetName = 'Specific User(s)';

    await this.logService.logAction(
      user.id,
      dbUser.institutionId,
      `Sent Document to ${broadTargetName}`,
      dbUser.roles.map((r: any) => r.name),
      document.title,
      dbUser.campusId || undefined,
      dbUser.departmentId || undefined,
    );

    // Build notifications specifically for Level 1/2 targets within broad scopes to reduce spam
    // or directly for users.
    const senderName = `${dbUser.firstName} ${dbUser.lastName}`.trim();

    const targetsForNotification = new Set<string>();

    for (const uid of input.userIds) targetsForNotification.add(uid);

    const broadScopesWhere: any[] = [];
    if (input.institutionIds.length > 0)
      broadScopesWhere.push({
        institutionId: { in: input.institutionIds },
      });
    if (input.campusIds.length > 0)
      broadScopesWhere.push({ campusId: { in: input.campusIds } });
    if (input.departmentIds.length > 0)
      broadScopesWhere.push({
        departmentId: { in: input.departmentIds },
      });

    if (broadScopesWhere.length > 0) {
      const keyUsers = await this.prisma.user.findMany({
        where: {
          OR: broadScopesWhere,
          roles: {
            some: {
              OR: [{ level: 1 }, { level: 2 }, { canManageDocuments: true }],
            },
          },
        },
        select: { id: true },
      });
      keyUsers.forEach((u) => targetsForNotification.add(u.id));
    }

    // Filter out sender
    targetsForNotification.delete(user.id);

    await this.createNotification(
      Array.from(targetsForNotification),
      'Document Sent',
      `${senderName} sent the document "${document.title}" to your scope.`,
      document.id,
    );

    return { success: true, count: finalAccesses.length };
  }

  public async forwardDocument(
    ctx: any,
    input: {
      documentId: string;
      recipientId: string;
    },
  ) {
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

    if (
      !this.accessControlService.checkPermission(dbUser, 'canManageDocuments')
    ) {
      whereClause.uploadedById = user.id;
    }

    const documents = await this.prisma.document.findMany({
      where: whereClause,
      include: { workflow: true },
    });

    if (documents.length === 0) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'One or more documents not found or access denied.',
      });
    }

    if (
      documents[0].classification === "FOR_APPROVAL" && 
      (user.id === documents[0].uploadedById || user.id === documents[0].originalSenderId)
    ) {
      const firstRouteStop = await this.prisma.documentTransitRoute.findFirst({
        where: {
          documentId: input.documentId,
          sequenceOrder: 0,
        },
      });

      if (firstRouteStop && firstRouteStop.status === 'PENDING') {
        await this.prisma.documentTransitRoute.update({
          where: { id : firstRouteStop.id },
          data: { status: 'CURRENT' },
        });

        if (documents[0].workflow?.recordStatus !== 'IN_TRANSIT') {
          await this.prisma.documentWorkflow.update({
            where: { id : input.documentId },
            data: { recordStatus: 'IN_TRANSIT' },
          });

          if (documents[0].workflow) {
            documents[0].workflow.recordStatus = 'IN_TRANSIT';
          }
        }
      }
    }

    let isReview = false;

    // If the document is IN_TRANSIT and FOR_APPROVAL, automatically enforces the "for review"
    if (
      documents[0].workflow?.recordStatus === 'IN_TRANSIT' &&
      documents[0].classification === 'FOR_APPROVAL' &&
      documents[0].uploadedById !== recipient.id &&
      documents[0].originalSenderId !== recipient.id
    ) {
      isReview = true;
    }

    const isReturningToOriginator =
      documents[0].uploadedById === recipient.id ||
      documents[0].originalSenderId === recipient.id;
    const isOriginatorResubmitting =
      documents[0].workflow?.recordStatus === 'IN_TRANSIT' &&
      documents[0].classification === 'FOR_APPROVAL' &&
      (user.id === documents[0].uploadedById ||
        user.id === documents[0].originalSenderId) &&
      (documents[0].workflow?.status ===
        'Returned for Corrections/Revision/Clarification' ||
        documents[0].workflow?.status === 'Disapproved');

    const isAutoReceive = isReturningToOriginator || isOriginatorResubmitting;

    // ONLY create a DocumentDistribution if it is a formal, first-time transfer.
    // If the document is being sent back and forth between the originator and reviewer, bypass the distribution table to reduce redundancy.
    if (!isAutoReceive) {
      await this.prisma.documentDistribution.create({
        data: {
          documentId: input.documentId,
          senderId: user.id,
          recipientId: recipient.id,
          status: 'PENDING',
        },
      });
    } else {
      // Ensure they have access if we bypassed the formal distribution process
      const existingAccess = await this.prisma.documentAccess.findFirst({
        where: {
          documentId: input.documentId,
          userId: recipient.id,
        },
      });

      if (!existingAccess) {
        await this.prisma.documentAccess.create({
          data: {
            documentId: input.documentId,
            userId: recipient.id,
            permission: 'READ',
          },
        });
      }
    }

    // When an originator resubmits a returned/disapproved IN_TRANSIT document,
    // we must clear the historical "decision" logged on the CURRENT transit route stop
    // so the UI correctly reverts to a generic pending "Current" state icon instead of sticking to the "Returned" icon.
    if (
      documents[0].workflow?.recordStatus === 'IN_TRANSIT' &&
      documents[0].classification === 'FOR_APPROVAL' &&
      (user.id === documents[0].uploadedById ||
        user.id === documents[0].originalSenderId) &&
      (documents[0].workflow?.status ===
        'Returned for Corrections/Revision/Clarification' ||
        documents[0].workflow?.status === 'Disapproved')
    ) {
      // Find the CURRENT route stop for this document
      const currentStop = await this.prisma.documentTransitRoute.findFirst({
        where: {
          documentId: documents[0].id,
          status: 'CURRENT',
        },
      });

      if (currentStop && currentStop.departmentId === recipient.departmentId) {
        await this.prisma.documentTransitRoute.update({
          where: { id: currentStop.id },
          data: { decision: null },
        });
      }
    }

    // Update status
    const updatedDocument = await this.prisma.document.update({
      where: { id: input.documentId },
      data: {
        workflow: {
          update: {
            reviewRequesterId: isReview ? user.id : null,
            status: isReview ? null : undefined, // Clear status if re-submitting for review
          },
        },
      },
      include: { workflow: true },
    });

    await this.logService.logAction(
      user.id,
      dbUser.institutionId,
      `Sent Document to ${recipient.firstName} ${recipient.lastName} (Pending Receipt)`,
      dbUser.roles.map((r: any) => r.name),
      updatedDocument.title,
      dbUser.campusId || undefined,
      dbUser.departmentId || undefined,
    );

    // Notifications
    const senderName = `${dbUser.firstName} ${dbUser.lastName}`.trim();
    const isTransit =
      updatedDocument.workflow?.recordStatus === 'IN_TRANSIT' &&
      updatedDocument.classification === 'FOR_APPROVAL';

    if (isReturningToOriginator) {
      await this.createNotification(
        recipient.id,
        'Document Returned',
        `${senderName} has returned the document "${updatedDocument.title}" to you for corrections/review.`,
        updatedDocument.id,
      );
    } else if (isOriginatorResubmitting) {
      await this.createNotification(
        recipient.id,
        'Document Resubmitted (In Transit)',
        `${senderName} has resubmitted the document "${updatedDocument.title}" to your office. Action required.`,
        updatedDocument.id,
      );
    } else if (isTransit) {
      await this.createNotification(
        recipient.id,
        'Review Requested (In Transit)',
        `${senderName} has forwarded the document "${updatedDocument.title}" to your office for review and endorsement. Action required.`,
        updatedDocument.id,
      );
    } else if (isReview) {
      await this.createNotification(
        recipient.id,
        'Review Requested',
        `${senderName} has sent you a confidential document for review: "${updatedDocument.title}". Action required.`,
        updatedDocument.id,
      );
    } else {
      await this.createNotification(
        recipient.id,
        'Document Received',
        `${senderName} sent you a document: "${updatedDocument.title}". Action required to receive it.`,
        updatedDocument.id,
      );
    }

    return updatedDocument;
  }

  public async reviewDocument(
    ctx: any,
    input: {
      documentId: string;
      status:
        | 'Approved'
        | 'Noted'
        | 'For Endorsement'
        | 'Returned for Corrections/Revision/Clarification'
        | 'For the review of the Executive Committee'
        | 'Disapproved';
      remarks?: string;
      finalFileType?: string;
      finalFileSize?: number;
      finalStorageKey?: string;
    },
  ) {
    const { user, dbUser } = ctx;

    if (!dbUser.institutionId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'User does not belong to an institution.',
      });
    }

    const document = await this.prisma.document.findUnique({
      where: { id: input.documentId },
      include: {
        transitRoutes: { include: { department: true } },
        workflow: true,
      },
    });

    if (!document) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Document not found.',
      });
    }

    // Verify permissions for transit route vs standard approval
    const isTransit =
      document.classification === 'FOR_APPROVAL' &&
      document.workflow?.recordStatus === 'IN_TRANSIT';

    if (isTransit) {
      const currentRouteStop = document.transitRoutes.find(
        (r) => r.status === 'CURRENT',
      );

      let hasTransitAccess = false;
      if (
        currentRouteStop &&
        dbUser.departmentId === currentRouteStop.departmentId
      ) {
        // Allow Level 1 users of the active department to review
        if (
          dbUser.roles.some(
            (r: any) =>
              r.level === 1 && r.departmentId === currentRouteStop.departmentId,
          )
        ) {
          hasTransitAccess = true;
        }
      }

      // Allow fallback to global admins
      if (
        !hasTransitAccess &&
        !this.accessControlService.checkPermission(dbUser, 'canManageDocuments')
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            'Only Level 1 users of the currently active office in the transit route (or Admins) can review this document.',
        });
      }
    } else {
      this.accessControlService.requirePermission(dbUser, 'canManageDocuments');
    }

    // Format Immutability: You cannot approve a draft (editable format)
    if (input.status === 'Approved') {
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
      const fileTypeToCheck = input.finalFileType || latestVersion?.fileType;

      if (!fileTypeToCheck || !allowedFinalFormats.includes(fileTypeToCheck)) {
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

    const maxVersion = await this.prisma.documentVersion.aggregate({
      where: { documentId: input.documentId },
      _max: { versionNumber: true },
    });
    const nextVersionNumber = (maxVersion._max.versionNumber || 0) + 1;

    const updateData: Prisma.DocumentUpdateInput = {
      workflow: {
        update: {
          status: input.status,
        },
      },
    };

    if (input.status === 'Approved') {
      updateData.workflow = {
        update: {
          status: input.status,
          recordStatus: 'FINAL',
        },
      };
      updateData.classification = 'CONFIDENTIAL';

      if (input.finalStorageKey) {
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
    }

    const isAdvancingRoute =
      input.status === 'Noted' || input.status === 'For Endorsement';
    let logActionString = `Reviewed Document (Status: ${input.status})`;

    if (isTransit) {
      const currentRouteStop = document.transitRoutes.find(
        (r) => r.status === 'CURRENT',
      );

      if (currentRouteStop) {
        if (isAdvancingRoute) {
          // Update current stop to APPROVED
          await this.prisma.documentTransitRoute.update({
            where: { id: currentRouteStop.id },
            data: {
              status: 'APPROVED',
              decision: input.status,
              approvedById: user.id,
              approvedAt: new Date(),
            },
          });

          // Find next stop and set to CURRENT
          const nextRouteStop = document.transitRoutes.find(
            (r) => r.sequenceOrder === currentRouteStop.sequenceOrder + 1,
          );

          if (nextRouteStop) {
            await this.prisma.documentTransitRoute.update({
              where: { id: nextRouteStop.id },
              data: {
                status: 'CURRENT',
              },
            });

            // Find Level 0 (apex), Level 1 users, or those with document management permissions in the next department
            const nextDeptUsers = await this.prisma.user.findMany({
              where: {
                departmentId: nextRouteStop.departmentId,
                roles: {
                  some: {
                    OR: [
                      { level: 0 },
                      { level: 1 },
                      { canManageDocuments: true },
                    ],
                  },
                },
              },
            });

            if (nextDeptUsers.length > 0) {
              // Do NOT auto-grant READ access to the department.
              // They must formally click "Receive" to get personal READ access and log the transfer.

              // Create pending distributions for Level 1 users to receive
              await this.prisma.documentDistribution.createMany({
                data: nextDeptUsers.map((targetUser) => ({
                  documentId: document.id,
                  senderId: user.id,
                  recipientId: targetUser.id,
                  status: 'PENDING',
                })),
              });

              // Send notifications explicitly
              await this.createNotification(
                nextDeptUsers.map((targetUser) => targetUser.id),
                'Review Requested (In Transit)',
                `${dbUser.firstName} ${dbUser.lastName} has forwarded the document "${document.title}" to your office for review and endorsement. Action required.`,
                document.id,
              );
            }

            // Update log action string for advancing
            const currentDept = currentRouteStop.department;
            const nextDept = nextRouteStop.department;
            logActionString = `${currentDept?.name || 'An office'} has endorsed the document to ${nextDept?.name || 'the next office'}`;
          }
        } else if (input.status === 'Approved') {
          // Mark final stop as approved
          await this.prisma.documentTransitRoute.update({
            where: { id: currentRouteStop.id },
            data: {
              status: 'APPROVED',
              decision: input.status,
              approvedById: user.id,
              approvedAt: new Date(),
            },
          });
        } else {
          // If Returning or Disapproved, we do not advance route status to APPROVED, but we do record the decision on the current node
          await this.prisma.documentTransitRoute.update({
            where: { id: currentRouteStop.id },
            data: {
              decision: input.status,
            },
          });
        }
      }
    }

    const updatedDocument = await this.prisma.document.update({
      where: { id: input.documentId },
      data: updateData,
      include: { workflow: true },
    });

    await this.logService.logAction(
      user.id,
      dbUser.institutionId,
      logActionString,
      dbUser.roles.map((r: any) => r.name),
      updatedDocument.title,
      dbUser.campusId || undefined,
      dbUser.departmentId || undefined,
    );

    // Notification to the requester
    if (document.workflow?.reviewRequesterId) {
      const reviewerName = `${dbUser.firstName} ${dbUser.lastName}`.trim();
      await this.createNotification(
        document.workflow.reviewRequesterId,
        'Review Completed',
        `${reviewerName} has marked your document "${updatedDocument.title}" as ${input.status}.`,
        updatedDocument.id,
      );
    }

    return updatedDocument;
  }
}
