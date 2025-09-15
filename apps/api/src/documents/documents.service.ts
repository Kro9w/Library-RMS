import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Document } from '@prisma/client';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  // CREATE a new document
  async create(data: { title: string; type: string; content: string; tags: string[] }): Promise<Document> {
    return this.prisma.document.create({
      data,
    });
  }

  // GET all documents
  async findAll(): Promise<Document[]> {
    return this.prisma.document.findMany();
  }

  // GET a single document by ID
  async findOne(id: string): Promise<Document | null> {
    return this.prisma.document.findUnique({
      where: { id },
    });
  }

  // DELETE a document by ID
  async remove(id: string): Promise<Document> {
    return this.prisma.document.delete({
      where: { id },
    });
  }
}