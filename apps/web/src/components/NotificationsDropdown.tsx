import React, { useRef, useState, useEffect } from "react";
import { trpc } from "../trpc";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";

interface NotificationsDropdownProps {
  isCollapsed: boolean;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  isCollapsed,
  anchorRef,
  isOpen,
  onClose,
}) => {
  const { data: notifications, refetch } = trpc.notifications.getAll.useQuery(
    undefined,
    {
      enabled: isOpen,
    },
  );
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation();
  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation();
  const utils = trpc.useContext();
  const navigate = useNavigate();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  // Outside click handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  // Positioning
  useEffect(() => {
    if (isOpen && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      if (isCollapsed) {
        setMenuStyle({
          position: "fixed",
          left: `${rect.right + 20}px`,
          bottom: `${window.innerHeight - rect.bottom}px`,
          zIndex: 9999,
        });
      } else {
        setMenuStyle({
          position: "absolute",
          bottom: "100%",
          left: "0",
          marginBottom: "10px",
          width: "300px",
          zIndex: 9999,
        });
      }
    }
  }, [isOpen, isCollapsed, anchorRef]);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      await markAsReadMutation.mutateAsync({ id: notification.id });
      utils.notifications.getUnreadCount.invalidate();
      refetch();
    }
    onClose();
    if (notification.documentId) {
      navigate(`/documents/${notification.documentId}`);
    }
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await markAllAsReadMutation.mutateAsync();
    utils.notifications.getUnreadCount.invalidate();
    refetch();
  };

  if (!isOpen) return null;

  const content = (
    <div
      ref={dropdownRef}
      className={`account-menu-dropup ${isCollapsed ? "portal" : ""}`}
      style={{
        ...(isCollapsed ? menuStyle : { ...menuStyle, minWidth: "300px" }),
        padding: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        maxHeight: "400px",
      }}
    >
      <div
        className="dropdown-header d-flex justify-content-between align-items-center p-3"
        style={{ borderBottom: "1px solid var(--card-border)" }}
      >
        <h6 className="m-0 text-white">Notifications</h6>
        <button
          className="btn btn-sm btn-link text-white p-0 text-decoration-none"
          onClick={handleMarkAllAsRead}
          style={{ fontSize: "0.8rem" }}
        >
          Mark all as read
        </button>
      </div>

      <div style={{ overflowY: "auto", flexGrow: 1 }}>
        {notifications?.length === 0 ? (
          <div className="p-4 text-center text-muted">
            <i className="bi bi-bell-slash fs-3 mb-2 d-block"></i>
            <small>No notifications</small>
          </div>
        ) : (
          <div className="list-group list-group-flush">
            {notifications?.map((notif: any) => (
              <button
                key={notif.id}
                className={`list-group-item list-group-item-action p-3 border-bottom ${
                  !notif.isRead ? "bg-light" : "bg-transparent"
                }`}
                onClick={() => handleNotificationClick(notif)}
                style={{
                  textAlign: "left",
                  borderColor: "var(--card-border) !important",
                  color: "var(--text)",
                }}
              >
                <div className="d-flex w-100 justify-content-between align-items-center mb-1">
                  <strong className={!notif.isRead ? "text-primary" : ""}>
                    {notif.title}
                  </strong>
                  <small className="text-muted" style={{ fontSize: "0.75rem" }}>
                    {formatDistanceToNow(new Date(notif.createdAt), {
                      addSuffix: true,
                    })}
                  </small>
                </div>
                <p className="mb-0 small text-muted text-wrap">
                  {notif.message}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return isCollapsed ? createPortal(content, document.body) : content;
};
