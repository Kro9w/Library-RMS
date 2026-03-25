// apps/web/src/pages/DocumentDetails.tsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { trpc } from "../trpc";
import "./DocumentDetails.css";
import { LoadingAnimation } from "../components/ui/LoadingAnimation";
import { formatUserName } from "../utils/user";
import {
  ClassificationBadge,
  ClassificationType,
} from "../components/ClassificationBadge";

import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";
type Document = AppRouterOutputs["documents"]["getById"];

const SUPPORTED_PREVIEW_TYPES = {
  // PDF
  "application/pdf": "pdf",
  // Microsoft Word
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "office",
  "application/msword": "office",
  // Microsoft Excel
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "office",
  "application/vnd.ms-excel": "office",
  // Microsoft PowerPoint
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "office",
  "application/vnd.ms-powerpoint": "office",
};

const formatFileTypeDisplay = (
  fileType: string | null | undefined,
  title: string,
): string => {
  // First, try to read the explicit fileType (for new documents)
  if (fileType) {
    switch (fileType) {
      case "application/pdf":
        return "PDF";
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      case "application/msword":
        return "DOCX";
      case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      case "application/vnd.ms-excel":
        return "XLSX";
      case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      case "application/vnd.ms-powerpoint":
        return "PPTX";
      case "image/jpeg":
        return "JPEG";
      case "image/png":
        return "PNG";
      case "text/plain":
        return "TXT";
      default: {
        // If we don't recognize the type, try to split it
        const simpleType = fileType.split("/")[1];
        if (simpleType) return simpleType.toUpperCase();
      }
    }
  }

  // If fileType is null (for old documents), fall back to the title
  const extension = title.split(".").pop();
  return extension ? extension.toUpperCase() : "N/A";
};
// ------------------------------

import { SendDocumentModal } from "../components/SendDocumentModal";
import { ReviewDocumentModal } from "../components/ReviewDocumentModal";
import { usePermissions } from "../hooks/usePermissions";

