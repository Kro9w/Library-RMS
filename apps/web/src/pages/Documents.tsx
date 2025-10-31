// apps/web/src/components/Documents.tsx

import React, { useState } from "react";
import { trpc } from "../trpc";
import { Link } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal";
import "./Documents.css";

import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";

// This 'Document' type will now AUTOMATICALLY include 'createdAt'
// because tRPC's inferRouterOutputs detected our router change.
type Document = AppRouterOutputs["documents"]["getAll"][0];

const Documents: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const utils = trpc.useUtils();

  const { data: documents, isLoading } = trpc.documents.getAll.useQuery();

  const deleteMutation = trpc.documents.deleteDocument.useMutation({
    onSuccess: () => {
      utils.documents.getAll.invalidate();
    },
  });

  const sendMutation = trpc.documents.transferDocument.useMutation({
    onSuccess: () => {
      utils.documents.getAll.invalidate();
      alert("Document transferred!");
    },
    onError: (error: any) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleDeleteClick = (doc: Document) => {
    setSelectedDoc(doc);
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    if (selectedDoc) {
      deleteMutation.mutate({ id: selectedDoc.id });
    }
    setShowConfirm(false);
    setSelectedDoc(null);
  };

  const handleSend = (doc: Document) => {
    const email = prompt(
      "Enter the email of the user to send this document to:"
    );
    if (email) {
      sendMutation.mutate({ docId: doc.id, newOwnerEmail: email });
    }
  };

  const filteredDocuments = documents?.filter((doc: Document) =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper function to format file size (you can use this later)
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="documents-container">
      <h2>Documents</h2>
      <input
        type="text"
        placeholder="Search documents..."
        value={searchTerm}
        onChange={handleSearch}
        className="search-bar"
      />
      {isLoading && <div>Loading documents...</div>}

      {/* --- MODIFICATION --- */}
      {/* Added a wrapper and the 6-column header from your CSS */}
      <div className="document-list-wrapper">
        <div className="document-list-header">
          <span>Type</span>
          <span>Title</span>
          <span>Owner</span>
          <span>Date</span>
          <span>File Size</span>
          <span>Actions</span>
        </div>

        <ul className="document-list">
          {filteredDocuments?.map((doc: Document) => (
            <li key={doc.id} className="document-item">
              {/* Col 1: Type (Placeholder) */}
              <span className="doc-type-badge">
                {/* @ts-ignore - 'fileType' is not in your schema yet */}
                {doc.fileType || "DOC"}
              </span>

              {/* Col 2: Title (Exists) */}
              <Link to={`/documents/${doc.id}`}>{doc.title}</Link>

              {/* Col 3: Owner (Exists) */}
              <span className="document-owner">
                {doc.uploadedBy?.name || "Unknown"}
              </span>

              {/* Col 4: Date (Newly Added) */}
              <span className="document-date">
                {new Date(doc.createdAt).toLocaleDateString()}
              </span>


              {/* Col 5: File Size (Placeholder) */}
              <span className="document-size">
                {/* @ts-ignore - 'fileSize' is not in your schema yet */}
                {/* Use the helper: formatFileSize(doc.fileSize) || "N/A" */}
                {/* @ts-ignore */}
                {doc.fileSize || "N/A"}
              </span>

              {/* Col 6: Actions (Exists) */}
              <div className="document-actions">
                <button onClick={() => handleSend(doc)} className="btn-send">
                  Transfer
                </button>
                <button
                  onClick={() => handleDeleteClick(doc)}
                  className="btn-delete"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {/* --- END MODIFICATION --- */}

      <ConfirmModal
        show={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmDelete}
        title="Confirm Delete"
      >
        Are you sure you want to delete the document "{selectedDoc?.title || ""}"?
      </ConfirmModal>
    </div>
  );
};

export default Documents;