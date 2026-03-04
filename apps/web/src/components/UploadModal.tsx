// apps/web/src/components/UploadModal.tsx
import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "../supabase";
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
  const [files, setFiles] = useState<File[]>([]);
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
  const highestRoleLevel =
    me?.roles && me.roles.length > 0
      ? me.roles.reduce(
          (min: number, role: any) => Math.min(min, role.level),
          Infinity,
        )
      : 4; // Default to Level 4 (lowest privilege) if no roles found
  const canManageDocs =
    me?.roles?.some((r: any) => r.canManageDocuments) ?? false;
  const utils = trpc.useUtils();
  const createDocMutation = trpc.documents.createDocumentRecord.useMutation();
  const { data: documentTypes } = trpc.documentTypes.getAll.useQuery();
  const { data: storageConfig, isLoading: isConfigLoading } =
    trpc.documents.getStorageConfig.useQuery();
  const bucketName = storageConfig?.bucketName;

  const scanForControlNumber = async (file: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target?.result;
      if (arrayBuffer instanceof ArrayBuffer) {
        try {
          const result = await mammoth.extractRawText({ arrayBuffer });
          const text = result.value;
          const regex = /CSU\-([\s\S]*?)([a-zA-Z0-9-]+)\s*-FL/;
          const match = text.match(regex);
          if (match && match[2]) {
            setControlNumber(match[2].trim());
          } else {
            setControlNumber("No control number found in this document");
          }
        } catch (err) {
          console.error("Error reading docx file:", err);
          setControlNumber("NONE");
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      setFiles(acceptedFiles);
      if (acceptedFiles.length > 0) {
        scanForControlNumber(acceptedFiles[0]);
      }
    },
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
  });

  const handleUpload = async () => {
    if (files.length === 0 || !user) return;
    if (!bucketName) {
      setError("Supabase bucket name is not configured.");
      return;
    }

    setUploading(true);
    setError(null);

    const file = files[0];
    const fileExtension = file.name.split(".").pop();
    const storageKey = `${user.id}/${uuidv4()}.${fileExtension}`;

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(storageKey, file);

      if (uploadError) {
        throw uploadError;
      }

      await createDocMutation.mutateAsync({
        title: file.name,
        storageKey: uploadData.path,
        storageBucket: bucketName,
        documentTypeId: selectedDocumentType,
        fileType: file.type,
        fileSize: file.size,
        classification: classification,
        controlNumber:
          controlNumber !== "No control number found in this document"
            ? controlNumber
            : null,
      });

      setFiles([]);
      onClose();
      alert("Upload successful!");

      // Invalidate queries to refetch document list and dashboard stats
      await utils.documents.invalidate();
      await utils.getDashboardStats.invalidate();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  if (!show) {
    return null;
  }

  return (
    <div className="custom-modal-backdrop" onClick={onClose}>
      <div
        className="custom-modal-content upload-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="custom-modal-title">
          <h5 style={{ margin: 0, fontSize: "1.25rem", color: "inherit" }}>
            Upload Document
          </h5>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
          ></button>
        </div>
        <div
          style={{ padding: "1.5rem", maxHeight: "70vh", overflowY: "auto" }}
        >
          <div
            {...getRootProps({
              className: `upload-dropzone${
                isDragActive ? " dropzone-active" : ""
              }`,
            })}
          >
            <input {...getInputProps()} />
            <i className="bi bi-cloud-arrow-up-fill"></i>
            <p>Drag 'n' drop PDF or DOCX files here, or click to select</p>
          </div>
          <aside>
            <h4>Files</h4>
            <ul>
              {files.map((file) => (
                <li key={file.name}>
                  {file.name} - {file.size} bytes
                </li>
              ))}
            </ul>
          </aside>
          <div className="mb-3">
            <label htmlFor="controlNumber" className="form-label">
              Control Number
            </label>
            <input
              type="text"
              id="controlNumber"
              className="form-control"
              value={
                controlNumber || "Drop a file to scan for a control number"
              }
              readOnly
            />
          </div>
          <div className="mb-3">
            <label htmlFor="documentType" className="form-label">
              Document Type
            </label>
            <select
              id="documentType"
              className="form-select"
              value={selectedDocumentType}
              onChange={(e) => setSelectedDocumentType(e.target.value)}
            >
              <option value="">Select a type...</option>
              {documentTypes?.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor="classification" className="form-label">
              Classification / Visibility
            </label>
            <select
              id="classification"
              className="form-select"
              value={classification}
              onChange={(e) => setClassification(e.target.value as any)}
            >
              {(highestRoleLevel <= 1 || canManageDocs) && (
                <>
                  <option value="INSTITUTIONAL">
                    Institutional (Institution-wide)
                  </option>
                  <option value="CAMPUS">Campus (Campus-wide)</option>
                </>
              )}
              {(highestRoleLevel <= 2 || canManageDocs) && (
                <option value="INTERNAL">
                  Internal (Department/Office only)
                </option>
              )}
              <option value="CONFIDENTIAL">
                Confidential (Sender and Recipient only)
              </option>
            </select>
            <div className="form-text">
              Controls who can view this document based on standard access
              controls.
            </div>
          </div>
          {error && <p className="error">{error}</p>}
        </div>
        <div className="custom-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={
              uploading || files.length === 0 || isConfigLoading || !bucketName
            }
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
};
