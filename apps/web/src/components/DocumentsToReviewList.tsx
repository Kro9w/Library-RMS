import React from "react";
import { Link } from "react-router-dom";
import { trpc } from "../trpc";
import { UserAvatar } from "./UserAvatar";
import "./DocumentsToReviewList.css";

export const DocumentsToReviewList: React.FC = () => {
  const {
    data: documents,
    isLoading,
    isError,
  } = trpc.documents.getDocumentsToReview.useQuery();

  if (isLoading) {
    return (
      <div className="page-loading">
        <div className="page-spinner" />
        <span>Loading pending reviews...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="docs-review-container error">
        Error loading documents to review.
      </div>
    );
  }

  const sortedDocs = [...(documents || [])].sort((a, b) => {
    // Unchecked (not reviewed) items first
    if (a.isReviewed === b.isReviewed) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return a.isReviewed ? 1 : -1;
  });

  if (sortedDocs.length === 0) {
    return (
      <div className="docs-review-empty">
        <i className="bi bi-inbox empty-icon"></i>
        <p>No documents to review for now</p>
      </div>
    );
  }

  return (
    <div className="docs-review-list">
      {sortedDocs.map((doc) => (
        <div
          key={doc.id}
          className={`docs-review-item ${doc.isReviewed ? "reviewed" : ""}`}
        >
          <div className="docs-review-info">
            <Link to={`/documents/${doc.id}`} className="docs-review-title">
              {doc.title}
            </Link>
            <div className="docs-review-meta">
              <span>{doc.controlNumber || "No Control Number"}</span> •
              <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="docs-review-originator position-relative">
            <div className="reviewer-avatar-wrapper">
              <UserAvatar
                user={doc.uploadedBy as any}
                className="reviewer-avatar"
                size={36}
              />
              <div className="originator-dialog-box">
                <strong>
                  {doc.uploadedBy.firstName} {doc.uploadedBy.lastName}
                </strong>
                <br />
                <small>
                  {doc.uploadedBy.department?.name || "Unknown Department"}
                </small>
              </div>
            </div>
          </div>

          {doc.isReviewed && (
            <div className="docs-review-check">
              <i className="bi bi-check-circle-fill text-success"></i>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
