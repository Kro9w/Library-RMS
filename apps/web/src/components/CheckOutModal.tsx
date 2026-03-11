import React, { useState } from "react";
import { trpc } from "../trpc";
import { LoadingAnimation } from "./ui/LoadingAnimation";

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
      className="modal fade show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      tabIndex={-1}
      onClick={!checkOutMutation.isPending ? onClose : undefined}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header bg-light border-bottom-0 pb-0">
            <h5 className="modal-title fw-bold">Check Out Document</h5>
            {!checkOutMutation.isPending && (
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
              ></button>
            )}
          </div>
          <div className="modal-body">
            {checkOutMutation.isPending ? (
              <div className="text-center py-4">
                <LoadingAnimation />
                <p className="mt-3">Checking out document...</p>
              </div>
            ) : (
              <div>
                <div className="alert alert-warning">
                  You are about to check out this document. This will lock it so
                  no one else can upload a new version until you check it back
                  in.
                </div>
                {error && <div className="alert alert-danger">{error}</div>}
              </div>
            )}
          </div>
          <div className="modal-footer border-top-0 pt-0">
            <button
              className="btn btn-secondary"
              onClick={onClose}
              disabled={checkOutMutation.isPending}
            >
              Cancel
            </button>
            <button
              className="btn btn-success"
              onClick={handleCheckOut}
              disabled={checkOutMutation.isPending}
            >
              Check Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
