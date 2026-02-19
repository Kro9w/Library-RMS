import React from "react";

interface FileIconProps {
  fileType: string | null | undefined;
  fileName: string | null | undefined;
}

const RE_TIFF_TYPE = /tiff/i;
const RE_TIFF_EXT = /\.(tiff|tif)$/i;
const RE_CSV_TYPE = /csv/i;
const RE_CSV_EXT = /\.csv$/i;
const RE_PDF_TYPE = /pdf/i;
const RE_PDF_EXT = /\.pdf$/i;
const RE_WORD_TYPE = /word/i;
const RE_WORD_EXT = /\.(doc|docx)$/i;
const RE_EXCEL_TYPE = /excel|spreadsheet/i;
const RE_EXCEL_EXT = /\.(xls|xlsx)$/i;
const RE_IMAGE_TYPE = /image/i;
const RE_TEXT_TYPE = /text/i;

export const FileIcon: React.FC<FileIconProps> = ({ fileType, fileName }) => {
  const fType = fileType || "";
  const fName = fileName || "";

  // TIFF (Master Copy)
  if (RE_TIFF_TYPE.test(fType) || RE_TIFF_EXT.test(fName)) {
    return (
      <i
        className="bi bi-file-earmark-image-fill text-primary"
        style={{ fontSize: "1.2rem" }}
        title="Master Copy"
        aria-label="Master Copy"
      ></i>
    );
  }

  // CSV (Data Set)
  if (RE_CSV_TYPE.test(fType) || RE_CSV_EXT.test(fName)) {
    return (
      <i
        className="bi bi-file-earmark-spreadsheet-fill text-secondary"
        style={{ fontSize: "1.2rem" }}
        title="Data Set"
        aria-label="Data Set"
      ></i>
    );
  }

  // PDF
  if (RE_PDF_TYPE.test(fType) || RE_PDF_EXT.test(fName)) {
    return (
      <i
        className="bi bi-file-earmark-pdf-fill text-primary"
        style={{ fontSize: "1.2rem" }}
        title="PDF Document"
        aria-label="PDF Document"
      ></i>
    );
  }

  // Word (DOCX)
  if (RE_WORD_TYPE.test(fType) || RE_WORD_EXT.test(fName)) {
    return (
      <i
        className="bi bi-file-earmark-word-fill text-primary"
        style={{ fontSize: "1.2rem" }}
        title="Word Document"
        aria-label="Word Document"
      ></i>
    );
  }

  // Excel (Spreadsheet)
  if (RE_EXCEL_TYPE.test(fType) || RE_EXCEL_EXT.test(fName)) {
    return (
      <i
        className="bi bi-file-earmark-excel-fill text-secondary"
        style={{ fontSize: "1.2rem" }}
        title="Spreadsheet"
        aria-label="Spreadsheet"
      ></i>
    );
  }

  // Image
  if (RE_IMAGE_TYPE.test(fType)) {
    return (
      <i
        className="bi bi-file-earmark-image-fill text-secondary"
        style={{ fontSize: "1.2rem" }}
        title="Image"
        aria-label="Image"
      ></i>
    );
  }

  // Text
  if (RE_TEXT_TYPE.test(fType)) {
    return (
      <i
        className="bi bi-file-earmark-text-fill text-secondary"
        style={{ fontSize: "1.2rem" }}
        title="Text Document"
        aria-label="Text Document"
      ></i>
    );
  }

  // Default
  return (
    <i
      className="bi bi-file-earmark-fill text-muted"
      style={{ fontSize: "1.2rem" }}
      title="File"
      aria-label="File"
    ></i>
  );
};
