import React from "react";
import "./ConfirmModal.css"; // Make sure this import line exists

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
    <div className="custom-modal-backdrop">
      <div className="custom-modal-content">
        <h4 className="custom-modal-title">{title}</h4>
        {/* Use children here */}
        <p className="custom-modal-message">{children}</p>
        <div className="custom-modal-actions">
          <button
            className="btn btn-secondary"
            onClick={onClose} // Use onClose
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
              "Confirm" // Changed from "Confirm Delete" to be more generic
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
