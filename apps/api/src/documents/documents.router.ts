// apps/api/src/documents/documents.router.ts
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { authedProcedure, publicProcedure, router } from '../trpc/trpc';
import { TRPCError } from '@trpc/server';

@Injectable()
export class DocumentsRouter {
  router = router({
    // ... (getDocument, createDocument, deleteDocument, etc. are unchanged) ...

    getDocuments: authedProcedure.query(({ ctx }) => {
      return ctx.prisma.document.findMany({
        where: { organizationId: ctx.dbUser.organizationId },
        include: {
          uploadedBy: {
            select: { name: true },
          },
        },
      });
    }),

    getDocument: authedProcedure
      .input(z.string())
      .query(async ({ ctx, input }) => {
        const document = await ctx.prisma.document.findUnique({
          where: { id: input },
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
          },
        });

        if (!document || document.organizationId !== ctx.dbUser.organizationId) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Document not found.',
          });
        }
        return document;
      }),

    createDocument: authedProcedure
      .input(
        z.object({
          title: z.string(),
          content: z.string(),
          fileUrl: z.string(),
          tags: z.array(z.object({ id: z.string() })),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return ctx.prisma.document.create({
          data: {
            title: input.title,
            content: input.content,
            fileUrl: input.fileUrl,
            organizationId: ctx.dbUser.organizationId,
            uploadedById: ctx.dbUser.id,
            tags: {
              create: input.tags.map((tag) => ({
                tag: {
                  connect: { id: tag.id },
                },
              })),
            },
          },
        });
      }),

    deleteDocument: authedProcedure
      .input(z.string())
      .mutation(async ({ ctx, input }) => {
        const document = await ctx.prisma.document.findFirst({
          where: {
            id: input,
            organizationId: ctx.dbUser.organizationId,
          },
        });

        if (!document) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Document not found.',
          });
        }
        await ctx.prisma.documentTag.deleteMany({
          where: { documentId: input },
        });
        
        return ctx.prisma.document.delete({ where: { id: input } });
      }),

    sendDocument: authedProcedure
      .input(
        z.object({
          documentId: z.string(),
          intendedUserId: z.string(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { documentId, intendedUserId } = input;
        const document = await ctx.prisma.document.findFirst({
          where: {
            id: documentId,
            organizationId: ctx.dbUser.organizationId,
          },
        });

        if (!document) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Document not found.',
          });
        }
        
        await ctx.prisma.notification.create({
          data: {
            userId: intendedUserId,
            documentId: document.id,
            message: `${ctx.dbUser.name} sent you a document: "${document.title}"`,
          },
        });

        return { success: true };
      }),

    getNotifications: authedProcedure.query(async ({ ctx }) => {
      return ctx.prisma.notification.findMany({
        where: {
          userId: ctx.dbUser.id,
          read: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          document: {
            select: { title: true },
          },
        },
      });
    }),

    markNotificationsAsRead: authedProcedure
      .input(z.array(z.string()))
      .mutation(async ({ ctx, input }) => {
        return ctx.prisma.notification.updateMany({
          where: {
            id: { in: input },
            userId: ctx.dbUser.id,
          },
          data: {
            read: true,
          },
        });
      }),
      
    receiveDocument: authedProcedure
      .input(z.object({ documentId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        console.log(`User ${ctx.dbUser.id} received document ${input.documentId}`);
        return { success: true };
      }),

    /**
     * Get all tags, with document counts for the user's org
     */
    getTags: authedProcedure.query(async ({ ctx }) => {
      // 1. Get all global tags
      const allTags = await ctx.prisma.tag.findMany({ orderBy: { name: 'asc' } });

      // 2. Get tag counts *for the user's org*
      const tagCountsRaw = await ctx.prisma.documentTag.groupBy({
        by: ['tagId'],
        _count: {
          tagId: true, // Count by tagId
        },
        where: {
          document: {
            organizationId: ctx.dbUser.organizationId,
          },
        },
      });

      // 3. Convert counts to an easy-to-use Map
      const tagCountMap = new Map<string, number>();
      for (const count of tagCountsRaw) {
        tagCountMap.set(count.tagId, count._count.tagId);
      }

      // 4. Combine tags with their counts
      const tagsWithCounts = allTags.map((tag) => ({
        ...tag,
        documentCount: tagCountMap.get(tag.id) || 0,
      }));

      return tagsWithCounts;
    }),

    /**
     * Create a new global tag
     */
    createTag: authedProcedure
      .input(z.object({ name: z.string().min(1) }))
      .mutation(({ ctx, input }) => {
        return ctx.prisma.tag.create({ data: { name: input.name } });
      }),

    /**
     * Update a global tag
     */
    updateTag: authedProcedure
      .input(z.object({ id: z.string(), name: z.string().min(1) }))
      .mutation(({ ctx, input }) => {
        return ctx.prisma.tag.update({
          where: { id: input.id },
          data: { name: input.name },
        });
      }),

    /**
     * Delete a global tag
     */
    deleteTag: authedProcedure
      .input(z.string())
      .mutation(async ({ ctx, input }) => {
        // Must delete references from the join table first
        await ctx.prisma.documentTag.deleteMany({
          where: { tagId: input },
        });
        // Then delete the tag
        return ctx.prisma.tag.delete({ where: { id: input } });
      }),

    /**
     * Get all users within the same organization
     */
    getAppUsers: authedProcedure.query(({ ctx }) => {
      return ctx.prisma.user.findMany({
        where: {
          organizationId: ctx.dbUser.organizationId,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: {
          name: 'asc',
        },
      });
    }),

    /**
     * Get documents uploaded by a specific user (within the same org)
     */
    getDocumentsByUserId: authedProcedure
      .input(z.string())
      .query(async ({ ctx, input: userId }) => {
        return ctx.prisma.document.findMany({
          where: {
            uploadedById: userId,
            organizationId: ctx.dbUser.organizationId,
          },
          select: { id: true, title: true },
        });
      }),
  });
}