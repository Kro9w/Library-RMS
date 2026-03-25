import React, { useState, useRef, useEffect } from "react";
import { trpc } from "../trpc";
import { SendDocumentModal } from "./SendDocumentModal";
import { Modal } from "bootstrap";
import { formatUserName } from "../utils/user";

interface ReviewDocumentModalProps {
  show: boolean;
  onClose: () => void;
  documentId: string;
}

export const ReviewDocumentModal: React.FC<ReviewDocumentModalProps> = ({
  show,
  onClose,
  documentId,
}) => {
  const [status, setStatus] = useState<"approved" | "returned" | "disapproved">(
    "approved",
  );
  const [remarks, setRemarks] = useState("");
  const [showSendModal, setShowSendModal] = useState(false);
  const reviewDocumentMutation = trpc.documents.reviewDocument.useMutation();
  const { data: document } = trpc.documents.getById.useQuery({
    id: documentId,
  });
  const { data: globalTags } = trpc.documents.getGlobalTags.useQuery();

  const sendDocumentMutation = trpc.documents.sendDocument.useMutation();

  const modalRef = useRef<HTMLDivElement>(null);
  const modalInstanceRef = useRef<Modal | null>(null);

  useEffect(() => {
    if (modalRef.current) {
      modalInstanceRef.current = new Modal(modalRef.current);
      modalRef.current.addEventListener("hidden.bs.modal", () => {
        onClose();
      });
    }
    return () => {
      modalInstanceRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (show) {
      modalInstanceRef.current?.show();
    } else {
      modalInstanceRef.current?.hide();
    }
  }, [show]);

  const handleSendBack = async () => {
    if (!documentId || !document?.reviewRequesterId) return;

    await reviewDocumentMutation.mutateAsync({
      documentId,
      status,
      remarks,
    });

    const statusTag = globalTags?.find(
      (tag: { name: string }) => tag.name === status,
    );

    await sendDocumentMutation.mutateAsync({
      documentId,
      recipientId: document.reviewRequesterId,
      tagIds: [],
      tagsToKeep: statusTag ? [statusTag.id] : [],
    });

    onClose();
  };

  const handleSendToSomeoneElse = async () => {
    await reviewDocumentMutation.mutateAsync({
      documentId,
      status,
      remarks,
    });
    setShowSendModal(true);
  };

  // --- Inline Styles for Theme Compliance ---
  const modalHeaderStyle = {
    backgroundColor: "var(--background)",
    borderBottom: "1px solid var(--card-border)",
    color: "var(--brand)",
  };

  const modalBodyStyle = {
    backgroundColor: "var(--background)",
    color: "var(--text)",
  };

  const modalFooterStyle = {
    backgroundColor: "var(--background)",
    borderTop: "1px solid var(--card-border)",
  };

  const labelStyle = {
    color: "var(--text-muted)",
    fontSize: "0.8rem",
    textTransform: "uppercase" as const,
    fontWeight: "bold" as const,
    marginBottom: "0.5rem",
  };

  const inputGroupTextStyle = {
    backgroundColor: "var(--input-bg)",
    borderColor: "var(--card-border)",
    color: "var(--text-muted)",
  };

  const getStatusIcon = (currentStatus: string) => {
    switch (currentStatus) {
      case "approved":
        return <i className="bi bi-check-circle-fill text-success"></i>;
      case "returned":
        return <i className="bi bi-arrow-return-left text-warning"></i>;
      case "disapproved":
        return <i className="bi bi-x-circle-fill text-danger"></i>;
      default:
        return <i className="bi bi-info-circle-fill text-secondary"></i>;
    }
  };

  return (
    <>
      <div
        className="modal fade"
        ref={modalRef}
        id="reviewDocumentModal"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div
            className="modal-content"
            style={{
              backgroundColor: "var(--card-background)",
              border: "1px solid var(--card-border)",
              boxShadow: "var(--card-shadow)",
            }}
          >
            <div className="modal-header" style={modalHeaderStyle}>
              <h5 className="modal-title">
                <i className="bi bi-clipboard-check me-2"></i>Review Document
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body p-4" style={modalBodyStyle}>
              <div className="row g-3">
                <div className="col-12">
                  <label htmlFor="status" style={labelStyle}>
                    Status
                  </label>
                  <div className="input-group">
                    <span
                      className="input-group-text border-end-0"
                      style={inputGroupTextStyle}
                    >
                      {getStatusIcon(status)}
                    </span>
                    <select
                      id="status"
                      className="form-select border-start-0 ps-0"
                      value={status}
                      onChange={(e) =>
                        setStatus(
                          e.target.value as
                            | "approved"
                            | "returned"
                            | "disapproved",
                        )
                      }
                    >
                      <option value="approved">Approved</option>
                      <option value="returned">Returned</option>
                      <option value="disapproved">Disapproved</option>
                    </select>
                  </div>
                </div>
                <div className="col-12 mt-4">
                  <label htmlFor="remarks" style={labelStyle}>
                    Remarks
                  </label>
                  <textarea
                    id="remarks"
                    className="form-control"
                    rows={4}
                    placeholder="Enter any feedback or notes..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  ></textarea>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={modalFooterStyle}>
              <button
                type="button"
                className="btn btn-outline-secondary px-4"
                onClick={onClose}
              >
                Cancel
              </button>
              {document && document.reviewRequesterId && (
                <button
                  type="button"
                  className="btn btn-primary px-4"
                  onClick={handleSendBack}
                  disabled={
                    reviewDocumentMutation.isPending ||
                    sendDocumentMutation.isPending
                  }
                >
                  <i className="bi bi-send-fill me-2"></i>
                  Return to Originator (
                  {formatUserName(document.reviewRequester)})
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary px-4"
                onClick={handleSendToSomeoneElse}
                disabled={
                  reviewDocumentMutation.isPending ||
                  sendDocumentMutation.isPending
                }
              >
                <i className="bi bi-people-fill me-2"></i>
                Forward to Sender
              </button>
            </div>
          </div>
        </div>
      </div>
      {showSendModal && (
        <SendDocumentModal
          show={showSendModal}
          onClose={() => setShowSendModal(false)}
          documentId={documentId}
        />
      )}
    </>
  );
};
