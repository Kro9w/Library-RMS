import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "../supabase.ts";
import { useUser } from "../contexts/SessionContext.tsx";
import { trpc } from "../trpc";
import { v4 as uuidv4 } from "uuid";
import mammoth from "mammoth";
import "./UploadModal.css";

interface UploadModalProps {
  show: boolean;
  onClose: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ show, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<
    string | undefined
  >();
  const [controlNumber, setControlNumber] = useState<string | null>(null);
  const [classification, setClassification] = useState<
    "INSTITUTIONAL" | "CAMPUS" | "INTERNAL" | "CONFIDENTIAL"
  >("CONFIDENTIAL");

  const user = useUser();
  const { data: me } = trpc.user.getMe.useQuery();
  const utils = trpc.useUtils();
  const createDocMutation = trpc.documents.createDocumentRecord.useMutation();
  const { data: documentTypes } = trpc.documentTypes.getAll.useQuery();
  const { data: storageConfig } = trpc.documents.getStorageConfig.useQuery();
  const bucketName = storageConfig?.bucketName;

  const highestRoleLevel =
    me?.roles && me.roles.length > 0
      ? me.roles.reduce(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (min: number, role: any) => Math.min(min, role.level),
          Infinity,
        )
      : 4;
  const canManageDocs =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    me?.roles?.some((r: any) => r.canManageDocuments) ?? false;

  const [isScanning, setIsScanning] = useState(false);

  const scanForControlNumber = async (f: File) => {
    setIsScanning(true);
    setControlNumber(null);

    if (f.name.endsWith(".docx")) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target?.result;
        if (arrayBuffer instanceof ArrayBuffer) {
          try {
            const result = await mammoth.extractRawText({ arrayBuffer });
            const match = result.value.match(
              /CSU-([\s\S]*?)([a-zA-Z0-9-]+)\s*-FL/,
            );
            setControlNumber(match?.[0]?.trim() ?? null);
          } catch {
            setControlNumber(null);
          } finally {
            setIsScanning(false);
          }
        } else {
          setIsScanning(false);
        }
      };
      reader.onerror = () => setIsScanning(false);
      reader.readAsArrayBuffer(f);
    } else {
      // PDF or Image
      try {
        const formData = new FormData();
        formData.append("file", f);

        const response = await fetch("/api/documents/extract-ocr", {
          method: "POST",
          body: formData,
          // If you need auth headers (e.g., Bearer token), they might go here.
          // Assuming proxy handles it or cookie auth is used.
        });

        if (response.ok) {
          const data = await response.json();
          setControlNumber(data.controlNumber ?? null);
        } else {
          setControlNumber(null);
        }
      } catch (err) {
        console.error("OCR API error:", err);
        setControlNumber(null);
      } finally {
        setIsScanning(false);
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles[0]) {
        setFile(acceptedFiles[0]);
        setError(null);
        scanForControlNumber(acceptedFiles[0]);
      }
    },
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/tiff": [".tiff", ".tif"],
    },
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file || !user || !bucketName) {
      setError("Missing required information.");
      return;
    }
    setUploading(true);
    setError(null);

    const fileExtension = file.name.split(".").pop();
    const storageKey = `${user.id}/${uuidv4()}.${fileExtension}`;

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(storageKey, file);

      if (uploadError) throw uploadError;

      await createDocMutation.mutateAsync({
        title: file.name,
        storageKey: uploadData.path,
        storageBucket: bucketName,
        documentTypeId: selectedDocumentType,
        fileType: file.type,
        fileSize: file.size,
        classification,
        controlNumber: controlNumber ?? null,
      });

      setFile(null);
      setControlNumber(null);
      onClose();
      await utils.documents.invalidate();
      await utils.getDashboardStats.invalidate();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="upload-backdrop" onClick={!uploading ? onClose : undefined}>
      <div className="upload-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="upload-dialog-header">
          <div>
            <div className="upload-dialog-title">Upload document</div>
            <div className="upload-dialog-subtitle">
              PDF, DOCX, or image formats supported
            </div>
          </div>
          {!uploading && (
            <button className="upload-close-btn" onClick={onClose}>
              <i className="bi bi-x" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="upload-dialog-body">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`upload-dropzone ${isDragActive ? "active" : ""} ${file ? "has-file" : ""}`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="upload-file-selected">
                <div className="upload-file-icon">
                  <i
                    className={`bi ${
                      file.type.includes("pdf")
                        ? "bi-file-earmark-pdf"
                        : file.type.includes("word")
                          ? "bi-file-earmark-word"
                          : file.type.includes("image")
                            ? "bi-file-earmark-image"
                            : "bi-file-earmark"
                    }`}
                  />
                </div>
                <div className="upload-file-meta">
                  <div className="upload-file-name">{file.name}</div>
                  <div className="upload-file-size">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                <button
                  className="upload-file-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setControlNumber(null);
                  }}
                  type="button"
                >
                  <i className="bi bi-x" />
                </button>
              </div>
            ) : (
              <div className="upload-dropzone-inner">
                <div className="upload-dropzone-icon">
                  <i className="bi bi-cloud-arrow-up" />
                </div>
                <div className="upload-dropzone-text">
                  {isDragActive ? (
                    "Drop the file here"
                  ) : (
                    <>
                      <strong>Click to upload</strong> or drag and drop
                    </>
                  )}
                </div>
                <div className="upload-dropzone-hint">
                  PDF, DOCX, PNG, JPG, TIFF
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="upload-error">
              <i className="bi bi-exclamation-circle" />
              {error}
            </div>
          )}

          {/* Fields */}
          <div className="upload-fields">
            {/* Classification */}
            <div className="upload-field">
              <label className="form-label">Classification</label>
              <select
                className="form-control form-select"
                value={classification}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onChange={(e) => setClassification(e.target.value as any)}
              >
                {(highestRoleLevel <= 1 || canManageDocs) && (
                  <>
                    <option value="INSTITUTIONAL">
                      Institutional — institution-wide
                    </option>
                    <option value="CAMPUS">Campus — campus-wide</option>
                  </>
                )}
                {(highestRoleLevel <= 2 || canManageDocs) && (
                  <option value="INTERNAL">Internal — department only</option>
                )}
                <option value="CONFIDENTIAL">
                  Confidential — sender & recipient only
                </option>
              </select>
            </div>

            {/* Document type */}
            <div className="upload-field">
              <label className="form-label">
                Document type{" "}
                <span className="upload-field-optional">optional</span>
              </label>
              <select
                className="form-control form-select"
                value={selectedDocumentType ?? ""}
                onChange={(e) =>
                  setSelectedDocumentType(e.target.value || undefined)
                }
              >
                <option value="">No type</option>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {documentTypes?.map((type: any) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Control number */}
            {file && (
              <div className="upload-field">
                <label className="form-label">
                  Control number
                  <span className="upload-field-hint">
                    {isScanning
                      ? "Scanning document..."
                      : "Auto-extracted or enter manually"}
                  </span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={isScanning ? "Scanning..." : (controlNumber ?? "")}
                  onChange={(e) => setControlNumber(e.target.value)}
                  disabled={isScanning}
                  placeholder="e.g. CSU-12345-A-FL"
                  style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="upload-dialog-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={!file || uploading || !bucketName}
          >
            {uploading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                />
                Uploading…
              </>
            ) : (
              <>
                <i className="bi bi-upload" />
                Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