export const DocumentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showResubmitModal, setShowResubmitModal] = React.useState(false);
  const [showReviewModal, setShowReviewModal] = React.useState(false);

  const { data: user } = trpc.user.getMe.useQuery();
  const { canManageDocuments } = usePermissions();
  const utils = trpc.useUtils();

  const { data: document, isLoading: isLoadingDoc } =
    trpc.documents.getById.useQuery({ id: id! }, { enabled: !!id });

  const requestDispositionMutation =
    trpc.documents.requestDisposition.useMutation({
      onSuccess: () => {
        utils.documents.getById.invalidate({ id: id! });
      },
    });

  const approveDispositionMutation =
    trpc.documents.approveDisposition.useMutation({
      onSuccess: () => {
        utils.documents.getById.invalidate({ id: id! });
      },
    });

  const rejectDispositionMutation =
    trpc.documents.rejectDisposition.useMutation({
      onSuccess: () => {
        utils.documents.getById.invalidate({ id: id! });
      },
    });

  const applyLegalHoldMutation = trpc.documents.applyLegalHold.useMutation({
    onSuccess: () => {
      utils.documents.getById.invalidate({ id: id! });
    },
  });

  const removeLegalHoldMutation = trpc.documents.removeLegalHold.useMutation({
    onSuccess: () => {
      utils.documents.getById.invalidate({ id: id! });
    },
  });

  const { data: urlData, isLoading: isLoadingUrl } =
    trpc.documents.getSignedDocumentUrl.useQuery(
      { documentId: id! },
      {
        enabled: !!id,
        staleTime: 1000 * 60 * 4, // Cache URL for 4 minutes
        refetchOnWindowFocus: false,
      },
    );

  if (isLoadingDoc || isLoadingUrl) {
    return <LoadingAnimation />;
  }

  if (!document || !urlData) {
    return <div className="container mt-4">Document not found.</div>;
  }

  // This function is type-safe and correct
  const getPreviewDetails = (doc: Document) => {
    let previewType: string | null = null;

    if (doc.fileType) {
      previewType =
        SUPPORTED_PREVIEW_TYPES[
          doc.fileType as keyof typeof SUPPORTED_PREVIEW_TYPES
        ];
    }

    if (!previewType) {
      const title = doc.title.toLowerCase();
      if (title.endsWith(".pdf")) {
        previewType = "pdf";
      } else if (
        title.endsWith(".docx") ||
        title.endsWith(".doc") ||
        title.endsWith(".xlsx") ||
        title.endsWith(".xls") ||
        title.endsWith(".pptx") ||
        title.endsWith(".ppt")
      ) {
        previewType = "office";
      }
    }

    let url = null;
    if (previewType === "pdf") {
      url = urlData.signedUrl;
    } else if (previewType === "office") {
      url = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
        urlData.signedUrl,
      )}`;
    }
    return url;
  };

  const previewUrl = getPreviewDetails(document);

  // Check if document needs review
  const hasReviewTag = document.tags?.some(
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    (t: any) =>
      t.tag?.name?.toLowerCase() === "for review" ||
      t.name?.toLowerCase() === "for review",
  );

  return (
    <div className="container mt-4">
      {document.isUnderLegalHold && (
        <div
          className="alert alert-danger d-flex align-items-center mb-4 shadow-sm"
          role="alert"
        >
          <i className="bi bi-exclamation-triangle-fill fs-4 me-3"></i>
          <div>
            <h5 className="alert-heading mb-1">Document is under Legal Hold</h5>
            <p className="mb-0">
              {document.legalHoldReason || "No reason provided."}
            </p>
          </div>
        </div>
      )}

      <div className="page-header">
        <h2>
          {document.title}
          <ClassificationBadge
            classification={document.classification as ClassificationType}
          />
        </h2>
      </div>

      <div className="document-details-container">
        <div className="document-viewer">
          {previewUrl ? (
            <iframe
              src={previewUrl}
              className="pdf-preview-iframe"
              title={document.title}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            ></iframe>
          ) : (
            <div className="preview-fallback">
              <i className="bi bi-file-earmark-lock"></i>
              <p>Cannot preview this file type.</p>
              <p className="text-muted">
                This file must be downloaded to be viewed.
              </p>
            </div>
          )}
        </div>
        <div className="document-metadata">
          <div className="document-table-card">
            <div className="card-body">
              <h4 className="card-title">Details</h4>
              <hr />
              <p>
                <strong>Location:</strong>{" "}
                {document.uploadedBy.department?.campus?.name} /{" "}
                {document.uploadedBy.department?.name}
              </p>
              <p>
                <strong>Owner:</strong> {formatUserName(document.uploadedBy)}
              </p>
              <p>
                <strong>Created:</strong>{" "}
                {new Date(document.createdAt).toLocaleDateString()}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={`badge ${document.recordStatus === "FINAL" ? "bg-success" : "bg-warning text-dark"}`}
                >
                  {document.recordStatus}
                </span>
              </p>

              {document.isCheckedOut && (
                <p>
                  <strong>Checked Out By:</strong>{" "}
                  <span className="text-danger">
                    <i className="bi bi-lock-fill me-1"></i>
                    {document.checkedOutBy
                      ? formatUserName(document.checkedOutBy)
                      : "Unknown User"}
                  </span>
                </p>
              )}

              {/* This now calls our new, safe function */}
              <p>
                <strong>File Type:</strong>{" "}
                {formatFileTypeDisplay(document.fileType, document.title)}
              </p>

              <div className="d-grid gap-2 mt-4 mb-3">
                <a
                  href={urlData.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  <i className="bi bi-download me-2"></i>
                  Download
                </a>
                <button
                  className="btn btn-outline-secondary"
                  onClick={() =>
                    navigate(`/graph?targetUserId=${document.uploadedById}`)
                  }
                >
                  <i className="bi bi-diagram-3 me-2"></i>
                  Show in Graph
                </button>
                {canManageDocuments && (
                  <button
                    className={`btn ${document.isUnderLegalHold ? "btn-outline-danger" : "btn-outline-dark"}`}
                    onClick={() => {
                      if (document.isUnderLegalHold) {
                        if (
                          window.confirm(
                            "Are you sure you want to remove the legal hold?",
                          )
                        ) {
                          removeLegalHoldMutation.mutate({
                            documentId: document.id,
                          });
                        }
                      } else {
                        const reason = window.prompt(
                          "Enter reason for Legal Hold:",
                        );
                        if (reason) {
                          applyLegalHoldMutation.mutate({
                            documentId: document.id,
                            reason,
                          });
                        }
                      }
                    }}
                    disabled={
                      applyLegalHoldMutation.isPending ||
                      removeLegalHoldMutation.isPending
                    }
                  >
                    <i className="bi bi-shield-lock me-2"></i>
                    {document.isUnderLegalHold
                      ? "Remove Legal Hold"
                      : "Apply Legal Hold"}
                  </button>
                )}
              </div>

              <hr />
              <p>
                <strong>Lifecycle:</strong>{" "}
                <span
                  className={`badge ${
                    document.lifecycleStatus === "Active"
                      ? "bg-success"
                      : document.lifecycleStatus === "Inactive"
                        ? "bg-secondary"
                        : document.lifecycleStatus === "Ready"
                          ? "bg-warning text-dark"
                          : document.lifecycleStatus === "Legal Hold"
                            ? "bg-danger"
                            : document.lifecycleStatus === "Archived"
                              ? "bg-info"
                              : "bg-danger"
                  }`}
                >
                  {document.lifecycleStatus}
                </span>
              </p>

              {canManageDocuments && !document.isUnderLegalHold && (
                <>
                  {document.lifecycleStatus === "Ready" && (
                    <div className="mt-3">
                      <div className="alert alert-warning">
                        <h6 className="alert-heading">Disposition Ready</h6>
                        <p className="mb-2">
                          This document has reached its retention limit.
                        </p>
                        <p className="mb-3">
                          Action:{" "}
                          <strong>{document.dispositionActionSnapshot}</strong>
                        </p>
                        <button
                          className="btn btn-warning w-100 fw-bold"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Request approval to execute disposition?",
                              )
                            ) {
                              requestDispositionMutation.mutate({
                                documentId: document.id,
                              });
                            }
                          }}
                          disabled={requestDispositionMutation.isPending}
                        >
                          {requestDispositionMutation.isPending
                            ? "Requesting..."
                            : "Request Disposition Approval"}
                        </button>
                      </div>
                    </div>
                  )}

                  {document.dispositionStatus === "PENDING_DISPOSITION" && (
                    <div className="mt-3">
                      <div className="alert alert-info">
                        <h6 className="alert-heading">
                          Disposition Pending Approval
                        </h6>
                        <p className="mb-3">
                          A request to{" "}
                          <strong>{document.dispositionActionSnapshot}</strong>{" "}
                          this document is pending.
                        </p>

                        {user?.id === document.dispositionRequesterId ? (
                          <button
                            className="btn btn-outline-secondary w-100"
                            onClick={() => {
                              if (
                                window.confirm("Cancel disposition request?")
                              ) {
                                rejectDispositionMutation.mutate({
                                  documentId: document.id,
                                });
                              }
                            }}
                            disabled={rejectDispositionMutation.isPending}
                          >
                            Cancel Request
                          </button>
                        ) : (
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-danger flex-grow-1"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Approve and execute disposition? This action is irreversible.",
                                  )
                                ) {
                                  approveDispositionMutation.mutate({
                                    documentId: document.id,
                                  });
                                }
                              }}
                              disabled={approveDispositionMutation.isPending}
                            >
                              {approveDispositionMutation.isPending
                                ? "Executing..."
                                : "Approve & Execute"}
                            </button>
                            <button
                              className="btn btn-outline-danger flex-grow-1"
                              onClick={() => {
                                if (
                                  window.confirm("Reject disposition request?")
                                ) {
                                  rejectDispositionMutation.mutate({
                                    documentId: document.id,
                                  });
                                }
                              }}
                              disabled={rejectDispositionMutation.isPending}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {canManageDocuments && hasReviewTag && (
            <div className="d-grid mt-3 mb-3">
              <button
                className="btn btn-primary fw-bold py-2 shadow-sm"
                onClick={() => setShowReviewModal(true)}
              >
                <i className="bi bi-eye-fill me-2"></i>
                Review Document
              </button>
            </div>
          )}

          {/* Review Status Section */}
          {document.status && (
            <div className="document-table-card mt-4">
              <div className="card-body">
                <h5 className="card-title d-flex align-items-center">
                  <i className="bi bi-clipboard-check me-2"></i>
                  Review Details
                </h5>
                <hr />
                <div className="mb-3">
                  <span className="text-muted fw-bold me-2">Status:</span>
                  <span
                    className={`badge ${
                      document.status === "approved"
                        ? "bg-success"
                        : document.status === "returned"
                          ? "bg-warning text-dark"
                          : document.status === "disapproved"
                            ? "bg-danger"
                            : "bg-secondary"
                    }`}
                    style={{ fontSize: "0.9rem", padding: "0.5em 0.8em" }}
                  >
                    {document.status.toUpperCase()}
                  </span>
                </div>

                {document.remarks && document.remarks.length > 0 ? (
                  <div>
                    <span className="text-muted fw-bold d-block mb-2">
                      Remarks:
                    </span>
                    <div className="d-flex flex-column gap-2">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {document.remarks.map((remark: any) => (
                        <div
                          key={remark.id}
                          className="p-3 bg-light border rounded"
                        >
                          <div className="d-flex justify-content-between mb-1">
                            <strong
                              style={{
                                fontSize: "0.85rem",
                                color: "var(--brand)",
                              }}
                            >
                              {formatUserName(remark.author)}
                            </strong>
                            <small
                              className="text-muted"
                              style={{ fontSize: "0.75rem" }}
                            >
                              {new Date(remark.createdAt).toLocaleString()}
                            </small>
                          </div>
                          <p
                            className="mb-0 text-dark"
                            style={{
                              fontSize: "0.9rem",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {remark.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted fst-italic mb-0 mt-3">
                    No remarks were left during the review.
                  </p>
                )}

                {document.status === "returned" &&
                  (document.uploadedById === user?.id ||
                    document.originalSenderId === user?.id) && (
                    <div className="d-flex justify-content-end mt-4">
                      <button
                        className="btn btn-outline-primary"
                        style={{
                          fontSize: "0.85rem",
                          padding: "0.4rem 0.8rem",
                        }}
                        onClick={() => setShowResubmitModal(true)}
                      >
                        <i className="bi bi-arrow-repeat me-1"></i> Resubmit for
                        Review
                      </button>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Version History Section Full Width */}
      <div className="document-table-card mt-4 mb-4">
        <div className="card-body">
          <h5 className="card-title d-flex align-items-center">
            <i className="bi bi-clock-history me-2"></i>
            Version History
          </h5>
          <hr />
          {document.versions && document.versions.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Date</th>
                    <th>Uploaded By</th>
                    <th>Type</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {document.versions.map((v: any) => (
                    <tr key={v.id}>
                      <td>
                        <span className="badge bg-secondary">
                          v{v.versionNumber}
                        </span>
                      </td>
                      <td>{new Date(v.createdAt).toLocaleDateString()}</td>
                      <td>{formatUserName(v.uploadedBy)}</td>
                      <td>{formatFileTypeDisplay(v.fileType, "File")}</td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={async () => {
                            try {
                              const result =
                                await utils.documents.getSignedDocumentUrl.fetch(
                                  {
                                    documentId: document.id,
                                    versionId: v.id,
                                  },
                                );
                              window.open(
                                result.signedUrl,
                                "_blank",
                                "noopener,noreferrer",
                              );
                            } catch (err) {
                              console.error("Failed to open version", err);
                              alert("Could not retrieve document version URL.");
                            }
                          }}
                          title="Download / View Version"
                        >
                          <i className="bi bi-download me-1"></i> Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
              No version history available.
            </p>
          )}
        </div>
      </div>

      {showResubmitModal && (
        <SendDocumentModal
          show={showResubmitModal}
          onClose={() => setShowResubmitModal(false)}
          documentId={document.id}
          initialRecipientId={
            document.remarks && document.remarks.length > 0
              ? document.remarks[0].authorId
              : undefined
          }
          forceRecipientLock={true}
        />
      )}

      {showReviewModal && (
        <ReviewDocumentModal
          show={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          documentId={document.id}
        />
      )}
    </div>
  );
};
