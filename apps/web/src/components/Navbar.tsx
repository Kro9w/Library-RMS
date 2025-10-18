import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { UserButton, useUser } from "@clerk/clerk-react";
import { trpc } from "../trpc";
import "./Navbar.css";

interface NavbarProps {
  isExpanded: boolean;
  setIsExpanded: (isExpanded: boolean) => void;
}

export function Navbar({ isExpanded, setIsExpanded }: NavbarProps) {
  const { user } = useUser();
  const navigate = useNavigate();
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  // --- Start of Notification Logic ---
  const { data: notifications, refetch: refetchNotifications } =
    trpc.getNotifications.useQuery(undefined, {
      enabled: !!user,
    });

  const markAsRead = trpc.markNotificationsAsRead.useMutation({
    onSuccess: () => {
      refetchNotifications();
    },
  });

  const handleNotificationClick = (notification: {
    id: string;
    documentId: string | null;
  }) => {
    markAsRead.mutate([notification.id]);
    setDropdownOpen(false);
    if (notification.documentId) {
      navigate(`/documents/${notification.documentId}`);
    }
  };
  // --- End of Notification Logic ---

  const navItems = [
    { to: "/", name: "Dashboard", icon: "bi-grid-1x2-fill" },
    { to: "/documents", name: "Documents", icon: "bi-file-earmark-text-fill" },
    { to: "/graph", name: "Ownership Graph", icon: "bi-diagram-3-fill" },
    { to: "/upload", name: "Upload", icon: "bi-upload" },
    { to: "/tags", name: "Tags", icon: "bi-tags-fill" },
    { to: "/settings", name: "Settings", icon: "bi-gear-fill" },
    { to: "/users", name: "Users", icon: "bi-people-fill" },
  ];

  return (
    <div className="sidebar-wrapper">
      <nav className={`sidebar-float ${isExpanded ? "expanded" : "collapsed"}`}>
        <div className="sidebar-content">
          <ul className="nav flex-column">
            <li className="nav-item logo-item">
              <span className="nav-link text-white fs-4">
                <img
                  src="/foliotwo.svg"
                  alt="Folio"
                  style={{ height: "30px", marginRight: "10px" }}
                />
                <span className="link-text">Folio</span>
              </span>
            </li>
            {navItems.map((item) => (
              <li className="nav-item" key={item.name}>
                <NavLink
                  to={item.to}
                  className="nav-link text-white"
                  title={item.name}
                >
                  <i className={`bi ${item.icon}`}></i>
                  <span className="link-text">{item.name}</span>
                </NavLink>
              </li>
            ))}

            {/* --- Start of Notification UI --- */}
            <li className="nav-item dropdown notification-item">
              <a
                className="nav-link text-white position-relative"
                href="#"
                role="button"
                onClick={() => setDropdownOpen(!isDropdownOpen)}
                title="Notifications"
              >
                <i className="bi bi-bell-fill"></i>
                <span className="link-text">Notifications</span>
                {notifications && notifications.length > 0 && (
                  <span className="notification-badge badge rounded-pill bg-danger">
                    {notifications.length}
                  </span>
                )}
              </a>
              {isDropdownOpen && (
                <ul className="dropdown-menu dropdown-menu-dark show">
                  {notifications && notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <li key={notif.id}>
                        <a
                          className="dropdown-item"
                          href="#"
                          onClick={() => handleNotificationClick(notif)}
                        >
                          {notif.message}
                        </a>
                      </li>
                    ))
                  ) : (
                    <li>
                      <span className="dropdown-item-text">
                        No new notifications
                      </span>
                    </li>
                  )}
                </ul>
              )}
            </li>
            {/* --- End of Notification UI --- */}
          </ul>

          <div className="sidebar-footer">
            <div className="user-profile">
              <UserButton afterSignOutUrl="/login" />
              <div className="link-text user-info">
                <span className="user-name">{user?.fullName}</span>
                <span className="user-email">
                  {user?.primaryEmailAddress?.emailAddress}
                </span>
              </div>
            </div>

            <button
              className="nav-link text-white collapse-btn"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <i
                className={`bi ${
                  isExpanded ? "bi-chevron-left" : "bi-chevron-right"
                }`}
              ></i>
              <span className="link-text">
                {isExpanded ? "Collapse" : "Expand"}
              </span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
