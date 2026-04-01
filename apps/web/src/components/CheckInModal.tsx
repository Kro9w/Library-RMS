import React, { useState } from "react";
import { trpc } from "../trpc";
import { supabase } from "../supabase";
import "./StandardModal.css";

interface CheckInModalProps {
  show: boolean;
  onClose: () => void;
  documentId: string;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  show,
  onClose,
  documentId,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: user } = trpc.user.getMe.useQuery();
  const { data: config } = trpc.documents.getStorageConfig.useQuery();
  const utils = trpc.useUtils();

  const checkInMutation = trpc.documents.checkInDocument.useMutation({
    onSuccess: () => {
      utils.documents.getAll.invalidate();
      utils.documents.getById.invalidate({ id: documentId });
      onClose();
    },
    onError: (err) => {
      setError(err.message);
      setUploading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !user || !config) return;

    setUploading(true);
    setError(null);

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(config.bucketName)
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      checkInMutation.mutate({
        documentId,
        storageKey: filePath,
        storageBucket: config.bucketName,
        fileType: file.type,
        fileSize: file.size,
      });
    } catch (err: any) {
      setError(err.message);
      setUploading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return "bi-file-earmark-pdf-fill";
    if (fileType.includes("word") || fileType.includes("document"))
      return "bi-file-earmark-word-fill";
    if (fileType.includes("image")) return "bi-file-earmark-image-fill";
    return "bi-file-earmark-fill";
  };

  if (!show) return null;

  const isProcessing = uploading || checkInMutation.isPending;

  return (
    <div
      className="standard-modal-backdrop"
      onClick={!isProcessing ? onClose : undefined}
    >
      <div
        className="standard-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="standard-modal-header">
          <div className="standard-modal-icon">
            <i className="bi bi-cloud-arrow-up"></i>
          </div>
          <div className="standard-modal-header-text">
            <h5 className="standard-modal-title">Check In Document</h5>
            <p className="standard-modal-subtitle">
              Upload a revised version and release the lock
            </p>
          </div>
          {!isProcessing && (
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
        <div className="standard-modal-body">
          {/* Info notice */}
          <div className="standard-modal-notice standard-modal-notice-info">
            <i className="bi bi-info-circle"></i>
            <p>
              Uploading a PDF or image will finalize this document and lock it
              from further edits.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="standard-modal-notice standard-modal-notice-error">
              <i className="bi bi-exclamation-circle"></i>
              <p>{error}</p>
            </div>
          )}

          {/* Drop zone / file selector */}
          {!file ? (
            <label
              className="standard-modal-dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <input
                type="file"
                className="standard-modal-file-input"
                onChange={handleFileChange}
                disabled={isProcessing}
              />
              <div className="standard-modal-dropzone-content">
                <i className="bi bi-cloud-arrow-up standard-modal-dropzone-icon"></i>
                <span className="standard-modal-dropzone-label">
                  Click to select or drag &amp; drop
                </span>
                <span className="standard-modal-dropzone-hint">
                  PDF, DOCX, PNG, JPG, TIFF
                </span>
              </div>
            </label>
          ) : (
            <div className="standard-modal-file-selected">
              <i
                className={`bi ${getFileIcon(file.type)} standard-modal-file-icon`}
              ></i>
              <div className="standard-modal-file-meta">
                <span className="standard-modal-file-name">{file.name}</span>
                <span className="standard-modal-file-size">
                  {formatBytes(file.size)}
                </span>
              </div>
              {!isProcessing && (
                <button
                  className="standard-modal-file-remove"
                  onClick={() => setFile(null)}
                  aria-label="Remove file"
                >
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>
          )}

          {/* Upload progress */}
          {isProcessing && (
            <div className="standard-modal-uploading">
              <span className="standard-modal-spinner" />
              <span>Uploading new version…</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="standard-modal-footer">
          <button
            className="standard-modal-btn standard-modal-btn-ghost"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            className="standard-modal-btn standard-modal-btn-confirm"
            onClick={handleUpload}
            disabled={!file || isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="standard-modal-spinner" />
                Uploading…
              </>
            ) : (
              <>
                <i className="bi bi-cloud-arrow-up"></i>
                Check In
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
