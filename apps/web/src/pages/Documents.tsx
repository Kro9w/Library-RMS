import React, { useState, Suspense, useMemo } from "react";
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
type Document = AppRouterOutputs["documents"]["getAll"]["documents"][0];

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

  // Pagination State - we'll keep this variable but set page to 1 and perPage to 1000 to fetch all for grouping
  const currentPage = 1;
  const itemsPerPage = 1000;

  const utils = trpc.useUtils();

  // Use the new custom hook
  const { canManageDocuments, isUploader } = usePermissions();

  const queryInput = {
    filter,
    page: currentPage,
    perPage: itemsPerPage,
    search: searchTerm || undefined,
    lifecycleFilter: lifecycleFilter === "all" ? undefined : lifecycleFilter,
  };

  const { data, isLoading } = trpc.documents.getAll.useQuery(queryInput, {
    staleTime: 30000,
  });

  // Recent documents query
  const recentQueryInput = {
    filter,
    page: 1,
    perPage: 5,
    search: undefined, // Always show top 5 regardless of search terms
    lifecycleFilter: lifecycleFilter === "all" ? undefined : lifecycleFilter,
  };

  const { data: recentData, isLoading: isLoadingRecent } =
    trpc.documents.getAll.useQuery(recentQueryInput, {
      staleTime: 30000,
    });

  const { data: documentTypesData, isLoading: isLoadingTypes } =
    trpc.documentTypes.getAll.useQuery(undefined, {
      staleTime: 30000,
    });

  const documents = useMemo(() => data?.documents || [], [data?.documents]);
  const recentDocuments = recentData?.documents || [];

  const deleteMutation = trpc.documents.deleteDocument.useMutation({
    onMutate: async ({ id }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await utils.documents.getAll.cancel(queryInput);

      // Snapshot the previous value
      const previousData = utils.documents.getAll.getData(queryInput);

      // Optimistically update to the new value
      if (previousData) {
        utils.documents.getAll.setData(queryInput, (old) => {
          if (!old) return old;
          return {
            ...old,
            documents: old.documents.filter((doc) => doc.id !== id),
            totalCount: old.totalCount - 1,
          };
        });
      }

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (_err, _newTodo, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        utils.documents.getAll.setData(queryInput, context.previousData);
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

  // Pagination Logic removed since we show everything in the accordion

  // Group documents by documentType.name, ensuring all existing types are represented
  const groupedDocuments = useMemo(() => {
    const groups: Record<string, Document[]> = {};

    // Initialize all known types with empty arrays
    if (documentTypesData) {
      documentTypesData.forEach((type) => {
        groups[type.name] = [];
      });
    }

    // Always create an "Uncategorized" group
    groups["Uncategorized"] = [];

    documents.forEach((doc) => {
      const typeName = doc.documentType?.name || "Uncategorized";
      if (!groups[typeName]) {
        groups[typeName] = [];
      }
      groups[typeName].push(doc);
    });

    return groups;
  }, [documents, documentTypesData]);

  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>(
    {},
  );

  const toggleAccordion = (type: string) => {
    setExpandedTypes((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  if (
    (isLoading && !data) ||
    (isLoadingRecent && !recentData) ||
    isLoadingTypes
  )
    return <LoadingAnimation />;

  return (
    <div className="container mt-4">
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

      {/* Recent Documents Section */}
      <div className="mb-4">
        <h4 className="section-title">Recent Documents</h4>
        <div className="card document-table-card mt-2">
          <div className="card-body p-0">
            <table className="table mb-0">
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
                {recentDocuments.map((doc: Document) => (
                  <tr key={doc.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <FileIcon
                          fileType={doc.fileType}
                          fileName={doc.title}
                        />
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
                {recentDocuments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      No recent documents found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Document Types Accordion */}
      <div className="mb-4">
        {Object.entries(groupedDocuments).length === 0 ? (
          <div className="card document-table-card mt-2">
            <div className="card-body text-center text-muted py-4">
              No document types found.
            </div>
          </div>
        ) : (
          Object.entries(groupedDocuments).map(([type, docs]) => {
            const isExpanded = expandedTypes[type];
            return (
              <div key={type} className="accordion-item mb-3">
                <button
                  className="accordion-header w-100 text-start d-flex justify-content-between align-items-center"
                  onClick={() => toggleAccordion(type)}
                >
                  <span>
                    {type}{" "}
                    <span className="text-muted ms-2">({docs.length})</span>
                  </span>
                  <i
                    className={`bi bi-chevron-${isExpanded ? "up" : "down"}`}
                  ></i>
                </button>
                {isExpanded && (
                  <div className="accordion-content">
                    <div className="card document-table-card mt-0 border-top-0 rounded-top-0">
                      <div className="card-body p-0">
                        <table className="table mb-0">
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
                            {docs.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="text-center text-muted py-4"
                                >
                                  No documents found for this type.
                                </td>
                              </tr>
                            ) : (
                              docs.map((doc: Document) => (
                                <tr key={doc.id}>
                                  <td>
                                    <div className="d-flex align-items-center gap-2">
                                      <FileIcon
                                        fileType={doc.fileType}
                                        fileName={doc.title}
                                      />
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
                                            style={{
                                              backgroundColor: `var(--type-color)`,
                                            }}
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
                                  <td className="text-muted">
                                    {doc.controlNumber || "—"}
                                  </td>
                                  <td className="text-muted">
                                    {new Date(
                                      doc.createdAt,
                                    ).toLocaleDateString()}
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
                                              (tag: {
                                                tag: { name: string };
                                              }) =>
                                                tag.tag.name === "for review",
                                            ) && (
                                              <button
                                                onClick={() =>
                                                  handleReviewClick(doc)
                                                }
                                                className="btn btn-icon btn-review"
                                                title="Review Document"
                                              >
                                                <i className="bi bi-eye"></i>
                                              </button>
                                            )}
                                          <button
                                            onClick={() =>
                                              handleDeleteClick(doc)
                                            }
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
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
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
