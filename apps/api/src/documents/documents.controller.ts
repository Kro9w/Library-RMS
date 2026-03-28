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
import { fromBuffer } from 'pdf2pic';
import * as pdfParse from 'pdf-parse';

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

      // 1. FAST PATH: If the file is a PDF, try extracting text natively first
      if (isPdf) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
          const pdfData = await (pdfParse as any)(file.buffer);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (pdfData && pdfData.text) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
            const textMatch = pdfData.text.match(
              /CSU-([\s\S]*?)([a-zA-Z0-9-]+)\s*-FL/,
            );
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (textMatch && textMatch[0]) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
              return { controlNumber: textMatch[0].trim() };
            }
          }
        } catch (pdfErr) {
          console.warn(
            'pdf-parse native extraction failed, falling back to OCR:',
            pdfErr,
          );
        }

        // 2. FALLBACK PATH: If PDF is image-based (no native text match), convert first page to image
        const convertOptions = {
          density: 300,
          format: 'png',
          width: 2550,
          height: 3300,
        };
        const convert = fromBuffer(file.buffer, convertOptions);

        try {
          const page1 = await convert(1, { responseType: 'buffer' });
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
          imageBuffer = (page1 as any).buffer;
        } catch (convertErr) {
          console.error('pdf2pic conversion failed:', convertErr);
          return { controlNumber: null };
        }

        // Safeguard against empty buffers returned by pdf2pic
        if (!imageBuffer || imageBuffer.length === 0) {
          console.warn('PDF to Image conversion returned empty buffer');
          return { controlNumber: null };
        }
      }

      // 3. OCR PATH: Run Tesseract on the image buffer (or the converted PDF page)
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
      // Return null rather than failing so the frontend can fallback gracefully
      return { controlNumber: null };
    }
  }
}
