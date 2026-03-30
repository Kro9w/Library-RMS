import React, { useState, useRef, useEffect } from "react";
import { trpc } from "../trpc";
import { SendDocumentModal } from "./SendDocumentModal";
import { Modal } from "bootstrap";

interface ReviewDocumentModalProps {
  show: boolean;
  onClose: () => void;
  documentId: string;
}

type ReviewStatus =
  | "Approved"
  | "Noted"
  | "For Endorsement"
  | "Returned for Corrections/Revision/Clarification"
  | "For the review of the Executive Committee"
  | "Disapproved";

export const ReviewDocumentModal: React.FC<ReviewDocumentModalProps> = ({
  show,
  onClose,
  documentId,
}) => {
  const [status, setStatus] = useState<ReviewStatus | "">("");
  const [remarks, setRemarks] = useState("");
  const [showSendModal, setShowSendModal] = useState(false);
  const reviewDocumentMutation = trpc.documents.reviewDocument.useMutation();
  const { data: document } = trpc.documents.getById.useQuery({
    id: documentId,
  });
  const { data: globalTags } = trpc.documents.getGlobalTags.useQuery();
  const { data: user } = trpc.user.getMe.useQuery();

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

  const isTransit =
    document?.classification === "FOR_APPROVAL" &&
    document?.recordStatus === "IN_TRANSIT";

  const isFinalStop = React.useMemo(() => {
    if (!isTransit || !document?.transitRoutes || !user) return false;
    const currentRoute = document.transitRoutes.find(
      (r: any) => r.status === "CURRENT",
    );
    if (!currentRoute) return false;

    // Check if the current route stop is the last one in the sequence
    const maxSequence = Math.max(
      ...document.transitRoutes.map((r: any) => r.sequenceOrder),
    );
    return currentRoute.sequenceOrder === maxSequence;
  }, [isTransit, document?.transitRoutes, user]);

  const allowedStatuses = React.useMemo(() => {
    const baseStatuses = [
      "Noted",
      "For Endorsement",
      "Returned for Corrections/Revision/Clarification",
      "For the review of the Executive Committee",
      "Disapproved",
    ];

    if (!isTransit || isFinalStop) {
      return ["Approved", ...baseStatuses];
    }
    return baseStatuses;
  }, [isTransit, isFinalStop]);

  useEffect(() => {
    if (show) {
      if (!status || !allowedStatuses.includes(status)) {
        setStatus(allowedStatuses[0] as ReviewStatus);
      }
      modalInstanceRef.current?.show();
    } else {
      modalInstanceRef.current?.hide();
    }
  }, [show, allowedStatuses, status]);

  const handleSubmit = async () => {
    if (!documentId) return;

    await reviewDocumentMutation.mutateAsync({
      documentId,
      status: status as ReviewStatus,
      remarks,
    });

    if (status === "Returned for Corrections/Revision/Clarification") {
      // Find the appropriate fallback recipient:
      // reviewRequesterId -> originalSenderId -> uploadedById
      const targetRecipientId =
        document?.reviewRequesterId ||
        document?.originalSenderId ||
        document?.uploadedById;

      if (targetRecipientId) {
        const statusTag = globalTags?.find(
          (tag: { name: string }) => tag.name === status,
        );

        await sendDocumentMutation.mutateAsync({
          documentId,
          recipientId: targetRecipientId,
          tagIds: [],
          tagsToKeep: statusTag ? [statusTag.id] : [],
        });
      }
      onClose();
    } else {
      onClose();
    }
  };

  // Determine dynamic button text and icon
  const getButtonText = () => {
    switch (status) {
      case "Approved":
        return "Approve Document";
      case "Noted":
        return "Note Document";
      case "For Endorsement":
        return "Endorse Document";
      case "Returned for Corrections/Revision/Clarification":
        return "Return Document";
      case "For the review of the Executive Committee":
        return "Send to Executive Committee";
      case "Disapproved":
        return "Disapprove Document";
      default:
        return "Submit Review";
    }
  };

  const getButtonIcon = () => {
    switch (status) {
      case "Approved":
        return "bi-check-circle-fill";
      case "Returned for Corrections/Revision/Clarification":
        return "bi-arrow-return-left";
      case "Disapproved":
        return "bi-x-circle-fill";
      default:
        return "bi-send-fill";
    }
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
      case "Approved":
        return <i className="bi bi-check-circle-fill text-success"></i>;
      case "Noted":
        return <i className="bi bi-journal-check text-info"></i>;
      case "For Endorsement":
        return <i className="bi bi-forward-fill text-primary"></i>;
      case "Returned for Corrections/Revision/Clarification":
        return <i className="bi bi-arrow-return-left text-warning"></i>;
      case "For the review of the Executive Committee":
        return <i className="bi bi-people-fill text-secondary"></i>;
      case "Disapproved":
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
                        setStatus(e.target.value as ReviewStatus)
                      }
                    >
                      {allowedStatuses.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
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
              <button
                type="button"
                className="btn btn-primary px-4"
                onClick={handleSubmit}
                disabled={
                  reviewDocumentMutation.isPending ||
                  sendDocumentMutation.isPending ||
                  !status
                }
              >
                <i className={`bi ${getButtonIcon()} me-2`}></i>
                {getButtonText()}
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
