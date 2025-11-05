import React from "react";
import { trpc } from "../trpc";

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
  const { data: documents } = trpc.documents.getMyDocuments.useQuery();

  if (!show) return null;

  return (
    <div className="modal fade show" style={{ display: "block" }} tabIndex={-1}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Select a Document</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body">
            <ul className="list-group">
              {documents?.map((doc) => (
                <li
                  key={doc.id}
                  className="list-group-item list-group-item-action"
                  onClick={() => onSelect(doc.id)}
                >
                  {doc.title}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
