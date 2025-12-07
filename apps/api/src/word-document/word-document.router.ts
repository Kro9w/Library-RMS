import { Injectable } from '@nestjs/common';
import { router, protectedProcedure } from '../trpc/trpc';
import { z } from 'zod';
import { WordDocumentService } from './word-document.service';
import { TRPCError } from '@trpc/server';

@Injectable()
export class WordDocumentRouter {
  constructor(private readonly wordDocumentService: WordDocumentService) {}

  createRouter() {
    return router({
      upload: protectedProcedure
        .input(
          z.object({
            file: z.string(), // base64 encoded file
            fileName: z.string(),
            controlNumber: z.string(),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          const { file, fileName, controlNumber } = input;
          const { dbUser } = ctx;

          if (!dbUser.organizationId) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'User is not associated with an organization.',
            });
          }

          const fileBuffer = Buffer.from(file, 'base64');

          return this.wordDocumentService.uploadDocument(
            fileBuffer,
            fileName,
            controlNumber,
            dbUser.id,
            dbUser.organizationId,
          );
        }),
    });
  }
}
