import React, { useState, Suspense, useMemo } from "react";
import { trpc } from "../trpc";
import { keepPreviousData } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal";

import "./Documents.css";
import { formatUserName } from "../utils/user";
import { StatusBadge } from "../components/StatusBadge";
import { FileIcon } from "../components/FileIcon";
import { usePermissions } from "../hooks/usePermissions";
import { useDebounce } from "../hooks/useDebounce";
import { DocumentTypePill } from "./DocumentTypePill";
import { DocumentActionsMenu } from "./DocumentActionsMenu";
import { CategoryBadge, CategoryType } from "../components/CategoryBadge";

import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";

const UploadModal = React.lazy(() =>
  import("../components/UploadModal").then((m) => ({ default: m.UploadModal })),
);
const ForwardDocumentModal = React.lazy(() =>
  import("../components/ForwardDocumentModal").then((m) => ({
    default: m.ForwardDocumentModal,
  })),
);
const ReviewDocumentModal = React.lazy(() =>
  import("../components/ReviewDocumentModal").then((m) => ({
    default: m.ReviewDocumentModal,
  })),
);
const CheckOutModal = React.lazy(() =>
  import("../components/CheckOutModal").then((m) => ({
    default: m.CheckOutModal,
  })),
);
const CheckInModal = React.lazy(() =>
  import("../components/CheckInModal").then((m) => ({
    default: m.CheckInModal,
  })),
);

type Document = AppRouterOutputs["documents"]["getAll"]["documents"][0];

interface DocRowProps {
  doc: Document;
  showTypePill?: boolean; // true = recent view, false = grouped view
  isUploader: (id: string) => boolean;
  canManageDocuments: boolean;
  currentUserId?: string;
  onForwardClick: (doc: Document) => void;
  onReviewClick: (doc: Document) => void;
  onDeleteClick: (doc: Document) => void;
  onCheckOutClick: (doc: Document) => void;
  onCheckInClick: (doc: Document) => void;
  onDiscardCheckOutClick: (doc: Document) => void;
}

