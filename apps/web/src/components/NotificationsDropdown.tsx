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
      // Calculate a position that mimics a side-panel attached to the navbar
      if (isCollapsed) {
        setMenuStyle({
          position: "fixed",
          left: `${rect.right + 15}px`, // Slight offset from collapsed navbar
          top: "10px", // Align near top of viewport like a panel
          bottom: "10px",
          width: "350px",
          zIndex: 9999,
        });
      } else {
        setMenuStyle({
          position: "fixed",
          left: `${rect.right + 15}px`, // Slight offset from expanded navbar
          top: "10px", // Align near top of viewport like a panel
          bottom: "10px",
          width: "350px",
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
      className="notifications-panel-dialog"
      style={{
        ...menuStyle,
        backgroundColor: "var(--card-background)",
        border: "1px solid var(--card-border)",
        borderRadius: "1rem",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
        padding: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div
        className="d-flex justify-content-between align-items-center p-4"
        style={{
          borderBottom: "1px solid var(--card-border)",
          backgroundColor: "var(--navbar)",
          color: "var(--light-text)",
        }}
      >
        <h5 className="m-0 fw-bold d-flex align-items-center">
          <i className="bi bi-bell-fill me-2"></i>
          Notifications
        </h5>
        <button
          className="btn btn-sm btn-link p-0 text-decoration-none"
          onClick={handleMarkAllAsRead}
          style={{
            fontSize: "0.85rem",
            color: "rgba(255, 255, 255, 0.8)",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)")
          }
        >
          Mark all as read
        </button>
      </div>

      <div
        style={{
          overflowY: "auto",
          flexGrow: 1,
          padding: "1rem",
          backgroundColor: "var(--hover-bg)",
        }}
      >
        {notifications?.length === 0 ? (
          <div className="h-100 d-flex flex-column justify-content-center align-items-center text-muted">
            <i className="bi bi-bell-slash fs-1 mb-3 opacity-50"></i>
            <h6>No notifications yet</h6>
            <small className="opacity-75">
              When you get updates, they'll show up here.
            </small>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {notifications?.map((notif: any) => (
              <div
                key={notif.id}
                className={`card notification-card ${!notif.isRead ? "unread" : ""}`}
                onClick={() => handleNotificationClick(notif)}
                style={{
                  cursor: "pointer",
                  backgroundColor: "var(--card-background)",
                  border: !notif.isRead
                    ? "1px solid var(--primary)"
                    : "1px solid var(--card-border)",
                  borderLeft: !notif.isRead
                    ? "4px solid var(--primary)"
                    : "1px solid var(--card-border)",
                  borderRadius: "0.5rem",
                  boxShadow: "var(--card-shadow)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 16px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "var(--card-shadow)";
                }}
              >
                <div className="card-body p-3">
                  <div className="d-flex w-100 justify-content-between align-items-start mb-2">
                    <h6
                      className={`mb-0 ${!notif.isRead ? "text-primary fw-bold" : "text-body"}`}
                      style={{ fontSize: "0.95rem" }}
                    >
                      {notif.title}
                    </h6>
                    <small
                      className="text-muted text-nowrap ms-2"
                      style={{ fontSize: "0.75rem" }}
                    >
                      {formatDistanceToNow(new Date(notif.createdAt), {
                        addSuffix: true,
                      })}
                    </small>
                  </div>
                  <p
                    className="mb-0 text-muted"
                    style={{ fontSize: "0.85rem", lineHeight: "1.4" }}
                  >
                    {notif.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
