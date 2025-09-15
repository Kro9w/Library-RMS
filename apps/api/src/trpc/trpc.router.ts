import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { Context } from './trpc.context';
// 1. Use a 'require' statement to bypass the module resolution issue
const { Document, Packer, Paragraph } = require("docx");
import { Buffer } from "buffer";

// Helper to convert Node Buffer to ArrayBuffer for mammoth
function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  const copy = Buffer.from(buffer);
  return copy.buffer.slice(copy.byteOffset, copy.byteOffset + copy.byteLength);
}

// Backend router
const t = initTRPC.context<Context>().create();

export const appRouter = t.router({
  hello: t.procedure.query(() => 'Hello from tRPC!'),

  echo: t.procedure.input(z.object({ msg: z.string() })).mutation(({ input }) => input.msg),

  increment: t.procedure.input(z.number()).mutation(({ input }) => input + 1),

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
      })
    )
    .mutation(({ ctx, input }) => ctx.prisma.document.create({ data: input })),

  updateDocument: t.procedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        type: z.string().optional(),
        content: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.document.update({ where: { id }, data });
    }),

  deleteDocument: t.procedure.input(z.string()).mutation(({ ctx, input }) =>
    ctx.prisma.document.delete({ where: { id: input } })
  ),

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
              // 2. Use the raw string 'heading1' instead of the enum to bypass the type error
              new Paragraph({ text: docData.title, heading: 'heading1' }),
              new Paragraph({ text: docData.type }),
              new Paragraph({ text: docData.content }),
            ],
          },
        ],
      });

      const buffer = await Packer.toBuffer(doc);
      // Return the file content as a Base64 encoded string, which is JSON-safe.
      return buffer.toString('base64');
    }),

  uploadDocument: t.procedure
    .input(
      z.object({
        fileBuffer: z.instanceof(Buffer),
        title: z.string(),
        type: z.enum(['memorandum','office_order','communication_letter']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const arrayBuffer = bufferToArrayBuffer(input.fileBuffer);
      const mammoth = await import("mammoth");
      const { value: htmlContent } = await mammoth.convertToHtml({ arrayBuffer });

      return ctx.prisma.document.create({
        data: {
          title: input.title,
          type: input.type,
          content: htmlContent,
          tags: [],
        },
      });
    }),

  convertDocx: t.procedure
    .input(z.object({ fileBuffer: z.instanceof(Buffer) }))
    .mutation(async ({ input }) => {
      const arrayBuffer = bufferToArrayBuffer(input.fileBuffer);
      const mammoth = await import("mammoth");
      const { value: htmlContent } = await mammoth.convertToHtml({ arrayBuffer });
      return { htmlContent };
    }),
});

export type AppRouter = typeof appRouter;