const DocRow: React.FC<DocRowProps> = ({
  doc,
  showTypePill = false,
  isUploader,
  canManageDocuments,
  currentUserId,
  onForwardClick,
  onReviewClick,
  onDeleteClick,
  onCheckOutClick,
  onCheckInClick,
  onDiscardCheckOutClick,
}) => {
  return (
    <tr>
      <td style={{ width: showTypePill ? "auto" : "36%" }}>
        {showTypePill ? (
          /* Recent docs: original layout with file icon + type pill + category */
          <div className="d-flex align-items-center gap-2">
            <FileIcon fileType={doc.fileType} fileName={doc.title} />
            <div className="d-flex flex-column gap-1 align-items-start">
              <DocumentTypePill documentType={doc.documentType} />
              <CategoryBadge category={doc.category as CategoryType} />
            </div>
          </div>
        ) : (
          /* Grouped docs: type dot + title stacked with category below */
          <div
            className="d-flex align-items-center gap-2"
            style={{ minWidth: 0 }}
          >
            <FileIcon fileType={doc.fileType} fileName={doc.title} />
            <div style={{ minWidth: 0 }}>
              <Link to={`/documents/${doc.id}`} className="doc-title-main">
                {doc.title}
              </Link>
              <div className="doc-title-sub">
                <CategoryBadge category={doc.category as CategoryType} />
                {doc.isCheckedOut && (
                  <i
                    className="bi bi-lock-fill text-danger"
                    style={{ fontSize: "10px" }}
                    title="Checked Out"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </td>

      {showTypePill && (
        <td>
          <Link
            to={`/documents/${doc.id}`}
            className="fw-bold text-decoration-none"
            style={{ fontSize: "13px", color: "var(--text-primary)" }}
          >
            {doc.title}
          </Link>
        </td>
      )}

      <td style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
        {formatUserName(doc.uploadedBy)}
      </td>
      <td>
        <StatusBadge status={doc.lifecycleStatus} />
      </td>
      <td
        style={{
          fontSize: "12px",
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {doc.controlNumber || "—"}
      </td>
      <td
        style={{
          fontSize: "12px",
          color: "var(--text-muted)",
          whiteSpace: "nowrap",
        }}
      >
        {new Date(doc.createdAt).toLocaleDateString()}
      </td>
      <td>
        <div className="d-flex align-items-center justify-content-end gap-2">
          {showTypePill && doc.isCheckedOut && (
            <i
              className="bi bi-lock-fill text-danger me-1"
              title="Checked Out"
            />
          )}
          <DocumentActionsMenu
            doc={doc}
            isUploader={isUploader}
            canManageDocuments={canManageDocuments}
            onForwardClick={onForwardClick}
            onSendClick={(doc) => {
              window.location.href = `/documents/${doc.id}/send`;
            }}
            onReviewClick={onReviewClick}
            onDeleteClick={onDeleteClick}
            onCheckOutClick={onCheckOutClick}
            onCheckInClick={onCheckInClick}
            onDiscardCheckOutClick={onDiscardCheckOutClick}
            currentUserId={currentUserId}
          />
        </div>
      </td>
    </tr>
  );
};

const TABLE_HEADERS = (
  <tr>
    <th>Document</th>
    <th>Owner</th>
    <th>Lifecycle</th>
    <th>Control No.</th>
    <th>Date</th>
    <th style={{ textAlign: "right" }}>Actions</th>
  </tr>
);

const RECENT_TABLE_HEADERS = (
  <tr>
    <th>Type</th>
    <th>Title</th>
    <th>Owner</th>
    <th>Lifecycle</th>
    <th>Control No.</th>
    <th>Date</th>
    <th style={{ textAlign: "right" }}>Actions</th>
  </tr>
);

const Documents: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [lifecycleFilter, setLifecycleFilter] = useState<"all" | "ready">(
    "all",
  );
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const utils = trpc.useUtils();
  const { data: userData } = trpc.user.getMe.useQuery();
  const { canManageDocuments, isUploader } = usePermissions();

  const queryInput = {
    filter,
    page: currentPage,
    perPage: itemsPerPage,
    search: debouncedSearchTerm || undefined,
    lifecycleFilter: lifecycleFilter === "all" ? undefined : lifecycleFilter,
  };

  const { data, isLoading } = trpc.documents.getAll.useQuery(queryInput, {
    staleTime: 30000,
    placeholderData: keepPreviousData,
  });

  const recentQueryInput = {
    filter,
    page: 1,
    perPage: 5,
    search: undefined,
    lifecycleFilter: lifecycleFilter === "all" ? undefined : lifecycleFilter,
  };

  const { data: recentData, isLoading: isLoadingRecent } =
    trpc.documents.getAll.useQuery(recentQueryInput, {
      staleTime: 30000,
      placeholderData: keepPreviousData,
    });

  const { isLoading: isLoadingTypes } = trpc.documentTypes.getAll.useQuery(
    undefined,
    {
      staleTime: 30000,
    },
  );

  const documents = useMemo(() => data?.documents || [], [data?.documents]);

  const groupedDocuments = useMemo(() => {
    const groups: Record<string, { docs: Document[]; color?: string }> = {};
    documents.forEach((doc: Document) => {
      const typeName = doc.documentType?.name || "Uncategorized";
      if (!groups[typeName]) {
        groups[typeName] = { docs: [], color: doc.documentType?.color };
      }
      groups[typeName].docs.push(doc);
    });
    return groups;
  }, [documents]);

  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>(
    {},
  );
  const [documentToDiscard, setDocumentToDiscard] = useState<Document | null>(
    null,
  );

  const toggleAccordion = (groupName: string) => {
    setOpenAccordions((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const recentDocuments = recentData?.documents || [];

  const deleteMutation = trpc.documents.deleteDocument.useMutation({
    onMutate: async ({ id }) => {
      await utils.documents.getAll.cancel(queryInput);
      const previousData = utils.documents.getAll.getData(queryInput);
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
      return { previousData };
    },
    onError: (_err, _newTodo, context) => {
      if (context?.previousData) {
        utils.documents.getAll.setData(queryInput, context.previousData);
      }
    },
    onSettled: () => {
      utils.documents.getAll.invalidate();
    },
  });

  const discardCheckOutMutation = trpc.documents.discardCheckOut.useMutation({
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

  const handleCheckOutClick = (doc: Document) => {
    setSelectedDoc(doc);
    setShowCheckOutModal(true);
  };

  const handleCheckInClick = (doc: Document) => {
    setSelectedDoc(doc);
    setShowCheckInModal(true);
  };

  const handleDiscardCheckOutClick = (doc: Document) => {
    setDocumentToDiscard(doc);
  };

  const confirmDiscardCheckOut = () => {
    if (documentToDiscard) {
      discardCheckOutMutation.mutate(
        { documentId: documentToDiscard.id },
        { onSettled: () => setDocumentToDiscard(null) },
      );
    }
  };

  const totalPages = data?.totalCount
    ? Math.ceil(data.totalCount / itemsPerPage)
    : 1;

  const sharedRowProps = {
    isUploader,
    canManageDocuments,
    currentUserId: userData?.id,
    onForwardClick: handleSendClick,
    onReviewClick: handleReviewClick,
    onDeleteClick: handleDeleteClick,
    onCheckOutClick: handleCheckOutClick,
    onCheckInClick: handleCheckInClick,
    onDiscardCheckOutClick: handleDiscardCheckOutClick,
  };

  if (
    (isLoading && !data) ||
    (isLoadingRecent && !recentData) ||
    isLoadingTypes
  ) {
    return (
      <div className="page-loading">
        <div className="page-spinner" />
        <span>Loading documents...</span>
      </div>
    );
  }

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
            <option value="all">All Institution Documents</option>
            <option value="mine">My Documents</option>
          </select>
          {canManageDocuments && (
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
          )}
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
            Upload
          </button>
        </div>
      </div>

      {/* ── Recent Documents ── */}
      <div className="mb-4">
        <div className="accordion-item mb-3">
          <div className="accordion-header w-100 text-start d-flex justify-content-between align-items-center non-clickable">
            <span>Recent Documents</span>
            <span className="doc-count">{recentDocuments.length}</span>
          </div>
          <div className="accordion-content">
            <div
              className="document-table-card"
              style={{ border: "none", borderRadius: 0, boxShadow: "none" }}
            >
              <table className="table mb-0">
                <thead>{RECENT_TABLE_HEADERS}</thead>
                <tbody>
                  {recentDocuments.map((doc: Document) => (
                    <DocRow
                      key={doc.id}
                      doc={doc}
                      showTypePill
                      {...sharedRowProps}
                    />
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
      </div>

      {/* ── Grouped by Document Type ── */}
      <div className="mb-4">
        {Object.entries(groupedDocuments)
          .sort(([a], [b]) => {
            if (a === "Uncategorized") return 1;
            if (b === "Uncategorized") return -1;
            return a.localeCompare(b);
          })
          .map(([groupName, { docs: groupDocs, color }]) => {
            const isOpen = openAccordions[groupName];
            const dotColor = color ? `#${color}` : "var(--text-muted)";

            return (
              <div className="accordion-item mb-3" key={groupName}>
                <button
                  className={`accordion-header w-100 text-start d-flex justify-content-between align-items-center ${!isOpen ? "collapsed" : ""}`}
                  onClick={() => toggleAccordion(groupName)}
                >
                  <span className="d-flex align-items-center gap-2">
                    <span
                      className="doc-group-type-dot"
                      style={{ backgroundColor: dotColor }}
                    />
                    {groupName}
                  </span>
                  <div className="d-flex align-items-center gap-3">
                    <span className="doc-count">{groupDocs.length}</span>
                    <i
                      className={`bi bi-chevron-${isOpen ? "up" : "down"}`}
                      style={{ color: "var(--text-muted)", fontSize: "12px" }}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="accordion-content">
                    <div
                      className="document-table-card"
                      style={{
                        border: "none",
                        borderRadius: 0,
                        boxShadow: "none",
                      }}
                    >
                      <table className="table mb-0">
                        <thead>{TABLE_HEADERS}</thead>
                        <tbody>
                          {groupDocs.length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="text-center text-muted py-4"
                              >
                                No documents found in this category.
                              </td>
                            </tr>
                          ) : (
                            groupDocs.map((doc: Document) => (
                              <DocRow
                                key={doc.id}
                                doc={doc}
                                showTypePill={false}
                                {...sharedRowProps}
                              />
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

        {/* Global pagination */}
        {totalPages > 1 && (
          <div className="d-flex justify-content-center mt-4 pb-3">
            <nav>
              <ul className="pagination mb-0">
                <li
                  className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
                >
                  <button
                    className="page-link"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                  >
                    Previous
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <li
                      key={page}
                      className={`page-item ${currentPage === page ? "active" : ""}`}
                    >
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    </li>
                  ),
                )}
                <li
                  className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}
                >
                  <button
                    className="page-link"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
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

      <ConfirmModal
        show={!!documentToDiscard}
        onClose={() => setDocumentToDiscard(null)}
        onConfirm={confirmDiscardCheckOut}
        title="Discard Check Out"
        isConfirming={discardCheckOutMutation.isPending}
      >
        Are you sure you want to discard the check out for "
        {documentToDiscard?.title}"?
      </ConfirmModal>

      <Suspense fallback={null}>
        {selectedDoc && showSendModal && (
          <ForwardDocumentModal
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
        {selectedDoc && showCheckOutModal && (
          <CheckOutModal
            show={showCheckOutModal}
            onClose={() => setShowCheckOutModal(false)}
            documentId={selectedDoc.id}
          />
        )}
        {selectedDoc && showCheckInModal && (
          <CheckInModal
            show={showCheckInModal}
            onClose={() => setShowCheckInModal(false)}
            documentId={selectedDoc.id}
          />
        )}
      </Suspense>
    </div>
  );
};

export default Documents;
