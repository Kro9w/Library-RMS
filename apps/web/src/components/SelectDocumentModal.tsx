import React, { useEffect, useRef } from "react";
import { trpc } from "../trpc";
import { Modal } from "bootstrap";

interface SelectDocumentModalProps {
  show: boolean;
  onClose: () => void;
  onSelect: (documentId: string) => void;
}

export const SelectDocumentModal: React.FC<SelectDocumentModalProps> = ({
  show,
  onClose,
  onSelect,
}) => {
  // Refactored to use the unified getAll procedure with pagination
  const { data } = trpc.documents.getAll.useQuery({
    filter: "mine",
    perPage: 50,
  });

  const documents = data?.documents;

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
    };
  }, []);

  useEffect(() => {
    if (show) {
      modalInstanceRef.current?.show();
    } else {
      modalInstanceRef.current?.hide();
    }
  }, [show]);

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

  const listGroupItemStyle = {
    backgroundColor: "var(--card-background)",
    borderColor: "var(--card-border)",
    color: "var(--text)",
    cursor: "pointer",
  };

  return (
    <div
      className="modal fade"
      ref={modalRef}
      id="selectDocumentModal"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
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
              <i className="bi bi-file-earmark-text me-2"></i>Select a Document
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body p-0" style={modalBodyStyle}>
            <div className="list-group list-group-flush">
              {documents?.map((doc: any) => (
                <button
                  key={doc.id}
                  className="list-group-item list-group-item-action p-3"
                  onClick={() => onSelect(doc.id)}
                  style={listGroupItemStyle}
                >
                  <div className="d-flex w-100 justify-content-between align-items-center">
                    <span
                      className="fw-bold text-truncate"
                      style={{ maxWidth: "80%" }}
                    >
                      {doc.title}
                    </span>
                    {doc.classification && (
                      <span
                        className="badge bg-secondary ms-2"
                        style={{ fontSize: "0.65rem" }}
                      >
                        {doc.classification}
                      </span>
                    )}
                  </div>
                </button>
              ))}
              {!documents || documents.length === 0 ? (
                <div className="p-4 text-center text-muted">
                  <i className="bi bi-folder-x fs-2 mb-2 d-block opacity-50"></i>
                  <p className="mb-0">No documents found.</p>
                </div>
              ) : null}
            </div>
          </div>
          <div
            className="modal-footer"
            style={{
              borderTop: "1px solid var(--card-border)",
              backgroundColor: "var(--background)",
            }}
          >
            <button
              type="button"
              className="btn btn-outline-secondary px-4"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
