import React from "react";
import "./ConfirmModal.css"; // Make sure this import line exists

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  // This prop has been renamed to match what DocumentDetails.tsx is sending
  isConfirming: boolean;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isConfirming,
}: ConfirmModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="custom-modal-backdrop">
      <div className="custom-modal-content">
        <h4 className="custom-modal-title">{title}</h4>
        <p className="custom-modal-message">{message}</p>
        <div className="custom-modal-actions">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isConfirming}
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Confirming...
              </>
            ) : (
              "Confirm Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
