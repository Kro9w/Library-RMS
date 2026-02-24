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

  return (
    <div
      className="modal fade"
      ref={modalRef}
      id="selectDocumentModal"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Select a Document</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <ul className="list-group">
              {documents?.map((doc: any) => (
                <li
                  key={doc.id}
                  className="list-group-item list-group-item-action"
                  onClick={() => onSelect(doc.id)}
                  style={{ cursor: "pointer" }}
                >
                  {doc.title}
                </li>
              ))}
              {!documents || documents.length === 0 ? (
                <li className="list-group-item text-muted">
                  No documents found.
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
