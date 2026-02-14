import React, { useState, Suspense, useEffect } from "react";
import { trpc } from "../trpc";
import { Link } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal";
// Lazy loaded modals
import { LoadingAnimation } from "../components/ui/LoadingAnimation";
import "./Documents.css";
import { formatUserName } from "../utils/user";
import { StatusBadge } from "../components/StatusBadge";
import { FileIcon } from "../components/FileIcon";
import { usePermissions } from "../hooks/usePermissions";

import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";

// Lazy imports for heavy modals
const UploadModal = React.lazy(() =>
  import("../components/UploadModal").then((m) => ({ default: m.UploadModal })),
);
const SendDocumentModal = React.lazy(() =>
  import("../components/SendDocumentModal").then((m) => ({
    default: m.SendDocumentModal,
  })),
);
const ReviewDocumentModal = React.lazy(() =>
  import("../components/ReviewDocumentModal").then((m) => ({
    default: m.ReviewDocumentModal,
  })),
);
const TagsManagementModal = React.lazy(() =>
  import("../components/TagsManagementModal").then((m) => ({
    default: m.TagsManagementModal,
  })),
);

// This type now correctly includes fileType and fileSize
type Document = AppRouterOutputs["documents"]["getAll"][0];

// ------------------------------

const Documents: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  // Type filter correctly for the TRPC input
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [lifecycleFilter, setLifecycleFilter] = useState<"all" | "ready">(
    "all",
  );
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const utils = trpc.useUtils();

  // Use the new custom hook
  const {
    user: _currentUser,
    canManageDocuments,
    isUploader,
  } = usePermissions();

  const { data: documents, isLoading } = trpc.documents.getAll.useQuery(
    {
      filter,
    },
    {
      staleTime: 30000, // Keep data fresh for 30 seconds to avoid rapid refetches
    },
  );

  const deleteMutation = trpc.documents.deleteDocument.useMutation({
    onMutate: async ({ id }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await utils.documents.getAll.cancel({ filter });

      // Snapshot the previous value
      const previousDocuments = utils.documents.getAll.getData({ filter });

      // Optimistically update to the new value
      if (previousDocuments) {
        utils.documents.getAll.setData({ filter }, (old: any[]) => {
          return old ? old.filter((doc) => doc.id !== id) : [];
        });
      }

      // Return a context object with the snapshotted value
      return { previousDocuments };
    },
    onError: (_err, _newTodo, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousDocuments) {
        utils.documents.getAll.setData({ filter }, context.previousDocuments);
      }
    },
    onSettled: () => {
      // Always refetch after error or success:
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

  const filteredDocuments = documents?.filter((doc: Document) => {
    const matchesSearch = doc.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesLifecycle =
      lifecycleFilter === "all" || doc.lifecycleStatus === "Ready";
    return matchesSearch && matchesLifecycle;
  });

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, lifecycleFilter, searchTerm]);

  // Pagination Logic
  const totalItems = filteredDocuments?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDocuments = filteredDocuments?.slice(startIndex, endIndex);

  if (isLoading) return <LoadingAnimation />;

  return (
    <div className="container mt-4">
      {/* --- 1. ADD THIS WRAPPER --- */}
      <div className="page-header">
        <h2>Documents</h2>
        <div className="header-actions">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as "all" | "mine")}
            className="filter-dropdown"
          >
            <option value="all">All Organization Documents</option>
            <option value="mine">My Documents</option>
          </select>
          <select
            value={lifecycleFilter}
            onChange={(e) =>
              setLifecycleFilter(e.target.value as "all" | "ready")
            }
            className="filter-dropdown ms-2"
          >
            <option value="all">All Statuses</option>
            <option value="ready">Ready for Disposition</option>
          </select>
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-bar"
          />
          <button
            className="btn btn-secondary me-2"
            onClick={() => setShowTagsModal(true)}
          >
            Tags
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowUploadModal(true)}
          >
            Upload
          </button>
        </div>
      </div>
      {/* --------------------------- */}

      <div className="card">
        <div className="card-body">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Title</th>
                <th>Owner</th>
                <th>Lifecycle</th>
                <th>Control Number</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentDocuments?.map((doc: Document) => (
                <tr key={doc.id}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <FileIcon fileType={doc.fileType} fileName={doc.title} />
                      {doc.documentType && (
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
                      )}
                    </div>
                  </td>
                  <td>
                    <Link
                      to={`/documents/${doc.id}`}
                      className="fw-bold text-decoration-none"
                    >
                      {doc.title}
                    </Link>
                  </td>
                  <td className="text-muted">
                    {formatUserName(doc.uploadedBy)}
                  </td>
                  <td>
                    <StatusBadge status={doc.lifecycleStatus} />
                  </td>
                  <td className="text-muted">{doc.controlNumber || "—"}</td>
                  <td className="text-muted">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      {isUploader(doc.uploadedById) ? (
                        <>
                          <button
                            onClick={() => handleSendClick(doc)}
                            className="btn btn-icon btn-send"
                            title="Send Document"
                          >
                            <i className="bi bi-send"></i>
                          </button>

                          {canManageDocuments &&
                            doc.tags.some(
                              (tag: { tag: { name: string } }) =>
                                tag.tag.name === "for review",
                            ) && (
                              <button
                                onClick={() => handleReviewClick(doc)}
                                className="btn btn-icon btn-review"
                                title="Review Document"
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                            )}
                          <button
                            onClick={() => handleDeleteClick(doc)}
                            className="btn btn-icon btn-delete"
                            title="Delete Document"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </>
                      ) : (
                        <span
                          title="No access"
                          className="no-access-icon text-muted"
                        >
                          <i
                            className="bi bi-lock-fill"
                            style={{
                              fontSize: "1.1rem",
                            }}
                          ></i>
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {currentDocuments?.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    No documents found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span className="text-muted small">
                Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of{" "}
                {totalItems} entries
              </span>
              <nav aria-label="Documents pagination">
                <ul className="pagination mb-0">
                  <li
                    className={`page-item ${
                      currentPage === 1 ? "disabled" : ""
                    }`}
                  >
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                  </li>
                  {(() => {
                    const pages: (number | string)[] = [];
                    const maxVisiblePages = 7;

                    if (totalPages <= maxVisiblePages) {
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      if (currentPage <= 4) {
                        pages.push(1, 2, 3, 4, 5, "...", totalPages);
                      } else if (currentPage >= totalPages - 3) {
                        pages.push(
                          1,
                          "...",
                          totalPages - 4,
                          totalPages - 3,
                          totalPages - 2,
                          totalPages - 1,
                          totalPages,
                        );
                      } else {
                        pages.push(
                          1,
                          "...",
                          currentPage - 1,
                          currentPage,
                          currentPage + 1,
                          "...",
                          totalPages,
                        );
                      }
                    }

                    return pages.map((page, index) => (
                      <li
                        key={index}
                        className={`page-item ${
                          currentPage === page ? "active" : ""
                        } ${page === "..." ? "disabled" : ""}`}
                      >
                        {page === "..." ? (
                          <span className="page-link">...</span>
                        ) : (
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage(page as number)}
                          >
                            {page}
                          </button>
                        )}
                      </li>
                    ));
                  })()}
                  <li
                    className={`page-item ${
                      currentPage === totalPages ? "disabled" : ""
                    }`}
                  >
                    <button
                      className="page-link"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
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

      <Suspense fallback={null}>
        {selectedDoc && showSendModal && (
          <SendDocumentModal
            show={showSendModal}
            onClose={() => setShowSendModal(false)}
            documentId={selectedDoc.id}
          />
        )}

        {selectedDoc && showReviewModal && (
          <ReviewDocumentModal
            show={showReviewModal}
            onClose={() => setShowReviewModal(false)}
            documentId={selectedDoc.id}
          />
        )}

        {showUploadModal && (
          <UploadModal
            show={showUploadModal}
            onClose={() => setShowUploadModal(false)}
          />
        )}

        {showTagsModal && (
          <TagsManagementModal
            show={showTagsModal}
            onClose={() => setShowTagsModal(false)}
          />
        )}
      </Suspense>
    </div>
  );
};

export default Documents;
