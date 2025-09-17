import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import type { Context } from './trpc.context';
const { Document, Packer, Paragraph } = require("docx");
import { Buffer } from "buffer";

// Initialize tRPC in the main router file.
const t = initTRPC.context<Context>().create();

export const appRouter = t.router({
  // --- Existing Dashboard & Document Procedures ---
  getDashboardStats: t.procedure.query(async ({ ctx }) => {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);

    const totalDocuments = await ctx.prisma.document.count();
    const recentUploadsCount = await ctx.prisma.document.count({
      where: { createdAt: { gte: twentyFourHoursAgo } },
    });
    const recentFiles = await ctx.prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    const totalUsers = await ctx.clerk.users.getCount();

    return { totalDocuments, recentUploadsCount, recentFiles, totalUsers };
  }),

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
    .mutation(({ ctx, input }) => ctx.prisma.document.create({ data: input })),

  deleteDocument: t.procedure.input(z.string()).mutation(({ ctx, input }) =>
    ctx.prisma.document.delete({ where: { id: input } })
  ),
  
  // --- Procedures for managing Tags ---
  getTags: t.procedure.query(({ ctx }) => {
    return ctx.prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });
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
  
  deleteTag: t.procedure
    .input(z.string())
    .mutation(({ ctx, input }) => {
      return ctx.prisma.tag.delete({
        where: { id: input },
      });
    }),
    
  // --- Procedures for User Management ---
  getUsers: t.procedure.query(async ({ ctx }) => {
    const users = await ctx.clerk.users.getUserList({ limit: 100 });
    return users.data;
  }),

  updateUserRole: t.procedure
    .input(z.object({
      userId: z.string(),
      role: z.enum(['Admin', 'Editor', 'Viewer']),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.clerk.users.updateUser(input.userId, {
        publicMetadata: { role: input.role },
      });
      return { success: true };
    }),
  
  removeUserFromOrg: t.procedure
    .input(z.string())
    .mutation(async ({ input: userId }) => {
      console.log(`Request to remove user ${userId}. Org ID needed for full implementation.`);
      return { success: true };
    }),
});

export type AppRouter = typeof appRouter;

