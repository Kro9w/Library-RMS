import React from "react";
import "./StandardModal.css";

interface ConfirmModalProps {
  show: boolean; // Renamed from isOpen
  title: string;
  children: React.ReactNode; // Renamed from message
  onConfirm: () => void;
  onClose: () => void; // Renamed from onCancel
  isConfirming?: boolean; // Made optional
}

export function ConfirmModal({
  show,
  title,
  children,
  onConfirm,
  onClose,
  isConfirming,
}: ConfirmModalProps) {
  if (!show) {
    return null;
  }

  return (
    <div
      className="standard-modal-backdrop"
      onClick={!isConfirming ? onClose : undefined}
    >
      <div
        className="standard-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="standard-modal-header">
          <div className="standard-modal-icon">
            <i className="bi bi-exclamation-triangle"></i>
          </div>
          <div className="standard-modal-header-text">
            <h5 className="standard-modal-title">{title}</h5>
          </div>
          {!isConfirming && (
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
            className="standard-modal-btn standard-modal-btn-ghost"
            onClick={onClose}
            disabled={isConfirming}
          >
            Cancel
          </button>
          <button
            className="standard-modal-btn standard-modal-btn-confirm"
            style={{
              backgroundColor: "var(--danger)",
              borderColor: "var(--danger)",
            }}
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? (
              <>
                <span className="standard-modal-spinner" />
                Confirming...
              </>
            ) : (
              <>Confirm</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
