import React, { useEffect, useRef, useState } from "react";
import { trpc } from "../trpc";
import { Modal } from "bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import "./StandardModal.css";

interface ReceiveDocumentModalProps {
  show: boolean;
  onClose: () => void;
}

export const ReceiveDocumentModal: React.FC<ReceiveDocumentModalProps> = ({
  show,
  onClose,
}) => {
  const [controlNumber, setControlNumber] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const navigate = useNavigate();

  // Fetch pending distributions for this user
  const { data: pendingDistributions, isLoading } =
    trpc.documents.getMyPendingDistributions.useQuery(undefined, {
      enabled: show,
    });

  const receiveDocumentMutation = trpc.documents.receiveDocument.useMutation({
    onSuccess: (data) => {
      utils.documents.getMyPendingDistributions.invalidate();
      utils.documents.getAll.invalidate();
      utils.getDashboardStats.invalidate(); // Assuming getDashboardStats is at the root of the router.
      onClose();
      navigate(`/documents/${data.id}`);
    },
    onError: (error) => {
      setErrorMsg(error.message);
    },
  });

  const modalRef = useRef<HTMLDivElement>(null);
  const modalInstanceRef = useRef<Modal | null>(null);

  useEffect(() => {
    if (modalRef.current) {
      modalInstanceRef.current = new Modal(modalRef.current);
      modalRef.current.addEventListener("hidden.bs.modal", () => {
        onClose();
        setControlNumber("");
        setErrorMsg(null);
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

  const handleReceiveViaControlNumber = async () => {
    if (!controlNumber.trim()) return;
    setErrorMsg(null);
    await receiveDocumentMutation.mutateAsync({
      controlNumber: controlNumber.trim(),
    });
  };

  const handleReceiveFromPending = async (distributionId: string) => {
    setErrorMsg(null);
    await receiveDocumentMutation.mutateAsync({ distributionId });
  };

  if (!show) return null;

  return (
    <div
      className="standard-modal-backdrop"
      onClick={!receiveDocumentMutation.isPending ? onClose : undefined}
    >
      <div
        className="standard-modal-dialog modal-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "800px" }}
      >
        <div className="standard-modal-header">
          <div className="standard-modal-icon">
            <i className="bi bi-box-arrow-in-down"></i>
          </div>
          <div className="standard-modal-header-text">
            <h5 className="standard-modal-title">Receive Document</h5>
          </div>
          {!receiveDocumentMutation.isPending && (
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

        <div className="standard-modal-body">
          {errorMsg && (
            <div className="standard-modal-notice standard-modal-notice-error">
              <i className="bi bi-exclamation-triangle-fill"></i>
              <p style={{ whiteSpace: "pre-line" }}>{errorMsg}</p>
            </div>
          )}

          <div className="mb-4">
            <h6
              className="mb-2 fw-bold text-muted text-uppercase"
              style={{ fontSize: "0.75rem", letterSpacing: "0.05em" }}
            >
              Receive via Control Number
            </h6>
            <div className="d-flex gap-2">
              <input
                type="text"
                className="form-control"
                placeholder="Enter Document Control Number..."
                value={controlNumber}
                onChange={(e) => setControlNumber(e.target.value)}
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleReceiveViaControlNumber();
                }}
              />
              <button
                className="standard-modal-btn standard-modal-btn-confirm"
                onClick={handleReceiveViaControlNumber}
                disabled={
                  !controlNumber.trim() || receiveDocumentMutation.isPending
                }
              >
                {receiveDocumentMutation.isPending && !errorMsg ? (
                  <>
                    <span className="standard-modal-spinner" />
                    Receiving...
                  </>
                ) : (
                  "Receive"
                )}
              </button>
            </div>
            <small
              className="text-muted mt-2 d-block"
              style={{ fontSize: "11px" }}
            >
              Use this if someone handed you a physical document with a control
              number but it hasn't been routed to you in the system yet.
            </small>
          </div>

          <div>
            <h6
              className="mb-2 fw-bold text-muted text-uppercase"
              style={{ fontSize: "0.75rem", letterSpacing: "0.05em" }}
            >
              Pending Receipts
            </h6>

            {isLoading ? (
              <div className="text-center py-4">
                <span className="spinner-border spinner-border-sm text-primary"></span>
                <span className="ms-2 text-muted" style={{ fontSize: "13px" }}>
                  Loading pending documents...
                </span>
              </div>
            ) : pendingDistributions && pendingDistributions.length > 0 ? (
              <div
                className="list-group"
                style={{ borderRadius: "var(--radius-md)" }}
              >
                {pendingDistributions.map((dist) => (
                  <div
                    key={dist.id}
                    className="list-group-item d-flex justify-content-between align-items-center p-3"
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <div>
                      <h6 className="mb-1" style={{ fontSize: "14px" }}>
                        <Link
                          to={`/documents/${dist.document.id}`}
                          className="text-decoration-none"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {dist.document.title}
                        </Link>
                        {dist.document.classification && (
                          <span
                            className="badge bg-secondary ms-2"
                            style={{ fontSize: "0.65rem" }}
                          >
                            {dist.document.classification}
                          </span>
                        )}
                      </h6>
                      <small
                        className="text-muted d-block"
                        style={{ fontSize: "12px" }}
                      >
                        Sent by{" "}
                        <strong>
                          {dist.sender.firstName} {dist.sender.lastName}
                        </strong>{" "}
                        {dist.sender.department?.name
                          ? `(${dist.sender.department.name})`
                          : ""}
                      </small>
                      <small
                        className="text-muted d-block mt-1"
                        style={{ fontSize: "11px" }}
                      >
                        <i className="bi bi-clock me-1"></i>
                        Sent on{" "}
                        {format(new Date(dist.createdAt), "MMM d, yyyy h:mm a")}
                      </small>
                    </div>
                    <button
                      className="standard-modal-btn standard-modal-btn-ghost"
                      style={{ height: "auto", padding: "6px 12px" }}
                      onClick={() => handleReceiveFromPending(dist.id)}
                      disabled={receiveDocumentMutation.isPending}
                    >
                      Receive
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="text-center p-4 rounded"
                style={{
                  backgroundColor: "var(--bg-subtle)",
                  border: "1px dashed var(--border-strong)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <i className="bi bi-inbox fs-3 text-muted mb-2 d-block"></i>
                <span className="text-muted" style={{ fontSize: "13px" }}>
                  No pending documents to receive.
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="standard-modal-footer">
          <button
            className="standard-modal-btn standard-modal-btn-ghost"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
