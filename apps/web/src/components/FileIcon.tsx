import React from "react";

interface FileIconProps {
  fileType: string | null | undefined;
  fileName: string | null | undefined;
}

export const FileIcon: React.FC<FileIconProps> = ({ fileType, fileName }) => {
  const fType = (fileType || "").toLowerCase();
  const fName = (fileName || "").toLowerCase();

  // TIFF (Master Copy)
  if (
    fType.includes("tiff") ||
    fName.endsWith(".tiff") ||
    fName.endsWith(".tif")
  ) {
    return (
      <i
        className="bi bi-file-earmark-image-fill"
        style={{ color: "#6f42c1", fontSize: "1.2rem" }}
        title="Master Copy"
        aria-label="Master Copy"
      ></i>
    );
  }

  // CSV (Data Set)
  if (fType.includes("csv") || fName.endsWith(".csv")) {
    return (
      <i
        className="bi bi-file-earmark-spreadsheet-fill"
        style={{ color: "#20c997", fontSize: "1.2rem" }}
        title="Data Set"
        aria-label="Data Set"
      ></i>
    );
  }

  // PDF
  if (fType.includes("pdf") || fName.endsWith(".pdf")) {
    return (
      <i
        className="bi bi-file-earmark-pdf-fill text-danger"
        style={{ fontSize: "1.2rem" }}
        title="PDF Document"
        aria-label="PDF Document"
      ></i>
    );
  }

  // Word (DOCX)
  if (
    fType.includes("word") ||
    fName.endsWith(".doc") ||
    fName.endsWith(".docx")
  ) {
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
  if (
    fType.includes("excel") ||
    fType.includes("spreadsheet") ||
    fName.endsWith(".xls") ||
    fName.endsWith(".xlsx")
  ) {
    return (
      <i
        className="bi bi-file-earmark-excel-fill text-success"
        style={{ fontSize: "1.2rem" }}
        title="Spreadsheet"
        aria-label="Spreadsheet"
      ></i>
    );
  }

  // Image
  if (fType.includes("image")) {
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
  if (fType.includes("text")) {
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
