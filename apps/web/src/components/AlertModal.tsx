import React from "react";
import "./ConfirmModal.css";

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
    <div className="custom-modal-backdrop">
      <div className="custom-modal-content">
        <h4 className="custom-modal-title">{title}</h4>
        <div className="custom-modal-message">{children}</div>
        <div className="custom-modal-actions">
          <button className="btn btn-primary" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
