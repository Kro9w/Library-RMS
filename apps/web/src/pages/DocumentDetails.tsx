import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { trpc } from "../trpc";
import { AlertModal } from "../components/AlertModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { LegalHoldModal } from "../components/LegalHoldModal";
import "./DocumentDetails.css";

import { formatUserName } from "../utils/user";
import { CategoryBadge, CategoryType } from "../components/CategoryBadge";

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

import { ForwardDocumentModal } from "../components/ForwardDocumentModal";
import { ReviewDocumentModal } from "../components/ReviewDocumentModal";
import { CheckOutModal } from "../components/CheckOutModal";
import { CheckInModal } from "../components/CheckInModal";
import { usePermissions } from "../hooks/usePermissions";
import { format } from "date-fns";
import { DistributionHistoryTable } from "../components/DocumentDetails/DistributionHistoryTable";
import { VersionHistoryTable } from "../components/DocumentDetails/VersionHistoryTable";
import { ReviewDetailsTable } from "../components/DocumentDetails/ReviewDetailsTable";

export const DocumentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [showResubmitModal, setShowResubmitModal] = React.useState(false);
  const [showReviewModal, setShowReviewModal] = React.useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = React.useState(false);
  const [showCheckInModal, setShowCheckInModal] = React.useState(false);
  const [showLegalHoldModal, setShowLegalHoldModal] = useState(false);

  const { data: user } = trpc.user.getMe.useQuery();
  const { canManageDocuments, canManageInstitution, highestRoleLevel } =
    usePermissions();
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
    document.category === "FOR_APPROVAL" &&
    document.workflow?.recordStatus === "IN_TRANSIT";

  const currentTransitStop = isTransit
    ? document.transitRoutes?.find((r: any) => r.status === "CURRENT")
    : null;

  const isCurrentTransitOffice =
    currentTransitStop &&
    user?.departmentId === currentTransitStop.departmentId;

  const hasTransitReviewAccess =
    isCurrentTransitOffice && user?.roles?.some((r: any) => r.level === 1);

  const isReturnedOrDisapproved =
    document.workflow?.status ===
      "Returned for Corrections/Revision/Clarification" ||
    document.workflow?.status === "Disapproved";
  const isOriginator =
    user?.id === document.uploadedById ||
    user?.id === document.originalSenderId;

  const hasBeenSent = distributions && distributions.length > 0;

  const isReviewDocument =
    document.workflow?.recordStatus === "IN_TRANSIT" &&
    document.category === "FOR_APPROVAL";

  const canReview =
    ((isCurrentTransitOffice && canManageDocuments && isReviewDocument) ||
      hasTransitReviewAccess) &&
    !isReturnedOrDisapproved &&
    !isOriginator;

  const canSendOrResubmit =
    (isOriginator || canManageInstitution) && !canReview;
  const isSendDisabled =
    document.workflow?.isCheckedOut ||
    (hasBeenSent && !isReturnedOrDisapproved);

  const canBroadcastDocument = (() => {
    if (
      document.category === "FOR_APPROVAL" ||
      document.workflow?.recordStatus === "IN_TRANSIT"
    ) {
      return false; // Routed/In-transit documents cannot be broadcast directly
    }
    if (
      document.category === "RESTRICTED" ||
      document.category === "EXTERNAL"
    ) {
      return isOriginator || canManageInstitution;
    }
    if (
      document.category === "INSTITUTIONAL" ||
      document.category === "INTERNAL"
    ) {
      return isOriginator || canManageInstitution || highestRoleLevel <= 1;
    }
    if (document.category === "DEPARTMENTAL") {
      return isOriginator || canManageDocuments || highestRoleLevel <= 2;
    }
    return false;
  })();

  const getLocation = () => {
    if (document.lifecycle?.dispositionStatus === "ARCHIVED") {
      return `Archived by ${document.uploadedBy.department?.name}`;
    }
    if (currentTransitStop?.department) {
      return `${currentTransitStop.department.campus?.name ?? document.uploadedBy.department?.campus?.name} / ${currentTransitStop.department.name}`;
    }
    return `${document.uploadedBy.department?.campus?.name} / ${document.uploadedBy.department?.name}`;
  };

  const getPreviewDetails = (doc: Document) => {
    if (!urlData?.signedUrl) return null;

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

  return (
    <div className="container mt-4">
      {/* Legal hold banner */}
      {document.lifecycle?.isUnderLegalHold && (
        <div className="legal-hold-banner" role="alert">
          <i className="bi bi-shield-lock-fill"></i>
          <div>
            <h5>Document is under Legal Hold</h5>
            <p>
              {document.lifecycle?.legalHoldReason || "No reason provided."}
            </p>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="page-header">
        <div>
          <h2 className="mb-2 d-flex align-items-center flex-wrap gap-2">
            {document.title}
            <CategoryBadge category={document.category as CategoryType} />
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
          {document.lifecycle?.dispositionStatus === "DESTROYED" ? (
            <div className="preview-fallback">
              <i className="bi bi-trash3-fill" style={{ fontSize: "48px" }}></i>
              <h4 className="fw-bold">Document Destroyed</h4>
              <p className="text-dark w-75 mt-2" style={{ fontSize: "14px" }}>
                The physical contents of this document have been permanently
                destroyed from storage in accordance with its retention schedule
                and disposition policy. Only this metadata tombstone remains for
                auditing compliance.
              </p>
            </div>
          ) : previewUrl ? (
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
                <span>{getLocation()}</span>
              </div>
              <div className="detail-row">
                <strong>Uploaded by</strong>
                <span>{formatUserName(document.uploadedBy)}</span>
              </div>
              <div className="detail-row">
                <strong>Created</strong>
                <span>{new Date(document.createdAt).toLocaleDateString()}</span>
              </div>
              {document.documentType?.recordsSeries && (
                <div className="detail-row">
                  <strong>Series</strong>
                  <span>
                    {(document.documentType.recordsSeries as any).name}
                  </span>
                </div>
              )}
              <div className="detail-row">
                <strong>Status</strong>
                <span
                  className={`badge ${
                    document.workflow?.recordStatus === "FINAL"
                      ? "bg-success"
                      : "bg-warning text-dark"
                  }`}
                >
                  {document.workflow?.recordStatus}
                </span>
              </div>

              {/* Checked-out indicator */}
              {document.workflow?.isCheckedOut && (
                <div className="checked-out-indicator">
                  <i className="bi bi-lock-fill"></i>
                  <span>
                    Checked out by{" "}
                    <strong>
                      {document.workflow?.checkedOutBy
                        ? formatUserName(document.workflow?.checkedOutBy)
                        : "Unknown User"}
                    </strong>
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div className="doc-actions-stack mt-3">
                {document.lifecycle?.dispositionStatus !== "DESTROYED" &&
                  document.lifecycle?.dispositionStatus !== "ARCHIVED" && (
                    <>
                      {canReview && (
                        <button
                          className="doc-action-btn doc-action-btn-primary"
                          onClick={() => setShowReviewModal(true)}
                        >
                          <i className="bi bi-eye"></i>
                          Review Document
                        </button>
                      )}

                      {canBroadcastDocument &&
                        !document.workflow?.isCheckedOut && (
                          <button
                            className="doc-action-btn doc-action-btn-primary"
                            onClick={() =>
                              (window.location.href = `/documents/${document.id}/send`)
                            }
                          >
                            <i className="bi bi-send-fill"></i>
                            Send Document
                          </button>
                        )}

                      {canSendOrResubmit &&
                        document.category === "FOR_APPROVAL" && (
                          <button
                            className={`doc-action-btn ${!isSendDisabled ? "doc-action-btn-primary" : ""}`}
                            onClick={() => setShowResubmitModal(true)}
                            disabled={isSendDisabled}
                            title={
                              document.workflow?.isCheckedOut
                                ? "Check in the document first before forwarding."
                                : isSendDisabled
                                  ? "Document is currently in transit."
                                  : ""
                            }
                          >
                            <i
                              className={`bi ${isReturnedOrDisapproved ? "bi-arrow-repeat" : "bi-forward-fill"}`}
                            ></i>
                            {isReturnedOrDisapproved
                              ? "Resubmit for Review"
                              : "Forward Document"}
                          </button>
                        )}

                      {urlData?.signedUrl && (
                        <a
                          href={urlData.signedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="doc-action-btn doc-action-btn-download"
                        >
                          <i className="bi bi-download"></i>
                          Download
                        </a>
                      )}
                    </>
                  )}

                {document.lifecycle?.dispositionStatus !== "DESTROYED" &&
                  document.lifecycle?.dispositionStatus !== "ARCHIVED" &&
                  document.workflow?.recordStatus !== "FINAL" &&
                  !document.workflow?.isCheckedOut &&
                  (isReturnedOrDisapproved
                    ? isOriginator || canManageDocuments
                    : isOriginator ||
                      canManageInstitution ||
                      isCurrentTransitOffice) && (
                    <button
                      className="doc-action-btn"
                      onClick={() => setShowCheckOutModal(true)}
                    >
                      <i className="bi bi-cloud-arrow-down"></i>
                      Check Out
                    </button>
                  )}

                {document.lifecycle?.dispositionStatus !== "DESTROYED" &&
                  document.lifecycle?.dispositionStatus !== "ARCHIVED" &&
                  document.workflow?.isCheckedOut &&
                  (document.workflow?.checkedOutById === user?.id ||
                    document.workflow?.checkedOutBy?.id === user?.id) && (
                    <button
                      className="doc-action-btn"
                      onClick={() => setShowCheckInModal(true)}
                    >
                      <i className="bi bi-cloud-arrow-up"></i>
                      Check In
                    </button>
                  )}

                {document.lifecycle?.dispositionStatus !== "DESTROYED" &&
                  document.lifecycle?.dispositionStatus !== "ARCHIVED" &&
                  canManageDocuments && (
                    <button
                      className={`doc-action-btn ${document.lifecycle?.isUnderLegalHold ? "doc-action-btn-danger" : ""}`}
                      onClick={() => {
                        if (document.lifecycle?.isUnderLegalHold) {
                          setConfirmConfig({
                            show: true,
                            title: "Remove Legal Hold",
                            message:
                              "Are you sure you want to remove the legal hold?",
                            onConfirm: () => {
                              removeLegalHoldMutation.mutate({
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
                        } else {
                          setShowLegalHoldModal(true);
                        }
                      }}
                      disabled={
                        applyLegalHoldMutation.isPending ||
                        removeLegalHoldMutation.isPending
                      }
                    >
                      <i className="bi bi-shield-lock" />
                      {document.lifecycle?.isUnderLegalHold
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
              {canManageDocuments &&
                !document.lifecycle?.isUnderLegalHold &&
                document.workflow?.recordStatus === "FINAL" &&
                (isOriginator || canManageInstitution) && (
                  <>
                    {document.lifecycleStatus === "Ready" &&
                      document.lifecycle?.dispositionStatus !==
                        "PENDING_DISPOSITION" && (
                        <div className="disposition-block disposition-ready mt-3">
                          <div className="disposition-block-header">
                            <div className="disposition-block-icon">
                              <i className="bi bi-clock-history" />
                            </div>
                            <h6 className="disposition-block-title">
                              Ready for Disposition
                            </h6>
                          </div>
                          <div className="disposition-block-body">
                            <p className="disposition-block-desc">
                              Retention period elapsed. Scheduled action:{" "}
                              <strong>
                                {document.lifecycle?.dispositionActionSnapshot}
                              </strong>
                            </p>
                            <div className="disposition-block-actions">
                              {canManageInstitution ||
                              (canManageDocuments && highestRoleLevel <= 1) ? (
                                <button
                                  className="disposition-action-btn btn-approve"
                                  disabled={true}
                                  title="Must be requested first"
                                >
                                  <i className="bi bi-lightning-charge" />
                                  Execute Directly
                                </button>
                              ) : (
                                <button
                                  className="disposition-action-btn"
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
                                  disabled={
                                    requestDispositionMutation.isPending
                                  }
                                >
                                  <i className="bi bi-send" />
                                  {requestDispositionMutation.isPending
                                    ? "Requesting…"
                                    : "Request Approval"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                    {document.lifecycle?.dispositionStatus ===
                      "PENDING_DISPOSITION" && (
                      <div className="disposition-block disposition-pending mt-3">
                        <div className="disposition-block-header">
                          <div className="disposition-block-icon">
                            <i className="bi bi-hourglass-split" />
                          </div>
                          <h6 className="disposition-block-title">
                            Pending Approval
                          </h6>
                        </div>
                        <div className="disposition-block-body">
                          <p className="disposition-block-desc">
                            <strong>
                              {document.lifecycle?.dispositionActionSnapshot}
                            </strong>{" "}
                            disposition request is awaiting a second approver.
                          </p>
                          <div className="disposition-block-actions">
                            {user?.id ===
                            document.lifecycle?.dispositionRequesterId ? (
                              <button
                                className="disposition-action-btn"
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
                                <i className="bi bi-x-circle" />
                                Cancel Request
                              </button>
                            ) : (
                              <>
                                <button
                                  className="disposition-action-btn btn-approve"
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
                                  disabled={
                                    approveDispositionMutation.isPending
                                  }
                                >
                                  <i className="bi bi-check-circle" />
                                  {approveDispositionMutation.isPending
                                    ? "Executing…"
                                    : "Approve & Execute"}
                                </button>
                                <button
                                  className="disposition-action-btn btn-reject"
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
                                  <i className="bi bi-x-circle" />
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

              {/* Disposition Certificate */}
              {(document.lifecycle?.dispositionStatus === "DESTROYED" ||
                document.lifecycle?.dispositionStatus === "ARCHIVED") &&
                (() => {
                  const isArchived =
                    document.lifecycle?.dispositionStatus === "ARCHIVED";
                  const certClass = isArchived
                    ? "cert-archive"
                    : "cert-destroy";

                  return (
                    <div
                      className={`disposition-certificate ${certClass} mt-3`}
                    >
                      {/* Header */}
                      <div className="disposition-cert-header">
                        <div className="disposition-cert-icon">
                          <i
                            className={`bi ${isArchived ? "bi-archive-fill" : "bi-shield-check"}`}
                          />
                        </div>
                        <h6 className="disposition-cert-title">
                          {isArchived
                            ? "Archival Record"
                            : "Certificate of Destruction"}
                        </h6>
                      </div>

                      {/* Body */}
                      <div className="disposition-cert-body">
                        <div className="disposition-cert-row">
                          <strong>Status</strong>
                          <span>
                            {isArchived
                              ? "Permanently archived per retention schedule"
                              : "File contents permanently destroyed"}
                          </span>
                        </div>

                        {document.lifecycle?.dispositionDate && (
                          <div className="disposition-cert-row">
                            <strong>Date</strong>
                            <span>
                              {new Date(
                                document.lifecycle?.dispositionDate,
                              ).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        )}

                        {document.lifecycle?.dispositionActionSnapshot && (
                          <div className="disposition-cert-row">
                            <strong>Action</strong>
                            <span>
                              {document.lifecycle?.dispositionActionSnapshot}
                            </span>
                          </div>
                        )}

                        <div className="disposition-cert-divider" />

                        <p className="disposition-cert-compliance">
                          {isArchived
                            ? "This record has been transferred to the archives. The file remains accessible to authorized administrators."
                            : "This record serves as a compliance tombstone. File contents have been irrevocably removed from storage in accordance with the defined disposition policy."}
                        </p>
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>
        </div>
      </div>

      {/* ── Review Details (full-width) ── */}
      <ReviewDetailsTable document={document} />

      {/* ── Distributions ── */}
      {(user?.id === document.uploadedById ||
        user?.id === document.originalSenderId ||
        canManageDocuments) && (
        <DistributionHistoryTable distributions={distributions || []} />
      )}

      {/* ── Version History ── */}
      {document.lifecycle?.dispositionStatus !== "DESTROYED" && (
        <VersionHistoryTable
          versions={document.versions || []}
          onDownload={async (versionId) => {
            try {
              const result = await utils.documents.getSignedDocumentUrl.fetch({
                documentId: document.id,
                versionId: versionId,
              });
              if (result.signedUrl) {
                window.open(result.signedUrl, "_blank", "noopener,noreferrer");
              } else {
                throw new Error("No URL returned");
              }
            } catch {
              setAlertConfig({
                show: true,
                title: "Error",
                message: "Could not retrieve document version URL.",
              });
            }
          }}
        />
      )}

      {/* Modals */}
      {showResubmitModal && (
        <ForwardDocumentModal
          show={showResubmitModal}
          onClose={() => setShowResubmitModal(false)}
          onSuccess={async (title, message) => {
            await utils.documents.getById.invalidate({ id: document.id });
            setAlertConfig({ show: true, title, message });
          }}
          documentId={document.id}
          initialRecipientId={
            isReturnedOrDisapproved &&
            document.remarks &&
            document.remarks.length > 0
              ? document.remarks[0].authorId
              : undefined
          }
          forceRecipientLock={isReturnedOrDisapproved}
        />
      )}

      {showReviewModal && (
        <ReviewDocumentModal
          show={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onSuccess={async (title, message) => {
            await utils.documents.getById.invalidate({ id: document.id });
            setAlertConfig({ show: true, title, message });
          }}
          documentId={document.id}
        />
      )}

      {showCheckOutModal && (
        <CheckOutModal
          show={showCheckOutModal}
          onClose={() => setShowCheckOutModal(false)}
          documentId={document.id}
        />
      )}

      {showCheckInModal && (
        <CheckInModal
          show={showCheckInModal}
          onClose={() => setShowCheckInModal(false)}
          documentId={document.id}
        />
      )}

      <LegalHoldModal
        show={showLegalHoldModal}
        documentTitle={document.title}
        isSubmitting={applyLegalHoldMutation.isPending}
        onConfirm={(reason) => {
          applyLegalHoldMutation.mutate(
            { documentId: document.id, reason },
            {
              onSuccess: () => setShowLegalHoldModal(false),
              onError: (err) =>
                setAlertConfig({
                  show: true,
                  title: "Error",
                  message: err.message,
                }),
            },
          );
        }}
        onClose={() => setShowLegalHoldModal(false)}
      />

      <AlertModal
        show={alertConfig.show}
        title={alertConfig.title}
        onClose={() => {
          setAlertConfig({ show: false, title: "", message: "" });
          utils.documents.getById.invalidate({ id });
        }}
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
