// apps/web/src/pages/Documents.tsx

import React, { useState } from "react";
import { trpc } from "../trpc";
import { Link } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal";
import { UploadModal } from "../components/UploadModal";
import { LoadingAnimation } from "../components/ui/LoadingAnimation";
import "./Documents.css";

import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";

// This type now correctly includes fileType and fileSize
type Document = AppRouterOutputs["documents"]["getAll"][0];

const formatFileType = (fileType: string | null | undefined): string => {
  if (!fileType) return "FILE";
  if (fileType.includes("pdf")) return "PDF";
  if (fileType.includes("word")) return "DOCX";
  if (fileType.includes("excel") || fileType.includes("spreadsheet"))
    return "XLSX";
  if (fileType.includes("image")) return "IMG";
  if (fileType.includes("text")) return "TXT";
  return "FILE";
};

// ------------------------------

const Documents: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  // --- 2. MODIFICATION: Split state for two modals ---
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [transferEmail, setTransferEmail] = useState("");
  // --------------------------------------------------

  const utils = trpc.useUtils();

  const { data: documents, isLoading } = trpc.documents.getAll.useQuery();

  const deleteMutation = trpc.documents.deleteDocument.useMutation({
    onSuccess: () => {
      utils.documents.getAll.invalidate();
    },
  });

  // --- 3. MODIFICATION: Add isLoading and update onSuccess ---
  const { mutate: transferMutation, isPending: isTransferring } =
    trpc.documents.transferDocument.useMutation({
      onSuccess: () => {
        utils.documents.getAll.invalidate();
        alert("Document transferred!");
        // Close modal and clear state on success
        setShowTransferModal(false);
        setTransferEmail("");
        setSelectedDoc(null);
      },
      onError: (error: any) => {
        alert(`Error: ${error.message}`);
      },
    });
  // ---------------------------------------------------------

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // --- 4. MODIFICATION: Rename and update functions ---
  const handleDeleteClick = (doc: Document) => {
    setSelectedDoc(doc);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (selectedDoc) {
      deleteMutation.mutate({ id: selectedDoc.id });
    }
    setShowDeleteModal(false);
    setSelectedDoc(null);
  };

  // This new function opens the transfer modal
  const handleTransferClick = (doc: Document) => {
    setSelectedDoc(doc);
    setShowTransferModal(true);
  };

  // This new function runs when the transfer is confirmed
  const confirmTransfer = () => {
    if (selectedDoc && transferEmail) {
      transferMutation({ docId: selectedDoc.id, newOwnerEmail: transferEmail });
    }
  };
  // ----------------------------------------------------

  const filteredDocuments = documents?.filter((doc: Document) =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="documents-container">
      {/* --- 1. ADD THIS WRAPPER --- */}
      <div className="page-header">
        <h2>Documents</h2>
        <div className="header-actions">
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-bar"
          />
          <button
            className="btn btn-primary"
            onClick={() => setShowUploadModal(true)}
          >
            New
          </button>
        </div>
      </div>
      {/* --------------------------- */}

      {isLoading && <LoadingAnimation />}

      <div className="document-table-card">
        <div className="document-list-header">
          {/* ...header spans... */}
          <span>Type</span>
          <span>Title</span>
          <span>Owner</span>
          <span>Control Number</span>
          <span>Date</span>
          <span>Actions</span>
        </div>

        <ul className="document-list">
          {filteredDocuments?.map((doc: Document) => (
            <li key={doc.id} className="document-item">
              {doc.documentType ? (
                <span
                  className="doc-type-pill"
                  style={
                    {
                      "--type-color": `#${doc.documentType.color}`,
                      backgroundColor: `#${doc.documentType.color}33`,
                      color: `#${doc.documentType.color}`,
                    } as React.CSSProperties
                  }
                >
                  <span
                    className="doc-type-pill-dot"
                    style={{ backgroundColor: `var(--type-color)` }}
                  />
                  {doc.documentType.name}
                </span>
              ) : (
                <span className="doc-type-badge">
                  {formatFileType(doc.fileType)}
                </span>
              )}

              <Link to={`/documents/${doc.id}`}>{doc.title}</Link>

              <span className="document-owner">
                {doc.uploadedBy?.name || "Unknown"}
              </span>

              <span className="document-control-number">
                {doc.controlNumber || "—"}
              </span>

              <span className="document-date">
                {new Date(doc.createdAt).toLocaleDateString()}
              </span>

              <div className="document-actions">
                {/* --- 5. MODIFICATION: Update onClick --- */}
                <button
                  onClick={() => handleTransferClick(doc)} // Changed from handleSend
                  className="btn-icon btn-send"
                  title="Transfer Document"
                >
                  <i className="bi bi-send"></i>
                </button>
                {/* -------------------------------------- */}
                <button
                  onClick={() => handleDeleteClick(doc)}
                  className="btn-icon btn-delete"
                  title="Delete Document"
                >
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* This is your existing Delete Modal */}
      <ConfirmModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Confirm Delete"
        isConfirming={deleteMutation.isPending}
      >
        Are you sure you want to delete the document "{selectedDoc?.title || ""}
        "?
      </ConfirmModal>

      {/* --- 6. NEW: Add the Transfer Modal --- */}
      <ConfirmModal
        show={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setTransferEmail(""); // Clear email on close
        }}
        onConfirm={confirmTransfer}
        title="Transfer Document"
        isConfirming={isTransferring}
      >
        {/* Here we pass our input as the 'children' */}
        <p>
          Transfer "<strong>{selectedDoc?.title || ""}</strong>" to a new owner.
        </p>
        <label
          htmlFor="transfer-email"
          style={{ display: "block", marginBottom: "0.5rem" }}
        >
          New Owner's Email:
        </label>
        <input
          type="email"
          id="transfer-email"
          className="form-control" // Assuming you have a standard form control style
          value={transferEmail}
          onChange={(e) => setTransferEmail(e.target.value)}
          placeholder="user@example.com"
          style={{ width: "100%" }}
        />
      </ConfirmModal>
      {/* ------------------------------------ */}
      <UploadModal
        show={showUploadModal}
        onClose={() => setShowUploadModal(false)}
      />
    </div>
  );
};

export default Documents;
