import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { Context } from './trpc.context';
import type { SessionAuthObject } from '@clerk/backend';
import { clerkClient } from '@clerk/clerk-sdk-node';

const t = initTRPC.context<Context>().create();

function isSignedIn(auth: Context['auth']): auth is SessionAuthObject {
  return !!(auth as any).userId;
}

export const appRouter = t.router({
  // Dashboard stats procedure
  getDashboardStats: t.procedure.query(async ({ ctx }) => {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);

    const [
      totalDocuments,
      recentUploadsCount,
      recentFiles,
      totalUsers,
      docsByTypeRaw,
      allDocumentTags,
    ] = await Promise.all([
      ctx.prisma.document.count(),
      ctx.prisma.document.count({
        where: { createdAt: { gte: twentyFourHoursAgo } },
      }),
      ctx.prisma.document.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          uploadedBy: true,
        },
      }),
      ctx.clerk.users.getCount(),
      ctx.prisma.document.groupBy({
        by: ['type'],
        _count: { _all: true },
      }),
      ctx.prisma.document.findMany({
        select: { tags: true },
      }),
    ]);

    const docsByType = docsByTypeRaw.map((item) => ({
      name: item.type.replace('_', ' '),
      value: item._count._all,
    }));

    const tagCountMap: Record<string, number> = {};
    for (const doc of allDocumentTags) {
      if (Array.isArray(doc.tags)) {
        for (const tag of doc.tags) {
          tagCountMap[tag] = (tagCountMap[tag] || 0) + 1;
        }
      }
    }
    const topTags = Object.entries(tagCountMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      totalDocuments,
      recentUploadsCount,
      recentFiles,
      totalUsers,
      docsByType,
      topTags,
    };
  }),

  // Basic document procedures
  getDocuments: t.procedure.query(({ ctx }) => ctx.prisma.document.findMany()),

  getDocument: t.procedure.input(z.string()).query(({ ctx, input }) =>
    ctx.prisma.document.findUnique({ where: { id: input } })
  ),

  createDocument: t.procedure
    .input(
      z.object({
        title: z.string(),
        type: z.string().transform((val) => val.toLowerCase()).pipe(z.enum(['memorandum', 'office_order', 'communication_letter'])),
        content: z.string(),
        tags: z.array(z.string()).optional(),
        userID: z.string(),
        uploadedBy: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.upsert({
        where: { id: input.userID },
        update: {},
        create: {
          id: input.userID,
        },
      });

      return ctx.prisma.document.create({
        data: {
          ...input,
          originalOwnerId: user.id,
          heldById: user.id,
        },
      });
    }),

  deleteDocument: t.procedure.input(z.string()).mutation(({ ctx, input }) => ctx.prisma.document.delete({ where: { id: input } })),

  transferOwnership: t.procedure
    .input(
      z.object({
        controlNumber: z.string(),
        newOwnerId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { controlNumber, newOwnerId } = input;

      const documentToTransfer = await ctx.prisma.document.findUnique({
        where: { controlNumber },
      });

      if (!documentToTransfer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document with this control number not found.',
        });
      }

      const newOwner = await ctx.prisma.user.findUnique({
        where: { id: newOwnerId },
      });

      if (!newOwner) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'The specified new owner does not exist.',
        });
      }

      return ctx.prisma.document.update({
        where: { controlNumber },
        data: {
          heldById: newOwnerId,
        },
      });
    }),

  // --- Procedures for managing Tags ---
  getTags: t.procedure.query(async ({ ctx }) => {
    const allDocsWithTags = await ctx.prisma.document.findMany({
      select: { tags: true },
    });

    const tagCounts = new Map<string, number>();
    allDocsWithTags.forEach((doc) => {
      doc.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    const allTags = await ctx.prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });

    const tagsWithCounts = allTags.map((tag) => ({
      ...tag,
      documentCount: tagCounts.get(tag.name) || 0,
    }));

    return tagsWithCounts;
  }),

  createTag: t.procedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.tag.create({
        data: { name: input.name },
      });
    }),

  updateTag: t.procedure
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.tag.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),

  deleteTag: t.procedure.input(z.string()).mutation(({ ctx, input }) => {
    return ctx.prisma.tag.delete({
      where: { id: input },
    });
  }),

  // User and organization management procedures
  getUsers: t.procedure.query(async ({ ctx }) => {
    const userListResponse = await ctx.clerk.users.getUserList({ limit: 100 });

    return userListResponse.data.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.emailAddresses[0]?.emailAddress,
      publicMetadata: user.publicMetadata,
      createdAt: user.createdAt,
      imageUrl: user.imageUrl,
    }));
  }),

  updateUserRole: t.procedure
    .input(z.object({ userId: z.string(), role: z.enum(['Admin', 'Editor', 'Viewer']) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.clerk.users.updateUser(input.userId, { publicMetadata: { role: input.role } });
      return { success: true };
    }),

  removeUserFromOrg: t.procedure
    .input(z.string())
    .mutation(async ({ input: userId }) => {
      console.log(`Request to remove user ${userId}. Org ID needed for full implementation.`);
      return { success: true };
    }),

  getOrganizations: t.procedure.query(async ({ ctx }) => {
    if (!isSignedIn(ctx.auth)) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be signed in to view organizations.' });
    }
    const orgs = await ctx.clerk.organizations.getOrganizationList({ limit: 100 });
    return orgs.data.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      memberCount: org.membersCount,
      createdAt: org.createdAt,
    }));
  }),

  requestToJoinOrganization: t.procedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!isSignedIn(ctx.auth)) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User must be signed in.' });
      }
      if (!ctx.auth.userId) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Authenticated user is missing a user ID.' });
      }
      await ctx.clerk.organizations.createOrganizationMembership({
        organizationId: input.organizationId,
        userId: ctx.auth.userId,
        role: 'basic_member',
      });
      return { success: true };
    }),
    
  getDocumentsByUserId: t.procedure
    .input(z.string())
    .query(async ({ ctx, input: userId }) => {
      if (!isSignedIn(ctx.auth)) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }
      return ctx.prisma.document.findMany({
        where: { userID: userId },
        select: { id: true, title: true },
      });
    }),

  getDocumentsHeldByUser: t.procedure
    .input(z.string())
    .query(async ({ ctx, input: userId }) => {
      if (!isSignedIn(ctx.auth)) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }
      return ctx.prisma.document.findMany({
        where: { heldById: userId },
        select: { id: true, title: true },
      });
    }),
    
  /**
   * NEW: Fetches all documents with their current holder's ID for the graph.
   */
  getAllDocumentsWithHolder: t.procedure.query(async ({ ctx }) => {
    if (!isSignedIn(ctx.auth)) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return ctx.prisma.document.findMany({
      select: {
        id: true,
        title: true,
        heldById: true,
      },
    });
  }),
});

export type AppRouter = typeof appRouter;