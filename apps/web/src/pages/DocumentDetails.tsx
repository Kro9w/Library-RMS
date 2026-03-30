// apps/web/src/pages/DocumentDetails.tsx
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { trpc } from "../trpc";
import { AlertModal } from "../components/AlertModal";
import { ConfirmModal } from "../components/ConfirmModal";
import "./DocumentDetails.css";

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

const getDepartmentAcronym = (name: string | null | undefined): string => {
  if (!name) return "N/A";
  const stopWords = ["of", "the", "for", "and"];
  return name
    .split(" ")
    .filter((word) => !stopWords.includes(word.toLowerCase()))
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
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
import RolePill from "../components/Roles/RolePill";
import { format } from "date-fns";

export const DocumentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
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

  const [alertConfig, setAlertConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({ show: false, title: "", message: "" });
  const [confirmConfig, setConfirmConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isConfirming?: boolean;
  }>({ show: false, title: "", message: "", onConfirm: () => {} });

  const { data: urlData, isLoading: isLoadingUrl } =
    trpc.documents.getSignedDocumentUrl.useQuery(
      { documentId: id! },
      {
        enabled: !!id,
        staleTime: 1000 * 60 * 4, // Cache URL for 4 minutes
        refetchOnWindowFocus: false,
      },
    );

  const { data: distributions } =
    trpc.documents.getDocumentDistributions.useQuery(
      { documentId: id! },
      { enabled: !!id },
    );

  if (isLoadingDoc || isLoadingUrl) {
    return null;
  }

  if (!document || !urlData) {
    return <div className="container mt-4">Document not found.</div>;
  }

  // This function is type-safe and correct
  // Calculate Review permissions logic
  const isTransit =
    document.classification === "FOR_APPROVAL" &&
    document.recordStatus === "IN_TRANSIT";

  const currentTransitStop = isTransit
    ? document.transitRoutes?.find((r: any) => r.status === "CURRENT")
    : null;

  const isCurrentTransitOffice =
    currentTransitStop &&
    user?.departmentId === currentTransitStop.departmentId;

  const hasTransitReviewAccess =
    isCurrentTransitOffice && user?.roles?.some((r: any) => r.level === 1);

  const hasReviewTag = document.tags?.some(
    (t: any) => (t.tag?.name || t.name) === "for review",
  );

  const canReview =
    (canManageDocuments && hasReviewTag) || hasTransitReviewAccess;

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
        <div>
          <h2 className="mb-2 d-flex align-items-center flex-wrap gap-2">
            {document.title}
            <ClassificationBadge
              classification={document.classification as ClassificationType}
            />
          </h2>
          {distributions &&
            distributions.some(
              (d: any) => d.recipientId === user?.id && d.status === "RECEIVED",
            ) &&
            (() => {
              const myDist = distributions.find(
                (d: any) =>
                  d.recipientId === user?.id && d.status === "RECEIVED",
              );
              return (
                <p
                  className="mb-0 text-muted d-flex align-items-center gap-2"
                  style={{ fontSize: "0.85rem" }}
                >
                  <i className="bi bi-file-earmark-arrow-down text-primary"></i>
                  <span>
                    Received from{" "}
                    <strong>
                      {myDist?.sender.firstName} {myDist?.sender.lastName}
                    </strong>{" "}
                    {myDist?.sender.department?.name
                      ? `(${myDist.sender.department.name})`
                      : ""}{" "}
                    on{" "}
                    {myDist?.receivedAt
                      ? format(
                          new Date(myDist?.receivedAt as string),
                          "MMM d, yyyy h:mm a",
                        )
                      : "N/A"}
                    .
                  </span>
                </p>
              );
            })()}
        </div>
      </div>

      <div className="document-details-container">
        <div className="document-viewer">
          {previewUrl ? (
            <iframe
              src={previewUrl}
              className="pdf-preview-iframe"
              title={document.title}
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
                {canReview && (
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => setShowReviewModal(true)}
                  >
                    <i className="bi bi-eye me-2"></i>
                    Review Document
                  </button>
                )}
                {canManageDocuments && (
                  <button
                    className={`btn ${document.isUnderLegalHold ? "btn-outline-danger" : "btn-outline-dark"}`}
                    onClick={() => {
                      if (document.isUnderLegalHold) {
                        setConfirmConfig({
                          show: true,
                          title: "Remove Legal Hold",
                          message:
                            "Are you sure you want to remove the legal hold?",
                          onConfirm: () => {
                            removeLegalHoldMutation.mutate({
                              documentId: document.id,
                            });
                            setConfirmConfig((prev: typeof confirmConfig) => ({
                              ...prev,
                              show: false,
                            }));
                          },
                        });
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
                      <div className="disposition-block disposition-ready">
                        <div className="disposition-header">
                          <i className="bi bi-clock-history disposition-icon"></i>
                          <h6 className="disposition-title">
                            Disposition Ready
                          </h6>
                        </div>
                        <p className="disposition-text">
                          This document has reached its retention limit.
                          <br />
                          Action:{" "}
                          <strong>{document.dispositionActionSnapshot}</strong>
                        </p>
                        <button
                          className="btn btn-outline-secondary w-100 disposition-btn"
                          onClick={() => {
                            setConfirmConfig({
                              show: true,
                              title: "Request Disposition",
                              message:
                                "Request approval to execute disposition?",
                              onConfirm: () => {
                                requestDispositionMutation.mutate({
                                  documentId: document.id,
                                });
                                setConfirmConfig(
                                  (prev: typeof confirmConfig) => ({
                                    ...prev,
                                    show: false,
                                  }),
                                );
                              },
                            });
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
                      <div className="disposition-block disposition-pending">
                        <div className="disposition-header">
                          <i className="bi bi-hourglass-split disposition-icon text-primary"></i>
                          <h6 className="disposition-title">
                            Disposition Pending Approval
                          </h6>
                        </div>
                        <p className="disposition-text">
                          A request to{" "}
                          <strong>{document.dispositionActionSnapshot}</strong>{" "}
                          this document is pending.
                        </p>

                        {user?.id === document.dispositionRequesterId ? (
                          <button
                            className="btn btn-outline-secondary w-100 disposition-btn"
                            onClick={() => {
                              setConfirmConfig({
                                show: true,
                                title: "Cancel Disposition Request",
                                message: "Cancel disposition request?",
                                onConfirm: () => {
                                  rejectDispositionMutation.mutate({
                                    documentId: document.id,
                                  });
                                  setConfirmConfig(
                                    (prev: typeof confirmConfig) => ({
                                      ...prev,
                                      show: false,
                                    }),
                                  );
                                },
                              });
                            }}
                            disabled={rejectDispositionMutation.isPending}
                          >
                            Cancel Request
                          </button>
                        ) : (
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-outline-primary flex-grow-1 disposition-btn"
                              onClick={() => {
                                setConfirmConfig({
                                  show: true,
                                  title: "Execute Disposition",
                                  message:
                                    "Approve and execute disposition? This action is irreversible.",
                                  onConfirm: () => {
                                    approveDispositionMutation.mutate({
                                      documentId: document.id,
                                    });
                                    setConfirmConfig(
                                      (prev: typeof confirmConfig) => ({
                                        ...prev,
                                        show: false,
                                      }),
                                    );
                                  },
                                });
                              }}
                              disabled={approveDispositionMutation.isPending}
                            >
                              {approveDispositionMutation.isPending
                                ? "Executing..."
                                : "Approve & Execute"}
                            </button>
                            <button
                              className="btn btn-outline-danger flex-grow-1 disposition-btn"
                              onClick={() => {
                                setConfirmConfig({
                                  show: true,
                                  title: "Reject Disposition",
                                  message: "Reject disposition request?",
                                  onConfirm: () => {
                                    rejectDispositionMutation.mutate({
                                      documentId: document.id,
                                    });
                                    setConfirmConfig(
                                      (prev: typeof confirmConfig) => ({
                                        ...prev,
                                        show: false,
                                      }),
                                    );
                                  },
                                });
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
        </div>
      </div>

      {/* Unified Review Details Section (Full Width, Above Distributions) */}
      {(document.status ||
        (document.transitRoutes && document.transitRoutes.length > 0) ||
        (document.remarks && document.remarks.length > 0)) && (
        <div className="document-table-card mt-4 mb-4">
          <div className="card-body">
            <h5 className="card-title d-flex justify-content-between align-items-center">
              <div>
                <i className="bi bi-clipboard-check me-2"></i>
                Review Details
              </div>
              <div>
                <span className="text-muted fw-bold me-2 fs-6">Status:</span>
                <span
                  className={`badge ${
                    document.status === "Approved" ||
                    document.status === "Endorsed"
                      ? "bg-success"
                      : document.status ===
                          "Returned for Corrections/Revision/Clarification"
                        ? "bg-warning text-dark"
                        : document.status === "Disapproved"
                          ? "bg-danger"
                          : "bg-secondary"
                  }`}
                  style={{ fontSize: "0.85rem", padding: "0.5em 0.8em" }}
                >
                  {document.status
                    ? document.status.toUpperCase()
                    : "IN PROGRESS"}
                </span>
              </div>
            </h5>
            <hr />

            {/* A. Horizontal Routing Progress visualization */}
            {document.transitRoutes && document.transitRoutes.length > 0 && (
              <div className="mb-5 mt-4">
                <span className="text-muted fw-bold d-block mb-3 fs-6">
                  Routing Progress
                </span>
                <div
                  className="d-flex align-items-center justify-content-center flex-wrap w-100"
                  style={{ rowGap: "1rem" }}
                >
                  {document.transitRoutes.map((route: any, index: number) => {
                    let badgeClass = "bg-secondary text-light";
                    let iconClass = "bi-circle";
                    if (route.status === "APPROVED") {
                      badgeClass = "bg-success text-light";
                      iconClass = "bi-check-circle-fill";
                    } else if (route.status === "CURRENT") {
                      badgeClass = "bg-primary text-light";
                      iconClass = "bi-record-circle-fill";
                    } else if (route.status === "REJECTED") {
                      badgeClass = "bg-danger text-light";
                      iconClass = "bi-x-circle-fill";
                    }

                    return (
                      <React.Fragment key={route.id}>
                        <div
                          className="d-flex flex-column align-items-center"
                          style={{ maxWidth: "120px", textAlign: "center" }}
                        >
                          <div
                            className={`badge ${badgeClass} rounded-pill p-2 mb-1 shadow-sm`}
                          >
                            <i className={`bi ${iconClass} fs-5`}></i>
                          </div>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight:
                                route.status === "CURRENT" ? "bold" : "normal",
                            }}
                          >
                            {route.department?.name || "Unknown Office"}
                          </span>
                        </div>
                        {index < document.transitRoutes.length - 1 && (
                          <div
                            className="flex-grow-1 mx-3"
                            style={{
                              height: "2px",
                              backgroundColor:
                                route.status === "APPROVED"
                                  ? "var(--bs-success)"
                                  : "var(--bs-gray-300)",
                              minWidth: "40px",
                            }}
                          ></div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}

            {/* B. Review History Table */}
            {document.remarks && document.remarks.length > 0 && (
              <>
                <div className="table-responsive mt-3">
                  <table className="table table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Reviewer</th>
                        <th>Date & Time</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {document.remarks.map((remark: any) => (
                        <tr key={remark.id}>
                          <td>
                            <strong>{formatUserName(remark.author)}</strong>
                            <div
                              className="text-muted mt-1 d-flex flex-wrap align-items-center gap-1"
                              style={{ fontSize: "0.8rem" }}
                            >
                              {remark.author.roles &&
                              remark.author.roles.length > 0 ? (
                                remark.author.roles.map((r: any) => (
                                  <RolePill
                                    key={r.id || r.name}
                                    roleName={r.name}
                                  />
                                ))
                              ) : (
                                <span className="badge bg-secondary">User</span>
                              )}
                              {remark.author.department?.name && (
                                <span
                                  className="ms-1 border-start ps-2 border-secondary fw-bold"
                                  title={remark.author.department.name}
                                >
                                  {getDepartmentAcronym(
                                    remark.author.department.name,
                                  )}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            <div>
                              {new Date(remark.createdAt).toLocaleDateString()}
                            </div>
                            <small className="text-muted">
                              {new Date(remark.createdAt).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </small>
                          </td>
                          <td>
                            <div
                              className="p-2 bg-light rounded border"
                              style={{
                                fontSize: "0.9rem",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {remark.message}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Resubmit Action for the Sender */}
            {document.status ===
              "Returned for Corrections/Revision/Clarification" &&
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

      {/* Distributions Section */}
      {(user?.id === document.uploadedById ||
        user?.id === document.originalSenderId ||
        canManageDocuments) &&
        distributions &&
        distributions.length > 0 && (
          <div className="document-table-card mt-4 mb-4">
            <div className="card-body">
              <h5 className="card-title d-flex align-items-center">
                <i className="bi bi-send-check me-2"></i>
                Distributions
              </h5>
              <hr />
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Recipient</th>
                      <th>Office / Department</th>
                      <th>Status</th>
                      <th>Date Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributions.map((dist: any) => (
                      <tr key={dist.id}>
                        <td>
                          <strong>
                            {dist.recipient.firstName} {dist.recipient.lastName}
                          </strong>
                        </td>
                        <td>{dist.recipient.department?.name || "N/A"}</td>
                        <td>
                          <span
                            className={`badge ${dist.status === "RECEIVED" ? "bg-success" : "bg-warning text-dark"}`}
                          >
                            {dist.status}
                          </span>
                        </td>
                        <td>
                          {dist.receivedAt ? (
                            format(
                              new Date(dist.receivedAt as string),
                              "MMM d, yyyy h:mm a",
                            )
                          ) : (
                            <span className="text-muted fst-italic">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

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
                              setAlertConfig({
                                show: true,
                                title: "Error",
                                message:
                                  "Could not retrieve document version URL.",
                              });
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

      <AlertModal
        show={alertConfig.show}
        title={alertConfig.title}
        onClose={() => setAlertConfig({ ...alertConfig, show: false })}
      >
        {alertConfig.message}
      </AlertModal>

      <ConfirmModal
        show={confirmConfig.show}
        title={confirmConfig.title}
        onConfirm={confirmConfig.onConfirm}
        onClose={() => setConfirmConfig({ ...confirmConfig, show: false })}
        isConfirming={confirmConfig.isConfirming}
      >
        <p>{confirmConfig.message}</p>
      </ConfirmModal>
    </div>
  );
};
