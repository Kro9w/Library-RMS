// apps/web/src/components/UploadModal.tsx
import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { trpc } from "../trpc";
import { supabase } from "../supabase";
import "./ConfirmModal.css";
import "./UploadModal.css";
import { v4 as uuidv4 } from "uuid";
import { useUser } from "@supabase/auth-helpers-react";

const BUCKET_NAME = "FolioDocs";

interface UploadModalProps {
  show: boolean;
  onClose: () => void;
}

export function UploadModal({ show, onClose }: UploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  // --- 1. ADD NEW STATE FOR THE WARNING ---
  const [uploadError, setUploadError] = useState<string | null>(null);
  // ----------------------------------------
  const trpcCtx = trpc.useUtils();
  const user = useUser();

  const createRecordMutation = trpc.documents.createDocumentRecord.useMutation({
    onSuccess: () => {
      trpcCtx.getDashboardStats.invalidate();
      trpcCtx.documents.getAll.invalidate();
    },
    onError: (error) => {
      alert(`Error creating document record: ${error.message}`);
    },
  });

  const handleUpload = async () => {
    if (files.length === 0 || !user) return;
    setIsUploading(true);
    setUploadError(null); // Clear errors on new upload

    try {
      for (const file of files) {
        const fileExtension = file.name.split(".").pop();
        const storageKey = `${user.id}/${uuidv4()}.${fileExtension}`;

        const { data: uploadData, error: uploadError } =
          await supabase.storage
            .from(BUCKET_NAME)
            .upload(storageKey, file, {
              cacheControl: "3600",
              upsert: false,
            });

        if (uploadError) {
          throw new Error(`Supabase upload error: ${uploadError.message}`);
        }

        await createRecordMutation.mutateAsync({
          title: file.name,
          storageKey: uploadData.path,
          storageBucket: BUCKET_NAME,
          fileType: file.type,
          fileSize: file.size,
        });
      }

      alert("All files uploaded successfully!");
      handleClose();
    } catch (error: any) {
      alert(`An error occurred during upload: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFiles([]);
    setUploadError(null); // Clear errors on close
    setIsUploading(false);
    onClose();
  };

  // --- 2. MODIFY 'onDrop' to clear errors ---
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
    setUploadError(null); // Clear any previous errors on a *successful* drop
  }, []);
  // ------------------------------------------

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    // --- 3. ADD FILE TYPE VALIDATION ---
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        ".docx",
      ],
      "application/msword": [".doc"],
    },
    // This handler fires when a file is REJECTED
    onDropRejected: (fileRejections) => {
      const firstError = fileRejections[0].errors[0];
      if (firstError.code === "file-invalid-type") {
        setUploadError(
          "Warning: Other file types are not currently supported. Please upload PDF or DOCX files only."
        );
      } else {
        setUploadError(firstError.message); // Show other errors (e.g., file too large)
      }
      setFiles([]); // Clear any previously accepted files
    },
    // -------------------------------------
    disabled: isUploading,
  });

  const removeFile = (fileName: string) => {
    setFiles(files.filter((file) => file.name !== fileName));
  };

  if (!show) return null;

  return (
    <div className="custom-modal-backdrop" onClick={handleClose}>
      <div
        className="custom-modal-content upload-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="custom-modal-title">Upload Documents</h4>

        <div
          {...getRootProps()}
          className={`upload-dropzone ${isDragActive ? "dropzone-active" : ""}`}
        >
          <input {...getInputProps()} />
          <i className="bi bi-cloud-arrow-up-fill"></i>
          {isDragActive ? (
            <p>Drop the files here ...</p>
          ) : (
            <p>Drag 'n' drop PDF or DOCX files here, or click to select</p>
          )}
        </div>

        {/* --- 4. ADD THE WARNING MESSAGE UI --- */}
        {uploadError && (
          <div className="upload-error-message">
            <i className="bi bi-exclamation-triangle-fill"></i>
            {uploadError}
          </div>
        )}
        {/* ----------------------------------- */}

        {files.length > 0 && (
          <div className="file-list">
            <strong>Selected files:</strong>
            <ul>
              {files.map((file, i) => (
                <li key={i}>
                  <span>{file.name}</span>
                  <button
                    onClick={() => removeFile(file.name)}
                    disabled={isUploading}
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="custom-modal-actions">
          <button
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
          >
            {isUploading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Uploading...
              </>
            ) : `Upload ${files.length} File(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}