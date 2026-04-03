import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useOutsideClick } from "../hooks/useOutsideClick";
import { usePermissions } from "../hooks/usePermissions";
import { trpc } from "../trpc";
import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";

type Document = AppRouterOutputs["documents"]["getAll"]["documents"][0];

interface DocumentActionsMenuProps {
  doc: Document;
  isUploader: (id: string) => boolean;
  canManageDocuments: boolean;
  onForwardClick: (doc: Document) => void;
  onSendClick?: (doc: Document) => void;
  onReviewClick: (doc: Document) => void;
  onDeleteClick: (doc: Document) => void;
  onCheckOutClick?: (doc: Document) => void;
  onCheckInClick?: (doc: Document) => void;
  onDiscardCheckOutClick?: (doc: Document) => void;
  currentUserId?: string;
}

export const DocumentActionsMenu: React.FC<DocumentActionsMenuProps> = ({
  doc,
  isUploader,
  canManageDocuments,
  onForwardClick,
  onSendClick,
  onReviewClick,
  onDeleteClick,
  onCheckOutClick,
  onCheckInClick,
  onDiscardCheckOutClick,
  currentUserId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 4, // 4px gap
        left: rect.right + window.scrollX - 160, // Align right edge roughly, width is ~160
      });
    }
    setIsOpen(!isOpen);
  };

  useOutsideClick([buttonRef, dropdownRef], () => {
    if (isOpen) setIsOpen(false);
  });

  // Handle window resize/scroll closing the menu
  useEffect(() => {
    const handleScrollOrResize = () => setIsOpen(false);
    if (isOpen) {
      window.addEventListener("scroll", handleScrollOrResize, true);
      window.addEventListener("resize", handleScrollOrResize);
    }
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  const hasReviewTag = doc.tags.some(
    (tag: { tag: { name: string } }) => tag.tag.name === "for review",
  );

  const isTransit =
    doc.classification === "FOR_APPROVAL" && doc.recordStatus === "IN_TRANSIT";

  // Determine if the current user belongs to the currently active office in the transit route
  const currentTransitStop = isTransit
    ? doc.transitRoutes?.find((r: any) => r.status === "CURRENT")
    : null;

  // Note: we can't reliably get currentUserDept directly from `doc` props without passing it.
  // We'll rely on trpc Context here since it's lightweight
  const trpcCtx = trpc.useContext();
  const currentUser = trpcCtx.user.getMe.getData();
  const { canManageDocuments: _canManageDocsLocal } = usePermissions();

  const isCurrentTransitOffice =
    currentTransitStop &&
    currentUser?.departmentId === currentTransitStop.departmentId;

  // Level 1 users of the current transit office should be able to review
  const hasTransitReviewAccess =
    isCurrentTransitOffice &&
    currentUser?.roles?.some((r: any) => r.level === 1);

  // Allow originators to send it to the first office
  const isReturnedOrDisapproved =
    doc.status === "Returned for Corrections/Revision/Clarification" ||
    doc.status === "Disapproved";
  const isOriginator =
    currentUser?.id === doc.uploadedById ||
    currentUser?.id === doc.originalSenderId;
  const isOriginatorForwardingInTransit =
    isTransit &&
    doc.uploadedById === currentUser?.id &&
    (!doc.status ||
      doc.status === "Returned for Corrections/Revision/Clarification" ||
      doc.status === "Disapproved");

  const hasAccess = isUploader(doc.uploadedById);

  if (!hasAccess) {
    return (
      <span title="No access" className="no-access-icon text-muted">
        <i className="bi bi-lock-fill" style={{ fontSize: "1.1rem" }}></i>
      </span>
    );
  }

  return (
    <div className="dropdown-container">
      <button
        ref={buttonRef}
        className="btn btn-icon btn-actions"
        onClick={toggleDropdown}
        title="Actions"
      >
        <i className="bi bi-three-dots-vertical"></i>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="document-actions-dropdown"
            style={{
              position: "absolute",
              top: `${dropdownPos.top}px`,
              left: `${dropdownPos.left}px`,
              zIndex: 1050, // Higher than most modals/tables
            }}
          >
            {doc.classification !== "FOR_APPROVAL" &&
              doc.recordStatus !== "IN_TRANSIT" &&
              !doc.isCheckedOut &&
              onSendClick && (
                <button
                  className="dropdown-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    onSendClick(doc);
                  }}
                >
                  <i className="bi bi-send-fill text-primary"></i> Send Document
                </button>
              )}

            {doc.classification === "FOR_APPROVAL" &&
              (!isTransit || isOriginatorForwardingInTransit) &&
              !doc.isCheckedOut && (
                <button
                  className="dropdown-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    onForwardClick(doc);
                  }}
                >
                  <i className="bi bi-forward-fill text-primary"></i> Forward
                  Document
                </button>
              )}
            {((canManageDocuments && hasReviewTag) || hasTransitReviewAccess) &&
              !isReturnedOrDisapproved &&
              !isOriginator && (
                <button
                  className="dropdown-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    onReviewClick(doc);
                  }}
                >
                  <i className="bi bi-eye text-info"></i> Review
                </button>
              )}

            {/* Version Control Actions */}
            {doc.recordStatus !== "FINAL" &&
              !doc.isCheckedOut &&
              onCheckOutClick && (
                <button
                  className="dropdown-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    onCheckOutClick(doc);
                  }}
                >
                  <i className="bi bi-cloud-arrow-down text-success"></i> Check
                  Out
                </button>
              )}
            {doc.isCheckedOut &&
              (doc.checkedOutById === currentUserId ||
                doc.checkedOutBy?.id === currentUserId) &&
              onCheckInClick && (
                <button
                  className="dropdown-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    onCheckInClick(doc);
                  }}
                >
                  <i className="bi bi-cloud-arrow-up text-primary"></i> Check In
                </button>
              )}
            {doc.isCheckedOut &&
              (doc.checkedOutById === currentUserId ||
                doc.checkedOutBy?.id === currentUserId ||
                doc.uploadedById === currentUserId ||
                canManageDocuments) &&
              onDiscardCheckOutClick && (
                <button
                  className="dropdown-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    onDiscardCheckOutClick(doc);
                  }}
                >
                  <i className="bi bi-x-circle text-warning"></i> Discard Check
                  Out
                </button>
              )}
            <button
              className="dropdown-item text-danger"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onDeleteClick(doc);
              }}
            >
              <i className="bi bi-trash"></i> Delete
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
};
