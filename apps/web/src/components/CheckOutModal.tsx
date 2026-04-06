import React, { useState } from "react";
import { trpc } from "../trpc";
import "./StandardModal.css";

interface CheckOutModalProps {
  show: boolean;
  onClose: () => void;
  documentId: string;
}

export const CheckOutModal: React.FC<CheckOutModalProps> = ({
  show,
  onClose,
  documentId,
}) => {
  const [error, setError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  // @ts-ignore
  const checkOutMutation = trpc.documents.checkOutDocument.useMutation({
    onSuccess: () => {
      utils.documents.getAll.invalidate();
      utils.documents.getById.invalidate({ id: documentId });
      onClose();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleCheckOut = () => {
    checkOutMutation.mutate({ documentId });
  };

  if (!show) return null;

  return (
    <div
      className="standard-modal-backdrop"
      onClick={!checkOutMutation.isPending ? onClose : undefined}
    >
      <div
        className="standard-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="standard-modal-header">
          <div className="standard-modal-icon">
            <i className="bi bi-cloud-arrow-down"></i>
          </div>
          <div className="standard-modal-header-text">
            <h5 className="standard-modal-title">Check Out Document</h5>
            <p className="standard-modal-subtitle">
              Lock the document for editing
            </p>
          </div>
          {!checkOutMutation.isPending && (
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
          <div className="standard-modal-notice standard-modal-notice-warning">
            <i className="bi bi-lock"></i>
            <p>
              Checking out this document will lock it so no one else can upload
              a new version until you check it back in.
            </p>
          </div>

          {error && (
            <div className="standard-modal-notice standard-modal-notice-error">
              <i className="bi bi-exclamation-circle"></i>
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="standard-modal-footer">
          <button
            className="standard-modal-btn standard-modal-btn-ghost"
            onClick={onClose}
            disabled={checkOutMutation.isPending}
          >
            Cancel
          </button>
          <button
            className="standard-modal-btn standard-modal-btn-confirm"
            onClick={handleCheckOut}
            disabled={checkOutMutation.isPending}
          >
            {checkOutMutation.isPending ? (
              <>
                <span className="standard-modal-spinner" />
                Checking out…
              </>
            ) : (
              <>
                <i className="bi bi-cloud-arrow-down"></i>
                Check Out
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
