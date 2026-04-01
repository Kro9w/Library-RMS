import React, { useState, useRef, useEffect } from "react";
import { trpc } from "../trpc";
import { SendDocumentModal } from "./SendDocumentModal";
import { Modal } from "bootstrap";
import "./ReviewDocumentModal.css";

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
    const maxSequence = Math.max(
      ...document.transitRoutes.map((r: any) => r.sequenceOrder),
    );
    return currentRoute.sequenceOrder === maxSequence;
  }, [isTransit, document?.transitRoutes, user]);

  const allowedStatuses = React.useMemo(() => {
    let baseStatuses = [
      "Noted",
      "For Endorsement",
      "Returned for Corrections/Revision/Clarification",
      "For the review of the Executive Committee",
      "Disapproved",
    ];

    if (isFinalStop) {
      // If it's the final stop, they cannot Endorse it further
      baseStatuses = baseStatuses.filter((s) => s !== "For Endorsement");
      return ["Approved", ...baseStatuses];
    }

    if (!isTransit) {
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
    }
    onClose();
  };

  // Status metadata
  const STATUS_META: Record<
    string,
    { icon: string; colorClass: string; btnLabel: string }
  > = {
    Approved: {
      icon: "bi-check-circle-fill",
      colorClass: "text-success",
      btnLabel: "Approve Document",
    },
    Noted: {
      icon: "bi-journal-check",
      colorClass: "text-info",
      btnLabel: "Note Document",
    },
    "For Endorsement": {
      icon: "bi-forward-fill",
      colorClass: "text-primary",
      btnLabel: "Endorse Document",
    },
    "Returned for Corrections/Revision/Clarification": {
      icon: "bi-arrow-return-left",
      colorClass: "text-warning",
      btnLabel: "Return Document",
    },
    "For the review of the Executive Committee": {
      icon: "bi-people-fill",
      colorClass: "text-secondary",
      btnLabel: "Send to Executive Committee",
    },
    Disapproved: {
      icon: "bi-x-circle-fill",
      colorClass: "text-danger",
      btnLabel: "Disapprove Document",
    },
  };

  const meta = status ? STATUS_META[status] : null;

  // Routing progress for transit docs
  const renderRoutingProgress = () => {
    if (
      !isTransit ||
      !document?.transitRoutes ||
      document.transitRoutes.length === 0
    ) {
      return null;
    }

    const sortedRoutes = [...document.transitRoutes].sort(
      (a: any, b: any) => a.sequenceOrder - b.sequenceOrder,
    );

    const timelineNodes = [
      ...sortedRoutes,
      {
        id: "virtual-end",
        isVirtual: true,
        department: { name: "Original Sender" },
      },
    ];

    const currentIndex = sortedRoutes.findIndex(
      (r: any) => r.status === "CURRENT",
    );
    const activeIdx = currentIndex === -1 ? sortedRoutes.length : currentIndex;

    const getStepStyle = (route: any, _index: number) => {
      if (route.isVirtual)
        return {
          iconClass: "bi-person-fill",
          stepClass: "routing-step-pending",
        };
      if (route.status === "APPROVED")
        return {
          iconClass: "bi-check-circle-fill",
          stepClass: "routing-step-approved",
        };
      if (route.status === "CURRENT")
        return {
          iconClass: "bi-record-circle-fill",
          stepClass: "routing-step-current",
        };
      if (route.status === "REJECTED")
        return {
          iconClass: "bi-x-circle-fill",
          stepClass: "routing-step-rejected",
        };
      return { iconClass: "bi-circle", stepClass: "routing-step-pending" };
    };

    return (
      <div className="review-modal-route-wrap">
        <p className="review-modal-route-label">
          <i className="bi bi-signpost-split"></i>
          Routing Progress
        </p>
        <div className="review-modal-route-steps">
          {timelineNodes.map((route: any, index: number) => {
            const { iconClass, stepClass } = getStepStyle(route, index);
            const isNext = index === activeIdx + 1;

            return (
              <React.Fragment key={route.id}>
                <div
                  className={`review-route-step ${stepClass} ${isNext ? "review-route-step-next" : ""}`}
                >
                  {isNext && (
                    <span className="review-route-next-badge">NEXT</span>
                  )}
                  <div className="review-route-icon">
                    <i className={`bi ${iconClass}`}></i>
                  </div>
                  <span className="review-route-name">
                    {route.department?.name || "Unknown"}
                  </span>
                </div>
                {index < timelineNodes.length - 1 && (
                  <div
                    className={`review-route-connector ${
                      index < activeIdx ? "review-route-connector-done" : ""
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        className="modal fade"
        ref={modalRef}
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content review-modal-content">
            {/* Header */}
            <div className="review-modal-header">
              <div className="review-modal-header-left">
                <div className="review-modal-icon-wrap">
                  <i className="bi bi-clipboard-check"></i>
                </div>
                <div>
                  <h5 className="review-modal-title">Review Document</h5>
                  {document?.title && (
                    <p className="review-modal-subtitle">{document.title}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
              />
            </div>

            {/* Body */}
            <div className="review-modal-body">
              {/* Routing progress */}
              {renderRoutingProgress()}

              {/* Status selector */}
              <div className="review-modal-field">
                <label className="review-modal-label">Decision</label>
                <div className="review-status-selector">
                  {allowedStatuses.map((s) => {
                    const m = STATUS_META[s];
                    const isSelected = status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        className={`review-status-option ${isSelected ? "review-status-option-active" : ""}`}
                        onClick={() => setStatus(s as ReviewStatus)}
                      >
                        <i
                          className={`bi ${m.icon} ${isSelected ? m.colorClass : "text-muted"}`}
                        ></i>
                        <span>{s}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Remarks */}
              <div className="review-modal-field">
                <label className="review-modal-label">
                  Remarks
                  <span className="review-modal-label-optional">optional</span>
                </label>
                <textarea
                  className="review-modal-textarea"
                  rows={4}
                  placeholder="Enter any feedback, notes, or instructions for the sender…"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="review-modal-footer">
              <button
                type="button"
                className="btn btn-secondary px-4"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn btn-primary px-4 ${
                  status === "Disapproved" ||
                  status === "Returned for Corrections/Revision/Clarification"
                    ? "btn-danger"
                    : "btn-primary"
                }`}
                onClick={handleSubmit}
                disabled={
                  reviewDocumentMutation.isPending ||
                  sendDocumentMutation.isPending ||
                  !status
                }
              >
                {reviewDocumentMutation.isPending ||
                sendDocumentMutation.isPending ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Submitting…
                  </>
                ) : (
                  <>
                    {meta && <i className={`bi ${meta.icon} me-2`}></i>}
                    {meta?.btnLabel || "Submit Review"}
                  </>
                )}
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
