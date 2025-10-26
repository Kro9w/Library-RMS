import React, { useState } from "react";
import { trpc } from "../trpc";
import { Link } from "react-router-dom";
// 1. FIX: Use a named import for ConfirmModal
import { ConfirmModal } from "../components/ConfirmModal";
import "./Documents.css";

// 2. FIX: Import the correct tRPC output type
import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";

// 3. FIX: Use the correct type from the 'getAll' procedure
type Document = AppRouterOutputs["documents"]["getAll"][0];

const Documents: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const utils = trpc.useUtils();

  // 4. FIX: Call 'getAll' instead of 'getDocuments'
  const { data: documents, isLoading } = trpc.documents.getAll.useQuery();

  // 5. FIX: Call 'deleteDocument'
  const deleteMutation = trpc.documents.deleteDocument.useMutation({
    onSuccess: () => {
      utils.documents.getAll.invalidate(); // Invalidate the 'getAll' query
    },
  });

  // 6. FIX: Call 'transferDocument'
  const sendMutation = trpc.documents.transferDocument.useMutation({
    onSuccess: () => {
      utils.documents.getAll.invalidate();
      alert("Document transferred!");
    },
    // 7. FIX: Added proper typing to 'error'
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

  // 8. FIX: Add explicit type 'doc: Document' to fix 'any' error
  const filteredDocuments = documents?.filter((doc: Document) =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <ul className="document-list">
        {/* 9. FIX: Add explicit type 'doc: Document' to fix 'any' error */}
        {filteredDocuments?.map((doc: Document) => (
          <li key={doc.id} className="document-item">
            <Link to={`/documents/${doc.id}`}>{doc.title}</Link>
            <span className="document-owner">
              Uploaded by: {doc.uploadedBy?.name || "Unknown"}
            </span>
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
      <ConfirmModal
        show={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmDelete}
        title="Confirm Delete"
      >
        Are you sure you want to delete the document "{selectedDoc?.title || ""}
        "?
      </ConfirmModal>
    </div>
  );
};

export default Documents;
