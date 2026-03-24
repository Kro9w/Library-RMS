import React, { useState, Suspense, useMemo } from "react";
import { trpc } from "../trpc";
import { keepPreviousData } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal";
// Lazy loaded modals
import { LoadingAnimation } from "../components/ui/LoadingAnimation";
import "./Documents.css";
import { formatUserName } from "../utils/user";
import { StatusBadge } from "../components/StatusBadge";
import { FileIcon } from "../components/FileIcon";
import { usePermissions } from "../hooks/usePermissions";
import { useDebounce } from "../hooks/useDebounce";
import { DocumentTypePill } from "./DocumentTypePill";
import { DocumentActionsMenu } from "./DocumentActionsMenu";
import {
  ClassificationBadge,
  ClassificationType,
} from "../components/ClassificationBadge";

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

// This type now correctly includes fileType and fileSize
type Document = AppRouterOutputs["documents"]["getAll"]["documents"][0];

// ------------------------------

const Documents: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

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
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  // Pagination State - Re-enable proper pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // Revert from 1000 to a reasonable number

  const utils = trpc.useUtils();

  // Use the new custom hook
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
      placeholderData: keepPreviousData,
    });

  const { data: documentTypesData, isLoading: isLoadingTypes } =
    trpc.documentTypes.getAll.useQuery(undefined, {
      staleTime: 30000,
    });

  const documents = useMemo(() => data?.documents || [], [data?.documents]);

  const groupedDocuments = useMemo(() => {
    const groups: Record<string, Document[]> = {};

    // Initialize groups for all known document types to show empty accordions if desired,
    // or we can just build groups dynamically based on what's present.
    // Given the instruction to show accordion for "every document type made plus the uncategorized one",
    // we initialize arrays for each type.
    if (documentTypesData) {
      documentTypesData.forEach((type: any) => {
        groups[type.name] = [];
      });
    }

    // Always ensure "Uncategorized" exists
    groups["Uncategorized"] = [];

    documents.forEach((doc: Document) => {
      const typeName = doc.documentType?.name || "Uncategorized";
      if (!groups[typeName]) {
        groups[typeName] = [];
      }
      groups[typeName].push(doc);
    });

    return groups;
  }, [documents, documentTypesData]);

  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>(
    {},
  );

  const toggleAccordion = (groupName: string) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };
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
    if (
      window.confirm(
        "Are you sure you want to discard this check out? This cannot be undone.",
      )
    ) {
      discardCheckOutMutation.mutate({ documentId: doc.id });
    }
  };
  // ----------------------------------------------------

  // Pagination Logic removed since we show everything in the accordion

  const totalPages = data?.totalCount
    ? Math.ceil(data.totalCount / itemsPerPage)
    : 1;

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
        <div className="accordion-item mb-3">
          <div className="accordion-header w-100 text-start d-flex justify-content-between align-items-center non-clickable">
            <span>Recent Documents</span>
          </div>
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
                    {recentDocuments.map((doc: Document) => (
                      <tr key={doc.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <FileIcon
                              fileType={doc.fileType}
                              fileName={doc.title}
                            />
                            <div className="d-flex flex-column gap-1 align-items-start">
                              <DocumentTypePill
                                documentType={doc.documentType}
                              />
                              <ClassificationBadge
                                classification={
                                  doc.classification as ClassificationType
                                }
                              />
                            </div>
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
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="d-flex align-items-center justify-content-end gap-2">
                            {doc.isCheckedOut && (
                              <i
                                className="bi bi-lock-fill text-danger me-1"
                                title="Checked Out"
                              ></i>
                            )}
                            <DocumentActionsMenu
                              doc={doc}
                              isUploader={isUploader}
                              canManageDocuments={canManageDocuments}
                              onSendClick={handleSendClick}
                              onReviewClick={handleReviewClick}
                              onDeleteClick={handleDeleteClick}
                              onCheckOutClick={handleCheckOutClick}
                              onCheckInClick={handleCheckInClick}
                              onDiscardCheckOutClick={
                                handleDiscardCheckOutClick
                              }
                              currentUserId={userData?.id}
                            />
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
        </div>
      </div>

      {/* Grouped Documents by Type Accordions */}
      <div className="mb-4">
        {Object.entries(groupedDocuments).map(([groupName, groupDocs]) => {
          const isOpen = openAccordions[groupName];
          return (
            <div className="accordion-item mb-3" key={groupName}>
              <button
                className={`accordion-header w-100 text-start d-flex justify-content-between align-items-center ${!isOpen ? "collapsed" : ""}`}
                onClick={() => toggleAccordion(groupName)}
              >
                <span>{groupName}</span>
                <div className="d-flex align-items-center gap-3">
                  <span
                    className="text-muted"
                    style={{ fontSize: "0.9rem", fontWeight: "normal" }}
                  >
                    Count: {groupDocs.length}
                  </span>
                  <i className={`bi bi-chevron-${isOpen ? "up" : "down"}`}></i>
                </div>
              </button>

              {isOpen && (
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
                          {groupDocs.length === 0 ? (
                            <tr>
                              <td
                                colSpan={7}
                                className="text-center text-muted py-4"
                              >
                                No documents found in this category.
                              </td>
                            </tr>
                          ) : (
                            groupDocs.map((doc: Document) => (
                              <tr key={doc.id}>
                                <td>
                                  <div className="d-flex align-items-center gap-2">
                                    <FileIcon
                                      fileType={doc.fileType}
                                      fileName={doc.title}
                                    />
                                    <div className="d-flex flex-column gap-1 align-items-start">
                                      <DocumentTypePill
                                        documentType={doc.documentType}
                                      />
                                      <ClassificationBadge
                                        classification={
                                          doc.classification as ClassificationType
                                        }
                                      />
                                    </div>
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
                                  {new Date(doc.createdAt).toLocaleDateString()}
                                </td>
                                <td>
                                  <div className="d-flex align-items-center justify-content-end gap-2">
                                    {doc.isCheckedOut && (
                                      <i
                                        className="bi bi-lock-fill text-danger me-1"
                                        title="Checked Out"
                                      ></i>
                                    )}
                                    <DocumentActionsMenu
                                      doc={doc}
                                      isUploader={isUploader}
                                      canManageDocuments={canManageDocuments}
                                      onSendClick={handleSendClick}
                                      onReviewClick={handleReviewClick}
                                      onDeleteClick={handleDeleteClick}
                                      onCheckOutClick={handleCheckOutClick}
                                      onCheckInClick={handleCheckInClick}
                                      onDiscardCheckOutClick={
                                        handleDiscardCheckOutClick
                                      }
                                      currentUserId={userData?.id}
                                    />
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Note: Pagination is maintained at the API query level, but with accordion grouping it applies to the whole set requested per page. */}
                  {/* To correctly paginate grouped data, it is recommended to either increase itemsPerPage or maintain global pagination below all accordions. */}
                </div>
              )}
            </div>
          );
        })}

        {/* Global Pagination Controls across all fetched documents */}
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
