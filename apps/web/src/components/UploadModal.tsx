// apps/web/src/components/UploadModal.tsx
import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { trpc } from "../trpc";
import { supabase } from "../supabase";
// We'll re-use the styles from your ConfirmModal for the backdrop
import "./ConfirmModal.css"; 
// We'll add new styles for the uploader itself
import "./UploadModal.css"; 

interface UploadModalProps {
  show: boolean;
  onClose: () => void;
}

export function UploadModal({ show, onClose }: UploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const trpcCtx = trpc.useUtils();

  // The tRPC mutation to create the DB record *after* upload
  const createRecordMutation = trpc.documents.createDocumentRecord.useMutation({
    onSuccess: () => {
      // When successful, refresh dashboard and document lists
      trpcCtx.getDashboardStats.invalidate();
      trpcCtx.documents.getAll.invalidate();
    },
    onError: (error) => {
      alert(`Error creating document record: ${error.message}`);
    },
  });

  const handleUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);

    try {
      // Upload files one by one
      for (const file of files) {
        
        // --- 1. UPLOAD TO SUPABASE STORAGE ---
        // !!! IMPORTANT: Replace 'documents' with your actual bucket name
        const { data: uploadData, error: uploadError } =
          await supabase.storage
            .from("documents") // <--- REPLACE 'documents' with your bucket name
            .upload(file.name, file, {
              cacheControl: "3600",
              upsert: false, // Don't overwrite existing files
            });

        if (uploadError) {
          throw new Error(`Supabase upload error: ${uploadError.message}`);
        }

        // --- 2. CREATE DATABASE RECORD via tRPC ---
        await createRecordMutation.mutateAsync({
          title: file.name,
          storageKey: uploadData.path,
          storageBucket: "documents", // <--- REPLACE 'documents' with your bucket name
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

  // Resets state and calls the parent onClose
  const handleClose = () => {
    setFiles([]);
    setIsUploading(false);
    onClose();
  };

  // --- react-dropzone hook logic ---
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploading,
  });

  const removeFile = (fileName: string) => {
    setFiles(files.filter((file) => file.name !== fileName));
  };
  // ---------------------------------

  if (!show) return null;

  return (
    // Re-use backdrop style from ConfirmModal.css
    <div className="custom-modal-backdrop" onClick={handleClose}>
      {/* Re-use content style, but add our own for sizing */}
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
            <p>Drag & drop files here, or click to select files</p>
          )}
        </div>

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