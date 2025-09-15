import { trpc } from '../trpc/trpc';
import { DocumentsService } from './documents.service';
import { z } from 'zod'; // Zod is great for input validation

// This is a dependency injection solution for services in tRPC
// You would configure this in your trpc.context.ts
// For now, we'll instantiate the service directly for simplicity.
// In a real app, you'd get this from the context.
// const documentsService = new DocumentsService(new PrismaService());

export const documentsRouter = trpc.router({
  getDocuments: trpc.procedure
    .query(() => {
      // This is where you would call your DocumentsService
      // return documentsService.findAll();
      console.log('Fetching all documents');
      return [{ id: '1', title: 'Mock Document', type: 'memorandum', content: '', tags: [], createdAt: new Date(), updatedAt: new Date() }];
    }),

  createDocument: trpc.procedure
    .input(z.object({
      title: z.string(),
      type: z.string(),
      content: z.string(),
      tags: z.array(z.string()),
    }))
    .mutation(({ input }) => {
      // This is where you would call your DocumentsService
      // return documentsService.create(input);
      console.log('Creating document with title:', input.title);
      return { ...input, id: '2', createdAt: new Date(), updatedAt: new Date() };
    }),
});
