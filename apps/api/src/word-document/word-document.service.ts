import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class WordDocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  async uploadDocument(
    file: Buffer,
    fileName: string,
    controlNumber: string,
    userId: string,
    institutionId: string,
  ) {
    const s3Key = `${institutionId}/${userId}/${fileName}`;
    const s3Bucket = 'documents'; // Replace with your actual bucket name

    // Upload to Supabase Storage
    await this.supabase
      .getAdminClient()
      .storage.from(s3Bucket)
      .upload(s3Key, file);

    // Create a new document record in the database
    const document = await this.prisma.document.create({
      data: {
        fileName,
        controlNumber,
        title: fileName, // You might want to get this from the user
        content: '', // Or extract content from the document
        uploadedById: userId,
        institutionId,
        recordStatus: 'DRAFT',
        versions: {
          create: {
            versionNumber: 1,
            s3Key,
            s3Bucket,
            uploadedById: userId,
          },
        },
      },
    });

    return document;
  }
}
