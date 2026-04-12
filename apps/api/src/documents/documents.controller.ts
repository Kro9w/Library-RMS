import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer'; // Imports the ambient types for Express.Multer
import * as Tesseract from 'tesseract.js';
import { PDFParse } from 'pdf-parse';

@Controller('documents')
export class DocumentsController {
  @Post('extract-ocr')
  @UseInterceptors(FileInterceptor('file'))
  async extractOcr(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      let imageBuffer = file.buffer;
      const isPdf =
        file.mimetype === 'application/pdf' ||
        file.originalname.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        try {
          const parser = new PDFParse({ data: file.buffer });
          const pdfData = await parser.getText();
          if (pdfData && pdfData.text) {
            const textMatch = pdfData.text.match(
              /CSU-([\s\S]*?)([a-zA-Z0-9-]+)\s*-FL/,
            );
            if (textMatch && textMatch[0]) {
              return { controlNumber: textMatch[0].trim() };
            }
          }
        } catch (pdfErr) {
          console.warn(
            'pdf-parse native extraction failed, falling back to OCR:',
            pdfErr,
          );
        }

        try {
          const parser = new PDFParse({ data: file.buffer });
          const screenshot = await parser.getScreenshot({
            imageBuffer: true,
            scale: 2.0,
          });

          if (screenshot && screenshot.pages && screenshot.pages.length > 0) {
            imageBuffer = Buffer.from(screenshot.pages[0].data);
          } else {
            console.warn('PDF screenshot extraction returned no pages');
            return { controlNumber: null };
          }
        } catch (convertErr) {
          console.error('PDF to Image conversion failed:', convertErr);
          return { controlNumber: null };
        }

        if (!imageBuffer || imageBuffer.length === 0) {
          console.warn('PDF to Image conversion returned empty buffer');
          return { controlNumber: null };
        }
      }

      if (!imageBuffer || imageBuffer.length === 0) {
        return { controlNumber: null };
      }

      const result = await Tesseract.recognize(imageBuffer, 'eng', {
        errorHandler: (e) => console.error('Tesseract inner worker error:', e),
      });
      const extractedText = result.data.text;

      const match = extractedText.match(/CSU-([\s\S]*?)([a-zA-Z0-9-]+)\s*-FL/);

      if (match && match[0]) {
        return { controlNumber: match[0].trim() };
      } else {
        return { controlNumber: null };
      }
    } catch (error) {
      console.error('OCR Extraction failed completely:', error);
      return { controlNumber: null };
    }
  }
}
