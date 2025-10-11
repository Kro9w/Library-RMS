import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { Document } from '@prisma/client';

// Define a DTO (Data Transfer Object) for creating documents.
// This ensures that the incoming request body has the correct shape.
class CreateDocumentDto {
  title: string;
  type: string;
  content: string;
  tags: string[];
  userID: string;
  uploadedBy: string;
}

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  create(@Body() createDto: CreateDocumentDto): Promise<Document> {
    // The 'createDto' now contains userID and uploadedBy from the request.
    // We derive originalOwnerId and heldById from the userID,
    // ensuring the service receives all the data it needs.
    return this.documentsService.create({
      ...createDto,
      originalOwnerId: createDto.userID,
      heldById: createDto.userID,
    });
  }

  @Get()
  findAll(): Promise<Document[]> {
    return this.documentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Document | null> {
    return this.documentsService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<Document> {
    return this.documentsService.remove(id);
  }
}