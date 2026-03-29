import React, { useEffect, useRef, useState } from "react";
import { trpc } from "../trpc";
import { Modal } from "bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";

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

  return (
    <div
      className="modal fade"
      ref={modalRef}
      id="receiveDocumentModal"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
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
              <i className="bi bi-box-arrow-in-down me-2"></i>Receive Document
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body p-4" style={modalBodyStyle}>
            {errorMsg && (
              <div className="alert alert-danger mb-4" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {errorMsg}
              </div>
            )}

            <div className="mb-5">
              <h6
                className="mb-3 fw-bold text-muted text-uppercase"
                style={{ fontSize: "0.85rem" }}
              >
                Option 1: Receive via Control Number
              </h6>
              <div className="d-flex gap-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter Document Control Number..."
                  value={controlNumber}
                  onChange={(e) => setControlNumber(e.target.value)}
                  style={{
                    backgroundColor: "var(--input-bg)",
                    borderColor: "var(--card-border)",
                    color: "var(--text)",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleReceiveViaControlNumber();
                  }}
                />
                <button
                  className="btn btn-primary px-4"
                  onClick={handleReceiveViaControlNumber}
                  disabled={
                    !controlNumber.trim() || receiveDocumentMutation.isPending
                  }
                >
                  {receiveDocumentMutation.isPending && !errorMsg ? (
                    <span className="spinner-border spinner-border-sm me-2"></span>
                  ) : null}
                  Receive
                </button>
              </div>
              <small className="text-muted mt-2 d-block">
                Use this if someone handed you a physical document with a
                control number but it hasn't been routed to you in the system
                yet.
              </small>
            </div>

            <div>
              <h6
                className="mb-3 fw-bold text-muted text-uppercase"
                style={{ fontSize: "0.85rem" }}
              >
                Option 2: Pending Receipts
              </h6>

              {isLoading ? (
                <div className="text-center py-4">
                  <span className="spinner-border spinner-border-sm text-primary"></span>
                  <span className="ms-2 text-muted">
                    Loading pending documents...
                  </span>
                </div>
              ) : pendingDistributions && pendingDistributions.length > 0 ? (
                <div className="list-group">
                  {pendingDistributions.map((dist) => (
                    <div
                      key={dist.id}
                      className="list-group-item d-flex justify-content-between align-items-center p-3"
                      style={{
                        backgroundColor: "var(--card-background)",
                        borderColor: "var(--card-border)",
                      }}
                    >
                      <div>
                        <h6 className="mb-1">
                          <Link
                            to={`/documents/${dist.document.id}`}
                            className="text-decoration-none"
                            style={{ color: "var(--text)" }}
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
                        <small className="text-muted d-block">
                          Sent by{" "}
                          <strong>
                            {dist.sender.firstName} {dist.sender.lastName}
                          </strong>{" "}
                          {dist.sender.department?.name
                            ? `(${dist.sender.department.name})`
                            : ""}
                        </small>
                        <small className="text-muted d-block mt-1">
                          <i className="bi bi-clock me-1"></i>
                          Sent on{" "}
                          {format(
                            new Date(dist.createdAt),
                            "MMM d, yyyy h:mm a",
                          )}
                        </small>
                      </div>
                      <button
                        className="btn btn-sm btn-outline-primary"
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
                    backgroundColor: "var(--input-bg)",
                    border: "1px dashed var(--card-border)",
                  }}
                >
                  <i className="bi bi-inbox fs-3 text-muted mb-2 d-block"></i>
                  <span className="text-muted">
                    No pending documents to receive.
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer" style={modalFooterStyle}>
            <button
              type="button"
              className="btn btn-outline-secondary px-4"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
