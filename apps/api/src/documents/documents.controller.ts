import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { DocumentsService } from './documents.service';

@Controller('documents') // Base route is /documents
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  create(@Body() createDto: { title: string; type: string; content: string; tags: string[] }) {
    return this.documentsService.create(createDto);
  }

  @Get()
  findAll() {
    return this.documentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }
}