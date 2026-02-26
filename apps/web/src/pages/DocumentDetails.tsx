// apps/web/src/pages/DocumentDetails.tsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { trpc } from "../trpc";
import "./DocumentDetails.css";
import { LoadingAnimation } from "../components/ui/LoadingAnimation";
import { formatUserName } from "../utils/user";

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

// --- 1. THIS IS THE FIX ---
// This new, simpler function is 100% type-safe and
// replaces the old buggy version.
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
      default:
        // If we don't recognize the type, try to split it
        const simpleType = fileType.split("/")[1];
        if (simpleType) return simpleType.toUpperCase();
    }
  }

  // If fileType is null (for old documents), fall back to the title
  const extension = title.split(".").pop();
  return extension ? extension.toUpperCase() : "N/A";
};
// ------------------------------

export const DocumentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: user } = trpc.user.getMe.useQuery();
  const utils = trpc.useUtils();

  const { data: document, isLoading: isLoadingDoc } =
    trpc.documents.getById.useQuery({ id: id! }, { enabled: !!id });

  const executeDispositionMutation =
    trpc.documents.executeDisposition.useMutation({
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

  return (
    <div className="container mt-4">
      <div className="page-header">
        <h2>{document.title}</h2>
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
                          : document.lifecycleStatus === "Archived"
                            ? "bg-info"
                            : "bg-danger"
                  }`}
                >
                  {document.lifecycleStatus}
                </span>
              </p>

              {user?.roles.some((r: any) => r.canManageDocuments) &&
                document.lifecycleStatus === "Ready" && (
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
                        className="btn btn-danger w-100"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure you want to execute disposition? This action is irreversible.",
                            )
                          ) {
                            executeDispositionMutation.mutate({
                              documentId: document.id,
                            });
                          }
                        }}
                        disabled={executeDispositionMutation.isPending}
                      >
                        {executeDispositionMutation.isPending
                          ? "Executing..."
                          : `Execute ${document.dispositionActionSnapshot}`}
                      </button>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
