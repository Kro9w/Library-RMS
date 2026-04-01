import React, { useState } from "react";
import { trpc } from "../trpc";
import "./CheckModal.css";

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
      className="check-modal-backdrop"
      onClick={!checkOutMutation.isPending ? onClose : undefined}
    >
      <div className="check-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="check-modal-header">
          <div className="check-modal-icon check-modal-icon-checkout">
            <i className="bi bi-cloud-arrow-down"></i>
          </div>
          <div className="check-modal-header-text">
            <h5 className="check-modal-title">Check Out Document</h5>
            <p className="check-modal-subtitle">
              Lock the document for editing
            </p>
          </div>
          {!checkOutMutation.isPending && (
            <button
              type="button"
              className="check-modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              <i className="bi bi-x"></i>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="check-modal-body">
          <div className="check-modal-notice check-modal-notice-warning">
            <i className="bi bi-lock"></i>
            <p>
              Checking out this document will lock it so no one else can upload
              a new version until you check it back in.
            </p>
          </div>

          {error && (
            <div className="check-modal-notice check-modal-notice-error">
              <i className="bi bi-exclamation-circle"></i>
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="check-modal-footer">
          <button
            className="check-modal-btn check-modal-btn-ghost"
            onClick={onClose}
            disabled={checkOutMutation.isPending}
          >
            Cancel
          </button>
          <button
            className="check-modal-btn check-modal-btn-confirm"
            onClick={handleCheckOut}
            disabled={checkOutMutation.isPending}
          >
            {checkOutMutation.isPending ? (
              <>
                <span className="check-modal-spinner" />
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
