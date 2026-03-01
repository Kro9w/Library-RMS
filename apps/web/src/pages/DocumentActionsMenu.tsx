import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useOutsideClick } from "../hooks/useOutsideClick";
import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";

type Document = AppRouterOutputs["documents"]["getAll"]["documents"][0];

interface DocumentActionsMenuProps {
  doc: Document;
  isUploader: (id: string) => boolean;
  canManageDocuments: boolean;
  onSendClick: (doc: Document) => void;
  onReviewClick: (doc: Document) => void;
  onDeleteClick: (doc: Document) => void;
}

export const DocumentActionsMenu: React.FC<DocumentActionsMenuProps> = ({
  doc,
  isUploader,
  canManageDocuments,
  onSendClick,
  onReviewClick,
  onDeleteClick,
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
            <ul
              className="dropdown-menu show"
              style={{
                position: "static",
                minWidth: "150px",
                display: "block",
              }}
            >
              <li>
                <button
                  className="dropdown-item d-flex align-items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    onSendClick(doc);
                  }}
                >
                  <i className="bi bi-send text-primary"></i> Send
                </button>
              </li>
              {canManageDocuments && hasReviewTag && (
                <li>
                  <button
                    className="dropdown-item d-flex align-items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                      onReviewClick(doc);
                    }}
                  >
                    <i className="bi bi-eye text-info"></i> Review
                  </button>
                </li>
              )}
              <li>
                <button
                  className="dropdown-item d-flex align-items-center gap-2 text-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    onDeleteClick(doc);
                  }}
                >
                  <i className="bi bi-trash"></i> Delete
                </button>
              </li>
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
};
