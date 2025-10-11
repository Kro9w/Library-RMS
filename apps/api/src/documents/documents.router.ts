import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { Context } from '../trpc/trpc.context';
// 1. Use a 'require' statement to bypass the ES module import issue.
const { Document, Packer, Paragraph } = require("docx");
import { Buffer } from "buffer";

// 1. Initialize tRPC directly in the main router file.
const t = initTRPC.context<Context>().create();

// Helper function
function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  const copy = Buffer.from(buffer);
  return copy.buffer.slice(copy.byteOffset, copy.byteOffset + copy.byteLength);
}

// 2. Define all your procedures in a single appRouter.
export const appRouter = t.router({
  // Document Procedures
  getDocuments: t.procedure.query(({ ctx }) => ctx.prisma.document.findMany()),

  getDocument: t.procedure.input(z.string()).query(({ ctx, input }) =>
    ctx.prisma.document.findUnique({ where: { id: input } })
  ),

  createDocument: t.procedure
    .input(
      z.object({
        title: z.string(),
        type: z.enum(['memorandum','office_order','communication_letter']),
        content: z.string(),
        tags: z.array(z.string()).optional(),
        userID: z.string(),
        uploadedBy: z.string(),
      })
    )
    .mutation(({ ctx, input }) => {
      const { userID } = input;
      return ctx.prisma.document.create({
        data: {
          ...input,
          originalOwnerId: userID,
          heldById: userID,
        },
      });
    }),

  deleteDocument: t.procedure.input(z.string()).mutation(({ ctx, input }) =>
    ctx.prisma.document.delete({ where: { id: input } })
  ),

  transferOwnership: t.procedure
    .input(
      z.object({
        controlNumber: z.string(),
        newOwnerId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { controlNumber, newOwnerId } = input;

      const document = await ctx.prisma.document.findUnique({
        where: { controlNumber },
      });

      if (!document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document with this control number not found.',
        });
      }

      return ctx.prisma.document.update({
        where: { controlNumber: controlNumber },
        data: { heldById: newOwnerId },
      });
    }),
  
  // Other Procedures
  hello: t.procedure.query(() => 'Hello from tRPC!'),

  exportDocument: t.procedure
    .input(
      z.object({
        title: z.string(),
        type: z.string(),
        content: z.string(),
      })
    )
    .mutation(async ({ input: docData }) => {
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({ text: docData.title, heading: 'heading1' }),
              new Paragraph({ text: docData.type }),
              new Paragraph({ text: docData.content }),
            ],
          },
        ],
      });

      const buffer = await Packer.toBuffer(doc);
      return buffer.toString('base64');
    }),

  // ... (add any other procedures you have here)
});

// 3. Export the AppRouter type for the frontend.
export type AppRouter = typeof appRouter;