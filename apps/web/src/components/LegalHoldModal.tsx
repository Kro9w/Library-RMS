import React, { useState, useEffect } from "react";
import "./StandardModal.css";

interface LegalHoldModalProps {
  show: boolean;
  documentTitle: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

export const LegalHoldModal: React.FC<LegalHoldModalProps> = ({
  show,
  documentTitle,
  onConfirm,
  onClose,
  isSubmitting = false,
}) => {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (show) setReason("");
  }, [show]);

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleConfirm();
    }
  };

  if (!show) return null;

  return (
    <div
      className="standard-modal-backdrop"
      onClick={!isSubmitting ? onClose : undefined}
    >
      <div
        className="standard-modal-dialog"
        style={{ maxWidth: "460px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="standard-modal-header">
          <div
            className="standard-modal-icon"
            style={{
              backgroundColor: "var(--danger-subtle)",
              color: "var(--danger)",
              borderColor: "#fca5a5",
            }}
          >
            <i className="bi bi-shield-lock-fill" />
          </div>
          <div className="standard-modal-header-text">
            <h5 className="standard-modal-title">Apply Legal Hold</h5>
            <p
              className="standard-modal-subtitle"
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "280px",
              }}
              title={documentTitle}
            >
              {documentTitle}
            </p>
          </div>
          {!isSubmitting && (
            <button
              type="button"
              className="standard-modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              <i className="bi bi-x" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="standard-modal-body">
          {/* Info notice */}
          <div className="standard-modal-notice standard-modal-notice-warning">
            <i className="bi bi-exclamation-triangle" />
            <p>
              A legal hold <strong>freezes the lifecycle</strong> of this
              document indefinitely. It cannot be disposed of until the hold is
              removed.
            </p>
          </div>

          {/* Reason field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              htmlFor="legal-hold-reason"
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--text-muted)",
              }}
            >
              Reason{" "}
              <span
                style={{
                  color: "var(--danger)",
                  fontWeight: 400,
                  textTransform: "none",
                  letterSpacing: 0,
                }}
              >
                *required
              </span>
            </label>
            <textarea
              id="legal-hold-reason"
              className="review-modal-textarea"
              rows={4}
              placeholder="Describe the legal, audit, or investigative reason for this hold…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              autoFocus
              style={{ resize: "vertical", minHeight: "96px" }}
            />
            <p
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              This reason will be recorded in the audit log and displayed on the
              document's detail page.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="standard-modal-footer">
          <button
            className="standard-modal-btn standard-modal-btn-ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            className="standard-modal-btn"
            style={{
              backgroundColor:
                !reason.trim() || isSubmitting ? undefined : "var(--danger)",
              borderColor:
                !reason.trim() || isSubmitting ? undefined : "var(--danger)",
              color: !reason.trim() || isSubmitting ? undefined : "#fff",
            }}
            onClick={handleConfirm}
            disabled={!reason.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="standard-modal-spinner" />
                Applying…
              </>
            ) : (
              <>
                <i className="bi bi-shield-lock-fill" />
                Apply Legal Hold
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
