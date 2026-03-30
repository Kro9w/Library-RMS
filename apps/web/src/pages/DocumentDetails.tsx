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
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "office",
  "application/msword": "office",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "office",
  "application/vnd.ms-excel": "office",
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
        const simpleType = fileType.split("/")[1];
        if (simpleType) return simpleType.toUpperCase();
      }
    }
  }
  const extension = title.split(".").pop();
  return extension ? extension.toUpperCase() : "N/A";
};

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
      { enabled: !!id, staleTime: 1000 * 60 * 4, refetchOnWindowFocus: false },
    );

  const { data: distributions } =
    trpc.documents.getDocumentDistributions.useQuery(
      { documentId: id! },
      { enabled: !!id },
    );

  if (isLoadingDoc || isLoadingUrl) return null;
  if (!document || !urlData) {
    return <div className="container mt-4">Document not found.</div>;
  }

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
      } else if (title.match(/\.(docx?|xlsx?|pptx?)$/)) {
        previewType = "office";
      }
    }
    if (previewType === "pdf") return urlData.signedUrl;
    if (previewType === "office") {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(urlData.signedUrl)}`;
    }
    return null;
  };

  const previewUrl = getPreviewDetails(document);

  // Helper: get step class/icon for transit routes
  const getStepProps = (status: string) => {
    switch (status) {
      case "APPROVED":
        return {
          className: "routing-step-approved",
          icon: "bi-check-circle-fill",
        };
      case "CURRENT":
        return {
          className: "routing-step-current",
          icon: "bi-record-circle-fill",
        };
      case "REJECTED":
        return { className: "routing-step-rejected", icon: "bi-x-circle-fill" };
      default:
        return { className: "routing-step-pending", icon: "bi-circle" };
    }
  };

  return (
    <div className="container mt-4">
      {/* Legal hold banner */}
      {document.isUnderLegalHold && (
        <div className="legal-hold-banner" role="alert">
          <i className="bi bi-shield-lock-fill"></i>
          <div>
            <h5>Document is under Legal Hold</h5>
            <p>{document.legalHoldReason || "No reason provided."}</p>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="page-header">
        <div>
          <h2 className="mb-2 d-flex align-items-center flex-wrap gap-2">
            {document.title}
            <ClassificationBadge
              classification={document.classification as ClassificationType}
            />
          </h2>

          {/* Received-from note */}
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
                          new Date(myDist.receivedAt as string),
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

      {/* Two-column layout */}
      <div className="document-details-container">
        {/* Left: document viewer */}
        <div className="document-viewer">
          {previewUrl ? (
            <iframe
              src={previewUrl}
              className="pdf-preview-iframe"
              title={document.title}
            />
          ) : (
            <div className="preview-fallback">
              <i className="bi bi-file-earmark-lock"></i>
              <p>Cannot preview this file type.</p>
              <p className="text-muted" style={{ fontSize: "12px" }}>
                Download the file to view it.
              </p>
            </div>
          )}
        </div>

        {/* Right: metadata sidebar */}
        <div className="document-metadata">
          <div className="document-table-card">
            <div className="card-body">
              <h4 className="card-title">
                <i className="bi bi-info-circle"></i>
                Details
              </h4>
              <hr style={{ margin: "0 0 12px" }} />

              <div className="detail-row">
                <strong>Location</strong>
                <span>
                  {document.uploadedBy.department?.campus?.name} /{" "}
                  {document.uploadedBy.department?.name}
                </span>
              </div>
              <div className="detail-row">
                <strong>Owner</strong>
                <span>{formatUserName(document.uploadedBy)}</span>
              </div>
              <div className="detail-row">
                <strong>Created</strong>
                <span>{new Date(document.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="detail-row">
                <strong>Status</strong>
                <span
                  className={`badge ${
                    document.recordStatus === "FINAL"
                      ? "bg-success"
                      : "bg-warning text-dark"
                  }`}
                >
                  {document.recordStatus}
                </span>
              </div>

              {document.isCheckedOut && (
                <div className="detail-row">
                  <strong>Checked Out</strong>
                  <span className="text-danger" style={{ fontSize: "13px" }}>
                    <i className="bi bi-lock-fill me-1"></i>
                    {document.checkedOutBy
                      ? formatUserName(document.checkedOutBy)
                      : "Unknown User"}
                  </span>
                </div>
              )}

              <div className="detail-row">
                <strong>File Type</strong>
                <span>
                  {formatFileTypeDisplay(document.fileType, document.title)}
                </span>
              </div>

              {/* Action buttons */}
              <div className="doc-actions-stack mt-3">
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
                    className={`btn ${
                      document.isUnderLegalHold
                        ? "btn-outline-danger"
                        : "btn-outline-dark"
                    }`}
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

              {/* Lifecycle */}
              <hr style={{ margin: "16px 0 12px" }} />
              <div
                className="detail-row"
                style={{ border: "none", padding: "0" }}
              >
                <strong>Lifecycle</strong>
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
              </div>

              {/* Disposition blocks */}
              {canManageDocuments && !document.isUnderLegalHold && (
                <>
                  {document.lifecycleStatus === "Ready" && (
                    <div className="disposition-block disposition-ready mt-3">
                      <div className="disposition-header">
                        <i className="bi bi-clock-history disposition-icon"></i>
                        <h6 className="disposition-title">Disposition Ready</h6>
                      </div>
                      <p className="disposition-text">
                        Retention period elapsed. Action:{" "}
                        <strong>{document.dispositionActionSnapshot}</strong>
                      </p>
                      <button
                        className="btn btn-outline-secondary w-100 disposition-btn"
                        onClick={() => {
                          setConfirmConfig({
                            show: true,
                            title: "Request Disposition",
                            message: "Request approval to execute disposition?",
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
                          ? "Requesting…"
                          : "Request Disposition Approval"}
                      </button>
                    </div>
                  )}

                  {document.dispositionStatus === "PENDING_DISPOSITION" && (
                    <div className="disposition-block disposition-pending mt-3">
                      <div className="disposition-header">
                        <i className="bi bi-hourglass-split disposition-icon"></i>
                        <h6 className="disposition-title">Pending Approval</h6>
                      </div>
                      <p className="disposition-text">
                        <strong>{document.dispositionActionSnapshot}</strong>{" "}
                        disposition request is awaiting approval.
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
                                  "Approve and execute? This is irreversible.",
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
                              ? "Executing…"
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
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Review Details (full-width) ── */}
      {(document.status ||
        (document.transitRoutes && document.transitRoutes.length > 0) ||
        (document.remarks && document.remarks.length > 0)) && (
        <div className="document-table-card mt-4 mb-4">
          <div className="card-body">
            {/* Section header */}
            <div className="review-section-header">
              <h5 className="card-title mb-0">
                <i className="bi bi-clipboard-check"></i>
                Review Details
              </h5>
              <div className="review-section-status">
                <span className="review-status-label">Status</span>
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
                  style={{ fontSize: "11px", padding: "4px 10px" }}
                >
                  {document.status
                    ? document.status.toUpperCase()
                    : "IN PROGRESS"}
                </span>
              </div>
            </div>

            <hr style={{ margin: "0 0 20px" }} />

            {/* Routing progress */}
            {document.transitRoutes && document.transitRoutes.length > 0 && (
              <div className="routing-progress-wrap">
                <p className="routing-progress-label">
                  <i className="bi bi-signpost-split"></i>
                  Approval Route
                </p>
                <div className="routing-steps">
                  {document.transitRoutes.map((route: any, index: number) => {
                    const { className, icon } = getStepProps(route.status);
                    return (
                      <React.Fragment key={route.id}>
                        <div className={`routing-step ${className}`}>
                          <div className="routing-step-icon">
                            <i className={`bi ${icon}`}></i>
                          </div>
                          <span className="routing-step-name">
                            {route.department?.name || "Unknown Office"}
                          </span>
                        </div>
                        {index < document.transitRoutes.length - 1 && (
                          <div
                            className={`routing-connector ${
                              route.status === "APPROVED"
                                ? "routing-connector-done"
                                : ""
                            }`}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Review history table */}
            {document.remarks && document.remarks.length > 0 && (
              <div className="table-responsive mt-2">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Reviewer</th>
                      <th>Date &amp; Time</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {document.remarks.map((remark: any) => (
                      <tr key={remark.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="reviewer-avatar">
                              {remark.author?.firstName?.charAt(0) || "?"}
                            </div>
                            <div>
                              <p
                                className="mb-0 fw-semibold"
                                style={{ fontSize: "13px" }}
                              >
                                {formatUserName(remark.author)}
                              </p>
                              <div
                                className="d-flex flex-wrap align-items-center gap-1 mt-1"
                                style={{ fontSize: "11px" }}
                              >
                                {remark.author.roles?.map((r: any) => (
                                  <RolePill
                                    key={r.id || r.name}
                                    roleName={r.name}
                                  />
                                ))}
                                {remark.author.department?.name && (
                                  <span
                                    className="text-muted ms-1 border-start ps-2"
                                    title={remark.author.department.name}
                                    style={{ fontSize: "11px" }}
                                  >
                                    {getDepartmentAcronym(
                                      remark.author.department.name,
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <p className="mb-0" style={{ fontSize: "13px" }}>
                            {new Date(remark.createdAt).toLocaleDateString()}
                          </p>
                          <p
                            className="mb-0 text-muted"
                            style={{ fontSize: "11px" }}
                          >
                            {new Date(remark.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </td>
                        <td>
                          <p className="review-history-remark mb-0">
                            {remark.message}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Resubmit action */}
            {document.status ===
              "Returned for Corrections/Revision/Clarification" &&
              (document.uploadedById === user?.id ||
                document.originalSenderId === user?.id) && (
                <div className="d-flex justify-content-end mt-4">
                  <button
                    className="btn btn-outline-primary"
                    style={{ fontSize: "13px", padding: "6px 14px" }}
                    onClick={() => setShowResubmitModal(true)}
                  >
                    <i className="bi bi-arrow-repeat me-1"></i>
                    Resubmit for Review
                  </button>
                </div>
              )}
          </div>
        </div>
      )}

      {/* ── Distributions ── */}
      {(user?.id === document.uploadedById ||
        user?.id === document.originalSenderId ||
        canManageDocuments) &&
        distributions &&
        distributions.length > 0 && (
          <div className="document-table-card mt-4 mb-4">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-send-check"></i>
                Distributions
              </h5>
              <hr style={{ margin: "0 0 16px" }} />
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
                          <strong style={{ fontSize: "13px" }}>
                            {dist.recipient.firstName} {dist.recipient.lastName}
                          </strong>
                        </td>
                        <td style={{ fontSize: "13px" }}>
                          {dist.recipient.department?.name || "N/A"}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              dist.status === "RECEIVED"
                                ? "bg-success"
                                : "bg-warning text-dark"
                            }`}
                          >
                            {dist.status}
                          </span>
                        </td>
                        <td style={{ fontSize: "13px" }}>
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

      {/* ── Version History ── */}
      <div className="document-table-card mt-4 mb-4">
        <div className="card-body">
          <h5 className="card-title">
            <i className="bi bi-clock-history"></i>
            Version History
          </h5>
          <hr style={{ margin: "0 0 16px" }} />
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
                  {document.versions.map((v: any) => (
                    <tr key={v.id}>
                      <td>
                        <span className="version-badge">
                          v{v.versionNumber}
                        </span>
                      </td>
                      <td style={{ fontSize: "13px" }}>
                        {new Date(v.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ fontSize: "13px" }}>
                        {formatUserName(v.uploadedBy)}
                      </td>
                      <td style={{ fontSize: "13px" }}>
                        {formatFileTypeDisplay(v.fileType, "File")}
                      </td>
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
                            } catch {
                              setAlertConfig({
                                show: true,
                                title: "Error",
                                message:
                                  "Could not retrieve document version URL.",
                              });
                            }
                          }}
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
            <p className="text-muted mb-0" style={{ fontSize: "13px" }}>
              No version history available.
            </p>
          )}
        </div>
      </div>

      {/* Modals */}
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
