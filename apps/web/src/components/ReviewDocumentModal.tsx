import React, { useState, useEffect } from "react";
import { trpc } from "../trpc";
import { ForwardDocumentModal } from "./ForwardDocumentModal";
import "./StandardModal.css";
import "./ReviewDocumentModal.css";

interface ReviewDocumentModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: (title: string, message: string) => void;
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
  onSuccess,
  documentId,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [status, setStatus] = useState<ReviewStatus | "">("");
  const [remarks, setRemarks] = useState("");
  const [showSendModal, setShowSendModal] = useState(false);
  const reviewDocumentMutation = trpc.documents.reviewDocument.useMutation();
  const { data: document } = trpc.documents.getById.useQuery({
    id: documentId,
  });
  const { data: user } = trpc.user.getMe.useQuery();

  const isTransit =
    document?.classification === "FOR_APPROVAL" &&
    document?.workflow?.recordStatus === "IN_TRANSIT";

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
      setStep(1);
      setRemarks("");
      if (!status || !allowedStatuses.includes(status)) {
        setStatus(allowedStatuses[0] as ReviewStatus);
      }
    }
  }, [show, allowedStatuses]);

  const handleStatusSelect = (s: ReviewStatus) => {
    setStatus(s);
    setStep(2);
  };

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
        setShowSendModal(true);
      }
    } else {
      if (onSuccess) {
        const docName = document?.title
          ? `"${document.title}"`
          : "The document";

        let title = "Review Submitted";
        let msg = `${docName} has been successfully reviewed.`;

        if (status === "Approved") {
          title = "Document Approved";
          msg = `${docName} has been approved and sent back to the originator.`;
        } else if (status === "Noted") {
          title = "Document Noted";
          msg = `${docName} has been marked as noted.`;
        } else if (status === "For Endorsement") {
          title = "Document Endorsed";
          msg = `${docName} has been successfully endorsed to the next office.`;
        } else if (status === "Disapproved") {
          title = "Document Disapproved";
          msg = `${docName} has been disapproved and sent back to the originator.`;
        }

        onSuccess(title, msg);
      }
    }

    onClose();
  };

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

    let activeIdx = currentIndex;

    if (currentIndex === -1) {
      const hasStarted = sortedRoutes.some(
        (r: any) => r.status === "APPROVED" || r.status === "REJECTED",
      );

      if (!hasStarted) {
        activeIdx = -1;
      } else {
        activeIdx = sortedRoutes.length;
      }
    }

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

  if (!show) return null;
  const isPending = reviewDocumentMutation.isPending;

  return (
    <>
      <div
        className="standard-modal-backdrop"
        onClick={!isPending ? onClose : undefined}
      >
        <div
          className="standard-modal-dialog"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: "800px" }}
        >
          {/* Header */}
          <div
            className="standard-modal-header"
            style={{
              background:
                "linear-gradient(135deg, rgba(155, 35, 53, 0.03) 0%, transparent 60%)",
            }}
          >
            <div className="standard-modal-icon">
              <i className="bi bi-clipboard-check"></i>
            </div>
            <div className="standard-modal-header-text">
              <h5 className="standard-modal-title">Review Document</h5>
              {document?.title && (
                <p className="standard-modal-subtitle">{document.title}</p>
              )}
            </div>
            {!isPending && (
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
          <div className="standard-modal-body" style={{ gap: "24px" }}>
            {/* Routing progress */}
            {renderRoutingProgress()}

            {step === 1 ? (
              /* Step 1: Status selector */
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
                        onClick={() => handleStatusSelect(s as ReviewStatus)}
                        disabled={isPending}
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
            ) : (
              /* Step 2: Remarks */
              <>
                <div className="review-modal-field">
                  <label className="review-modal-label">
                    Selected Decision
                  </label>
                  <div className="review-selected-decision">
                    <i className={`bi ${meta?.icon} ${meta?.colorClass}`}></i>
                    <span>{status}</span>
                  </div>
                </div>

                <div className="review-modal-field">
                  <label className="review-modal-label">
                    Remarks
                    <span className="review-modal-label-required">
                      *required
                    </span>
                  </label>
                  <textarea
                    className="review-modal-textarea"
                    rows={4}
                    placeholder="Enter mandatory feedback, notes, or instructions…"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    disabled={isPending}
                    autoFocus
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="standard-modal-footer">
            {step === 1 ? (
              <button
                className="standard-modal-btn standard-modal-btn-ghost"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </button>
            ) : (
              <>
                <button
                  className="standard-modal-btn standard-modal-btn-ghost"
                  onClick={() => setStep(1)}
                  disabled={isPending}
                >
                  <i className="bi bi-arrow-left"></i>
                  Back
                </button>
                <button
                  className="standard-modal-btn standard-modal-btn-confirm"
                  style={
                    status === "Disapproved" ||
                    status === "Returned for Corrections/Revision/Clarification"
                      ? {
                          backgroundColor: "var(--danger)",
                          borderColor: "var(--danger)",
                        }
                      : {}
                  }
                  onClick={handleSubmit}
                  disabled={isPending || !status || remarks.trim().length === 0}
                >
                  {isPending ? (
                    <>
                      <span className="standard-modal-spinner" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      {meta && (
                        <i
                          className={`bi ${meta.icon}`}
                          style={{ fontSize: "13px" }}
                        ></i>
                      )}
                      {meta?.btnLabel || "Submit Review"}
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showSendModal && (
        <ForwardDocumentModal
          show={showSendModal}
          onClose={() => setShowSendModal(false)}
          onSuccess={(_title, _msg) => {
            setShowSendModal(false);
            if (onSuccess) {
              onSuccess(
                "Document Returned",
                "The document has been successfully returned for corrections.",
              );
            }
          }}
          documentId={documentId}
        />
      )}
    </>
  );
};
