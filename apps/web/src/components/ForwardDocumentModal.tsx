import React, { useEffect, useRef } from "react";
import { Modal } from "bootstrap";
import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";
import { formatUserName } from "../utils/user";
import { useForwardDocument } from "../hooks/useForwardDocument";
import "./StandardModal.css";

type User = AppRouterOutputs["documents"]["getAppUsers"][0];

// Define hierarchy types
interface Campus {
  id: string;
  name: string;
  departments: Department[];
}

interface Department {
  id: string;
  name: string;
  users: any[];
}

interface ForwardDocumentModalProps {
  show: boolean;
  onClose: () => void;
  documentId: string;
  initialRecipientId?: string | null;
  forceRecipientLock?: boolean; // If true, disable the dropdowns
  users?: User[]; // Optional: if provided, we skip fetch
  campuses?: Campus[]; // Replacing flat institutions with hierarchical campuses
  recipient?: User | null; // The full user object if known
}

export const ForwardDocumentModal: React.FC<ForwardDocumentModalProps> = ({
  show,
  onClose,
  documentId,
  initialRecipientId,
  forceRecipientLock = false,
  users: propUsers,
  campuses: propCampuses,
}) => {
  const {
    state,
    computed,
    mutations: { forwardDocumentMutation },
  } = useForwardDocument({
    show,
    documentId,
    initialRecipientId,
    users: propUsers,
    campuses: propCampuses,
  });

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
      modalInstanceRef.current = null;
    };
  }, [onClose]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (show && modalInstanceRef.current) {
      // Ensure React has painted the modal content before showing it
      timeoutId = setTimeout(() => {
        modalInstanceRef.current?.show();
      }, 50);
    } else if (!show && modalInstanceRef.current) {
      modalInstanceRef.current.hide();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [show]);

  const handleSend = async () => {
    if (!documentId || !state.recipientId) return;

    await forwardDocumentMutation.mutateAsync({
      documentId,
      recipientId: state.recipientId,
    });

    onClose();
  };

  const labelStyle = {
    color: "var(--text-muted)",
    fontSize: "0.8rem",
    textTransform: "uppercase" as const,
    fontWeight: "bold" as const,
    marginBottom: "0.5rem",
  };

  const inputGroupTextStyle = {
    backgroundColor: "var(--input-bg)",
    borderColor: "var(--border)",
    color: "var(--text-muted)",
  };

  if (!show) return null;

  return (
    <div
      className="standard-modal-backdrop"
      onClick={!forwardDocumentMutation.isPending ? onClose : undefined}
    >
      <div
        className="standard-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="standard-modal-header">
          <div className="standard-modal-icon">
            <i className="bi bi-forward-fill"></i>
          </div>
          <div className="standard-modal-header-text">
            <h5 className="standard-modal-title">Forward Document</h5>
          </div>
          {!forwardDocumentMutation.isPending && (
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
          <div className="row g-3">
            {/* Campus Selection */}
            <div className="col-12">
              <label htmlFor="campus" style={labelStyle}>
                Campus
              </label>
              <div className="input-group">
                <span
                  className="input-group-text border-end-0"
                  style={inputGroupTextStyle}
                >
                  <i className="bi bi-bank"></i>
                </span>
                <select
                  id="campus"
                  className="form-select border-start-0 ps-0"
                  value={state.selectedCampusId}
                  onChange={(e) => {
                    state.setSelectedCampusId(e.target.value);
                    state.setSelectedDeptId("");
                    state.setRecipientId("");
                  }}
                  disabled={
                    forceRecipientLock ||
                    computed.hasPrescribedRoute ||
                    forwardDocumentMutation.isPending
                  }
                  title={
                    computed.hasPrescribedRoute
                      ? "This route is prescribed for approval"
                      : undefined
                  }
                >
                  <option value="">Select Campus...</option>
                  {computed.campuses.map((campus: Campus) => (
                    <option key={campus.id} value={campus.id}>
                      {campus.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Department Selection */}
            <div className="col-12">
              <label htmlFor="department" style={labelStyle}>
                Department / Office
              </label>
              <div className="input-group">
                <span
                  className="input-group-text border-end-0"
                  style={inputGroupTextStyle}
                >
                  <i className="bi bi-building"></i>
                </span>
                <select
                  id="department"
                  className="form-select border-start-0 ps-0"
                  value={state.selectedDeptId}
                  onChange={(e) => {
                    state.setSelectedDeptId(e.target.value);
                    state.setRecipientId("");
                  }}
                  disabled={
                    !state.selectedCampusId ||
                    forceRecipientLock ||
                    computed.hasPrescribedRoute ||
                    forwardDocumentMutation.isPending
                  }
                  title={
                    computed.hasPrescribedRoute
                      ? "This route is prescribed for approval"
                      : undefined
                  }
                >
                  <option value="">Select Department...</option>
                  {computed.departments.map((dept: Department) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recipient Selection */}
            <div className="col-12">
              <label htmlFor="recipient" style={labelStyle}>
                Recipient
              </label>
              <div className="input-group">
                <span
                  className="input-group-text border-end-0"
                  style={inputGroupTextStyle}
                >
                  <i className="bi bi-person"></i>
                </span>
                <select
                  id="recipient"
                  className="form-select border-start-0 ps-0"
                  value={state.recipientId}
                  onChange={(e) => state.setRecipientId(e.target.value)}
                  disabled={
                    !state.selectedDeptId ||
                    forceRecipientLock ||
                    forwardDocumentMutation.isPending
                  }
                >
                  <option value="">Select Recipient...</option>
                  {computed.filteredUsers?.map((user: User) => (
                    <option key={user.id} value={user.id}>
                      {formatUserName(user)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="standard-modal-footer">
          <button
            className="standard-modal-btn standard-modal-btn-ghost"
            onClick={onClose}
            disabled={forwardDocumentMutation.isPending}
          >
            Cancel
          </button>
          <button
            className="standard-modal-btn standard-modal-btn-confirm"
            onClick={handleSend}
            disabled={!state.recipientId || forwardDocumentMutation.isPending}
          >
            {forwardDocumentMutation.isPending ? (
              <>
                <span className="standard-modal-spinner" />
                Forwarding...
              </>
            ) : (
              <>
                <i className="bi bi-forward-fill" /> Forward Document
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
