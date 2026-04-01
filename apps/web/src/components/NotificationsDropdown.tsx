import React, { useRef, useState, useEffect } from "react";
import { trpc } from "../trpc";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import "./NotificationsDropdown.css";

interface NotificationsDropdownProps {
  isCollapsed: boolean;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  anchorRef,
  isOpen,
  onClose,
}) => {
  const { data: notifications, refetch } = trpc.notifications.getAll.useQuery(
    undefined,
    { enabled: isOpen },
  );
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation();
  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation();
  const utils = trpc.useContext();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  useEffect(() => {
    if (isOpen && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPanelStyle({
        position: "fixed",
        top: `${rect.bottom + 8}px`,
        right: `${window.innerWidth - rect.right - 8}px` /* Adjusted offset to match dropdowns */,
        zIndex: 9999,
      });
    }
  }, [isOpen, anchorRef]);

  const handleClick = async (notif: any) => {
    if (!notif.isRead) {
      await markAsReadMutation.mutateAsync({ id: notif.id });
      utils.notifications.getUnreadCount.invalidate();
      refetch();
    }
    onClose();
    if (notif.documentId) {
      const titleStr = notif.title.toLowerCase();
      if (
        titleStr === "document received" ||
        titleStr.includes("review requested")
      ) {
        // Redirect to dashboard with query param to open receive modal
        navigate(`/?openReceiveModal=true`);
      } else {
        navigate(`/documents/${notif.documentId}`);
      }
    }
  };

  const handleMarkAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await markAllAsReadMutation.mutateAsync();
    utils.notifications.getUnreadCount.invalidate();
    refetch();
  };

  if (!isOpen) return null;

  const unread = notifications?.filter((n: any) => !n.isRead).length ?? 0;

  const panel = (
    <div ref={panelRef} className="notif-panel" style={panelStyle}>
      {/* Header */}
      <div className="notif-panel-header">
        <div className="notif-panel-title">
          Notifications
          {unread > 0 && <span className="notif-panel-badge">{unread}</span>}
        </div>
        {unread > 0 && (
          <button className="notif-panel-mark-all" onClick={handleMarkAll}>
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="notif-panel-list">
        {!notifications || notifications.length === 0 ? (
          <div className="notif-empty">
            <i className="bi bi-bell-slash notif-empty-icon" />
            <p>No notifications yet</p>
            <span>Updates will appear here.</span>
          </div>
        ) : (
          notifications.map((notif: any) => (
            <button
              key={notif.id}
              className={`notif-item ${!notif.isRead ? "unread" : ""}`}
              onClick={() => handleClick(notif)}
            >
              {!notif.isRead && <span className="notif-dot" />}
              <div className="notif-item-icon-wrapper">
                {(() => {
                  const titleStr = notif.title.toLowerCase();
                  const msgStr = notif.message.toLowerCase();

                  if (titleStr === "document received") {
                    return (
                      <i className="bi bi-file-earmark-arrow-down notif-item-icon"></i>
                    );
                  }
                  if (titleStr.includes("review requested")) {
                    return <i className="bi bi-eye notif-item-icon"></i>;
                  }
                  if (titleStr.includes("review completed")) {
                    if (msgStr.includes("returned for corrections")) {
                      return (
                        <i className="bi bi-arrow-return-left notif-item-icon text-warning"></i>
                      );
                    }
                    if (msgStr.includes("disapproved")) {
                      return (
                        <i className="bi bi-x-circle-fill notif-item-icon text-danger"></i>
                      );
                    }
                    if (msgStr.includes("noted")) {
                      return (
                        <i className="bi bi-journal-check notif-item-icon text-info"></i>
                      );
                    }
                    if (msgStr.includes("for endorsement")) {
                      return (
                        <i className="bi bi-forward-fill notif-item-icon text-primary"></i>
                      );
                    }
                    if (msgStr.includes("executive committee")) {
                      return (
                        <i className="bi bi-people-fill notif-item-icon text-secondary"></i>
                      );
                    }
                    return (
                      <i className="bi bi-check-circle-fill notif-item-icon text-success"></i>
                    );
                  }
                  if (titleStr.includes("legal hold")) {
                    return (
                      <i className="bi bi-shield-lock notif-item-icon text-danger"></i>
                    );
                  }
                  if (titleStr.includes("disposition")) {
                    return (
                      <i className="bi bi-trash3 notif-item-icon text-warning"></i>
                    );
                  }
                  return <i className="bi bi-bell notif-item-icon"></i>;
                })()}
              </div>
              <div className="notif-item-body">
                <div className="notif-item-msg">
                  <span className="notif-item-title">{notif.title}: </span>
                  {notif.message}
                </div>
                <div className="notif-item-time">
                  {formatDistanceToNow(new Date(notif.createdAt), {
                    addSuffix: true,
                  })}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );

  return createPortal(panel, document.body);
};
