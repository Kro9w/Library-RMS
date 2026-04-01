import React from "react";
import "./StandardModal.css";

interface AlertModalProps {
  show: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export function AlertModal({
  show,
  title,
  children,
  onClose,
}: AlertModalProps) {
  if (!show) {
    return null;
  }

  return (
    <div className="standard-modal-backdrop" onClick={onClose}>
      <div
        className="standard-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="standard-modal-header">
          <div className="standard-modal-icon">
            <i className="bi bi-info-circle"></i>
          </div>
          <div className="standard-modal-header-text">
            <h5 className="standard-modal-title">{title}</h5>
          </div>
          <button
            type="button"
            className="standard-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="bi bi-x"></i>
          </button>
        </div>

        <div className="standard-modal-body">
          <div
            className="standard-modal-notice standard-modal-notice-warning"
            style={{
              backgroundColor: "transparent",
              borderColor: "transparent",
              padding: 0,
              gap: 0,
              color: "var(--text-primary)",
            }}
          >
            <div className="custom-modal-message">{children}</div>
          </div>
        </div>

        <div className="standard-modal-footer">
          <button
            className="standard-modal-btn standard-modal-btn-confirm"
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
