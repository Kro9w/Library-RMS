import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "../supabase.ts";
import { useUser } from "../contexts/SessionContext.tsx";
import { trpc } from "../trpc";
import { v4 as uuidv4 } from "uuid";
import mammoth from "mammoth";
import "./StandardModal.css";
import "./UploadModal.css"; // Keep specific upload overrides

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
    "INSTITUTIONAL" | "CAMPUS" | "INTERNAL" | "CONFIDENTIAL" | "FOR_APPROVAL"
  >("CONFIDENTIAL");
  const [transitRoute, setTransitRoute] = useState<string[]>([]);

  const user = useUser();
  const { data: me } = trpc.user.getMe.useQuery();
  const utils = trpc.useUtils();
  const createDocMutation = trpc.documents.createDocumentRecord.useMutation();
  const { data: documentTypes } = trpc.documentTypes.getAll.useQuery();
  const { data: storageConfig } = trpc.documents.getStorageConfig.useQuery();
  const { data: departmentsResponse } = trpc.user.getDepartments.useQuery(
    { campusId: me?.campusId as string },
    { enabled: !!me?.campusId },
  );
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
        transitRoute:
          classification === "FOR_APPROVAL" ? transitRoute : undefined,
      });

      setFile(null);
      setControlNumber(null);
      setTransitRoute([]);
      setClassification("CONFIDENTIAL");
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
    <div
      className="standard-modal-backdrop"
      onClick={!uploading ? onClose : undefined}
    >
      <div
        className="standard-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="standard-modal-header">
          <div className="standard-modal-icon">
            <i className="bi bi-upload"></i>
          </div>
          <div className="standard-modal-header-text">
            <h5 className="standard-modal-title">Upload document</h5>
            <p className="standard-modal-subtitle">
              PDF, DOCX, or image formats supported
            </p>
          </div>
          {!uploading && (
            <button
              type="button"
              className="standard-modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              <i className="bi bi-x"></i>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="standard-modal-body upload-dialog-body">
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
                onChange={(e) => {
                  setClassification(e.target.value as any);
                  if (e.target.value !== "FOR_APPROVAL") {
                    setTransitRoute([]);
                  } else {
                    if (transitRoute.length === 0) setTransitRoute([""]);
                  }
                }}
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
                <option value="FOR_APPROVAL">
                  For Approval — requires approval routing
                </option>
              </select>
            </div>

            {/* Transit Route Builder */}
            {classification === "FOR_APPROVAL" && (
              <div className="upload-field transit-route-builder">
                <label className="form-label">Approval Route</label>
                <div className="transit-route-list">
                  {transitRoute.map((deptId, index) => {
                    return (
                      <div
                        key={index}
                        className="transit-route-item d-flex align-items-center mb-2"
                      >
                        <span className="badge bg-secondary me-2">
                          {index + 1}
                        </span>
                        <select
                          className="form-select form-select-sm"
                          value={deptId}
                          onChange={(e) => {
                            const newRoute = [...transitRoute];
                            newRoute[index] = e.target.value;
                            setTransitRoute(newRoute);
                          }}
                        >
                          <option value="" disabled>
                            Select Department
                          </option>
                          {departmentsResponse?.map((d: any) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn btn-link text-danger p-0 ms-2"
                          onClick={() => {
                            const newRoute = transitRoute.filter(
                              (_, i) => i !== index,
                            );
                            setTransitRoute(newRoute);
                          }}
                        >
                          <i className="bi bi-x-circle-fill"></i>
                        </button>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm mt-1"
                    onClick={() => setTransitRoute([...transitRoute, ""])}
                  >
                    <i className="bi bi-plus me-1"></i> Add Stop
                  </button>
                </div>
              </div>
            )}

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
                  className={`form-control ${isScanning ? "scanning-input" : ""}`}
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
        <div className="standard-modal-footer">
          <button
            className="standard-modal-btn standard-modal-btn-ghost"
            onClick={onClose}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            className="standard-modal-btn standard-modal-btn-confirm"
            onClick={handleUpload}
            disabled={!file || uploading || !bucketName}
          >
            {uploading ? (
              <>
                <span className="standard-modal-spinner" />
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
