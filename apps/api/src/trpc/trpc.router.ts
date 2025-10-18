import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { Context } from './trpc.context';
import type { SessionAuthObject } from '@clerk/backend';

const t = initTRPC.context<Context>().create();

function isSignedIn(auth: Context['auth']): auth is SessionAuthObject {
  return !!(auth as any).userId;
}

export const appRouter = t.router({
  // Dashboard stats procedure
  getDashboardStats: t.procedure.query(async ({ ctx }) => {
    // ... [existing dashboard stats logic remains unchanged]
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
        select: { id: true, title: true, uploadedBy: true },
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
      // Fetch user details from Clerk to get their name
      const clerkUser = await ctx.clerk.users.getUser(input.userID);
      
      const user = await ctx.prisma.user.upsert({
        where: { id: input.userID },
        // Update name in case it has changed
        update: {
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
        },
        // Create the user with their name
        create: {
          id: input.userID,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
        },
      });

      return ctx.prisma.document.create({
        data: {
          title: input.title,
          type: input.type,
          content: input.content,
          tags: input.tags,
          userID: user.id,
          // Use the full name from Clerk for the 'uploadedBy' field
          uploadedBy: `${clerkUser.firstName} ${clerkUser.lastName}`,
          originalOwnerId: user.id,
          heldById: user.id,
        },
      });
    }),

  deleteDocument: t.procedure.input(z.string()).mutation(({ ctx, input }) => ctx.prisma.document.delete({ where: { id: input } })),

  // NEW: Replaces `transferOwnership`
// --- Find your existing sendDocument procedure and REPLACE it with this ---
  sendDocument: t.procedure
    .input(
      z.object({
        controlNumber: z.string(),
        intendedHolderId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { controlNumber, intendedHolderId } = input;
      const document = await ctx.prisma.document.findUnique({ where: { controlNumber } });
      
      if (!document) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found.' });
      }

      // 1. Get the sender's details from Clerk to use in the notification message
      const sender = await ctx.clerk.users.getUser(document.heldById);
      const senderName = `${sender.firstName} ${sender.lastName}`.trim();

      // 2. Create the notification for the recipient
      await ctx.prisma.notification.create({
        data: {
          userId: intendedHolderId,
          message: `${senderName} sent you a document: "${document.title}"`,
          documentId: document.id,
        },
      });
      
      // 3. Update the document to be in transit
      return ctx.prisma.document.update({
        where: { controlNumber },
        data: { inTransit: true, intendedHolderId },
      });
    }),

// --- ADD these two new procedures anywhere inside the main appRouter object ---
// --- Find and REPLACE the getNotifications procedure ---
  getNotifications: t.procedure
    .query(async ({ ctx }) => {
      if (!isSignedIn(ctx.auth) || !ctx.auth.userId) { // Added a check for userId
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }
      return ctx.prisma.notification.findMany({
        where: {
          userId: ctx.auth.userId, // TypeScript now knows this is a string
          read: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }),

// --- Find and REPLACE the markNotificationsAsRead procedure ---
  markNotificationsAsRead: t.procedure
    .input(z.array(z.string()))
    .mutation(async ({ ctx, input }) => {
      if (!isSignedIn(ctx.auth) || !ctx.auth.userId) { // Added a check for userId
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }
      return ctx.prisma.notification.updateMany({
        where: {
          id: { in: input },
          userId: ctx.auth.userId, // TypeScript now knows this is a string
        },
        data: {
          read: true,
        },
      });
    }),

  // NEW: Companion to `sendDocument`
receiveDocument: t.procedure
    .input(
      z.object({
        controlNumber: z.string(),
        receiverId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { controlNumber, receiverId } = input;
      const { Document, Packer, Paragraph } = require("docx");

      const documentToReceive = await ctx.prisma.document.findUnique({
        where: { controlNumber },
      });
      
      if (!documentToReceive) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found.' });
      }
      if (!documentToReceive.inTransit) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Document is not in transit.' });
      }
      if (documentToReceive.intendedHolderId !== receiverId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not the intended recipient of this document.' });
      }

      // --- START OF FIX ---
      // 1. Ensure the receiving user exists in the local database before proceeding.
      const clerkUser = await ctx.clerk.users.getUser(receiverId);
      await ctx.prisma.user.upsert({
        where: { id: receiverId },
        update: {
            // Optionally update user details if they've changed in Clerk
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
        },
        create: {
          id: receiverId,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
        },
      });
      // --- END OF FIX ---

      // 2. Now, safely update the document's owner.
      const updatedDocument = await ctx.prisma.document.update({
        where: { controlNumber },
        data: { heldById: receiverId, inTransit: false, intendedHolderId: null },
      });

      // 3. Generate the .docx file from its content.
      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({ text: updatedDocument.title, heading: 'Heading1' }),
              new Paragraph({ text: updatedDocument.type }),
              new Paragraph({ text: updatedDocument.content }),
            ],
          },
        ],
      });

      const buffer = await Packer.toBuffer(doc);
      const base64File = buffer.toString('base64');

      // 4. Return success and the file data.
      return {
        success: true,
        fileName: `${updatedDocument.title.replace(/\s+/g, '_')}.docx`,
        fileContent: base64File,
      };
    }),

  // --- Procedures for managing Tags ---
  getTags: t.procedure.query(async ({ ctx }) => {
    // ... [existing getTags logic remains unchanged]
    const allDocsWithTags = await ctx.prisma.document.findMany({ select: { tags: true } });
    const tagCounts = new Map<string, number>();
    allDocsWithTags.forEach((doc) => {
      doc.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    const allTags = await ctx.prisma.tag.findMany({ orderBy: { name: 'asc' } });
    const tagsWithCounts = allTags.map((tag) => ({
      ...tag,
      documentCount: tagCounts.get(tag.name) || 0,
    }));
    return tagsWithCounts;
  }),

  createTag: t.procedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.tag.create({ data: { name: input.name } });
    }),

  updateTag: t.procedure
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.tag.update({ where: { id: input.id }, data: { name: input.name } });
    }),

  deleteTag: t.procedure.input(z.string()).mutation(({ ctx, input }) => {
    return ctx.prisma.tag.delete({ where: { id: input } });
  }),

  // --- User and organization management procedures ---

  // NEW: Gets users from our app's database for the dropdown
  getAppUsers: t.procedure.query(({ ctx }) => {
    return ctx.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
      orderBy: {
        firstName: 'asc'
      }
    });
  }),
  
  getUsers: t.procedure.query(async ({ ctx }) => {
    // ... [existing getUsers logic remains unchanged]
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

  // ... [remaining procedures are unchanged]
  removeUserFromOrg: t.procedure.input(z.string()).mutation(async ({ input: userId }) => {
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
    
  getDocumentsByUserId: t.procedure.input(z.string()).query(async ({ ctx, input: userId }) => {
    if (!isSignedIn(ctx.auth)) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return ctx.prisma.document.findMany({
      where: { userID: userId },
      select: { id: true, title: true },
    });
  }),

  getDocumentsHeldByUser: t.procedure.input(z.string()).query(async ({ ctx, input: userId }) => {
    if (!isSignedIn(ctx.auth)) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return ctx.prisma.document.findMany({
      where: { heldById: userId },
      select: { id: true, title: true },
    });
  }),
    
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