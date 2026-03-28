import React, { useState } from "react";
import { trpc } from "../trpc";
import { supabase } from "../supabase";

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

  if (!show) return null;

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      tabIndex={-1}
      onClick={!uploading ? onClose : undefined}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header bg-light border-bottom-0 pb-0">
            <h5 className="modal-title fw-bold">Check In Document</h5>
            {!uploading && (
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
              ></button>
            )}
          </div>
          <div className="modal-body">
            {uploading ? (
              <div className="text-center py-4">
                null
                <p className="mt-3">Uploading new version...</p>
              </div>
            ) : (
              <div>
                <div
                  className="alert alert-info"
                  style={{ fontSize: "0.9rem" }}
                >
                  Upload the updated file to check it in as a new version.
                  <br />
                  <small className="d-block mt-1">
                    Note: Uploading a final format (PDF or image) will
                    transition this document's status to FINAL and lock it from
                    further editing.
                  </small>
                </div>
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="mb-3">
                  <label htmlFor="fileUpload" className="form-label fw-bold">
                    Select File
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    id="fileUpload"
                    onChange={handleFileChange}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer border-top-0 pt-0">
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
              disabled={!file || uploading}
            >
              Check In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
