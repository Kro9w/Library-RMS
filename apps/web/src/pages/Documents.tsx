// apps/web/src/pages/Documents.tsx

import React, { useState } from "react";
import { trpc } from "../trpc";
import { Link } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal";
import { UploadModal } from "../components/UploadModal";
import { SendDocumentModal } from "../components/SendDocumentModal";
import { ReviewDocumentModal } from "../components/ReviewDocumentModal";
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
  const [filter, setFilter] = useState("all");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const utils = trpc.useUtils();

  const { data: documents, isLoading } = trpc.documents.getAll.useQuery({
    filter,
  });
  const { data: currentUser } = trpc.user.getMe.useQuery();

  const deleteMutation = trpc.documents.deleteDocument.useMutation({
    onSuccess: () => {
      utils.documents.getAll.invalidate();
    },
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

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

  const handleSendClick = (doc: Document) => {
    setSelectedDoc(doc);
    setShowSendModal(true);
  };

  const handleReviewClick = (doc: Document) => {
    setSelectedDoc(doc);
    setShowReviewModal(true);
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
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-dropdown"
          >
            <option value="all">All Organization Documents</option>
            <option value="mine">My Documents</option>
          </select>
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
                {currentUser && currentUser.id === doc.uploadedById ? (
                  <>
                    <button
                      onClick={() => handleSendClick(doc)}
                      className="btn-icon btn-send"
                      title="Send Document"
                    >
                      <i className="bi bi-send"></i>
                    </button>
                    {/* REFACTOR: implicit relation */}
                    {currentUser?.roles.some(
                      (role: { canManageDocuments: boolean }) =>
                        role.canManageDocuments
                    ) &&
                      doc.tags.some(
                        // The backend still returns mapped tags: doc.tags.map(t => ({ tag: t }))
                        // as per my DocumentsRouter getAll implementation.
                        // So `tag.tag.name` IS STILL CORRECT for `doc.tags` if I didn't change the router mapping.
                        // I mapped it: return docs.map(doc => ({ ...doc, tags: doc.tags.map(t => ({ tag: t })), }));
                        // So `tag.tag` IS correct for `doc.tags`.
                        (tag: { tag: { name: string } }) =>
                          tag.tag.name === "for review"
                      ) && (
                        <button
                          onClick={() => handleReviewClick(doc)}
                          className="btn-icon btn-review"
                          title="Review Document"
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                      )}
                    <button
                      onClick={() => handleDeleteClick(doc)}
                      className="btn-icon btn-delete"
                      title="Delete Document"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </>
                ) : (
                  <span title="No access" className="no-access-icon">
                    <i
                      className="bi bi-lock-fill"
                      style={{
                        fontSize: "1.1rem",
                        color: "var(--text-muted)",
                      }}
                    ></i>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

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

      {selectedDoc && (
        <SendDocumentModal
          show={showSendModal}
          onClose={() => setShowSendModal(false)}
          documentId={selectedDoc.id}
        />
      )}

      {selectedDoc && (
        <ReviewDocumentModal
          show={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          documentId={selectedDoc.id}
        />
      )}

      <UploadModal
        show={showUploadModal}
        onClose={() => setShowUploadModal(false)}
      />
    </div>
  );
};

export default Documents;
