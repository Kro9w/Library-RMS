import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  Suspense,
} from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate } from "react-router-dom";
import { useUser } from "../contexts/SessionContext";
import { supabase } from "../supabase";
import { trpc } from "../trpc";
import { useOutsideClick } from "../hooks/useOutsideClick";
import { usePermissions } from "../hooks/usePermissions";
import { useQueryClient } from "@tanstack/react-query";
import "./Navbar.css";
import { formatUserName } from "../utils/user";
import { NotificationsDropdown } from "./NotificationsDropdown";

const UploadModal = React.lazy(() =>
  import("./UploadModal").then((m) => ({ default: m.UploadModal })),
);
const SelectDocumentModal = React.lazy(() =>
  import("./SelectDocumentModal").then((m) => ({
    default: m.SelectDocumentModal,
  })),
);
const SendDocumentModal = React.lazy(() =>
  import("./SendDocumentModal").then((m) => ({ default: m.SendDocumentModal })),
);

interface NavbarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Navbar({ isCollapsed, onToggle }: NavbarProps) {
  const user = useUser();
  const { data: dbUser } = trpc.user.getMe.useQuery(undefined, {
    enabled: !!user,
  });

  const navigate = useNavigate();
  const [isAccountMenuOpen, setAccountMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    setAccountMenuOpen(false);
  }, [isCollapsed]);

  useLayoutEffect(() => {
    if (isAccountMenuOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuStyle({
        position: "fixed",
        right: `${window.innerWidth - rect.right}px`,
        top: `${rect.bottom + 6}px`,
        zIndex: 9999,
      });
    }
  }, [isAccountMenuOpen]);

  useOutsideClick([triggerRef, dropdownRef], () => {
    setAccountMenuOpen(false);
  });

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSelectDocumentModal, setShowSelectDocumentModal] = useState(false);
  const [showSendDocumentModal, setShowSendDocumentModal] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate("/login");
  };

  const { canManageUsers } = usePermissions();

  const { data: unreadCount } = trpc.notifications.getUnreadCount.useQuery(
    undefined,
    { enabled: !!user },
  );
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const notifTriggerRef = useRef<HTMLButtonElement>(null);

  const displayName = dbUser ? formatUserName(dbUser) : user?.email || "User";

  const avatarUrl =
    dbUser?.imageUrl ||
    user?.user_metadata?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=9B2335&color=fff&size=128`;

  // Breadcrumb parts
  const institutionAcronym = dbUser?.institution?.acronym || "CSU";
  const campusName = dbUser?.campus?.name
    ? `${dbUser.campus.name} Campus`
    : null;
  const deptName = dbUser?.department?.name || null;

  const accountDropdown = (
    <div className="account-dropdown" ref={dropdownRef} style={menuStyle}>
      <div className="account-dropdown-header">
        <img src={avatarUrl} alt="avatar" className="account-dropdown-avatar" />
        <div className="account-dropdown-info">
          <span className="account-dropdown-name">{displayName}</span>
          <span className="account-dropdown-email">{dbUser?.email}</span>
        </div>
      </div>
      <div className="account-dropdown-divider" />
      <NavLink
        to="/account"
        className="account-dropdown-item"
        onClick={() => setAccountMenuOpen(false)}
      >
        <i className="bi bi-person" />
        My Account
      </NavLink>
      <NavLink
        to="/settings"
        className="account-dropdown-item"
        onClick={() => setAccountMenuOpen(false)}
      >
        <i className="bi bi-gear" />
        Settings
      </NavLink>
      {dbUser?.isSuperAdmin && (
        <NavLink
          to="/admin"
          className="account-dropdown-item"
          onClick={() => setAccountMenuOpen(false)}
        >
          <i className="bi bi-shield-lock" />
          Admin Panel
        </NavLink>
      )}
      <div className="account-dropdown-divider" />
      <button
        className="account-dropdown-item account-dropdown-signout"
        onClick={handleSignOut}
      >
        <i className="bi bi-box-arrow-right" />
        Sign out
      </button>
    </div>
  );

  return (
    <>
      {/* ── Left sidebar ── */}
      <aside className={`sidebar ${isCollapsed ? "collapsed" : "expanded"}`}>
        {/* Nav links */}
        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `sidebar-nav-link${isActive ? " active" : ""}`
            }
            title="Dashboard"
          >
            <i className="bi bi-grid-1x2" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/documents"
            className={({ isActive }) =>
              `sidebar-nav-link${isActive ? " active" : ""}`
            }
            title="Documents"
          >
            <i className="bi bi-file-earmark-text" />
            <span>Documents</span>
          </NavLink>
          <NavLink
            to="/graph"
            className={({ isActive }) =>
              `sidebar-nav-link${isActive ? " active" : ""}`
            }
            title="Graph"
          >
            <i className="bi bi-diagram-3" />
            <span>Graph</span>
          </NavLink>
          {canManageUsers && (
            <>
              <NavLink
                to="/users"
                className={({ isActive }) =>
                  `sidebar-nav-link${isActive ? " active" : ""}`
                }
                title="Users"
              >
                <i className="bi bi-people" />
                <span>Users</span>
              </NavLink>
              <NavLink
                to="/logs"
                className={({ isActive }) =>
                  `sidebar-nav-link${isActive ? " active" : ""}`
                }
                title="Logs"
              >
                <i className="bi bi-journal-text" />
                <span>Logs</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* Sidebar footer: collapse toggle */}
        <div className="sidebar-footer">
          <button
            className="sidebar-toggle-btn"
            onClick={onToggle}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <i
              className={`bi ${isCollapsed ? "bi-layout-sidebar" : "bi-layout-sidebar-inset"}`}
            />
          </button>
        </div>
      </aside>

      {/* ── Top bar ── */}
      <header className="topbar">
        {/* Left: Logo and Breadcrumb */}
        <div className="topbar-left">
          <div className="topbar-brand">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 119.4 152.21"
              className="topbar-logo-svg"
            >
              <path
                fillRule="evenodd"
                d="M119.25,44.29h-30.63c-.21-8.67,.8-19.25-3.3-24.72-3.64-5-14.23-6.25-22.15-3.77-13.27,4.93-21.94,17.44-29.95,27.78-3.32,4.28-7.25,9.8-13.43,11.07-7.05,1.45-9.54-5.24-11.05-10.11-3.94-14.68,1.31-31.7,5.63-42.44,.39,.08,.79,.16,1.18,.02v1.18c-.98,3.38-.29,7.88,.47,10.37,3.08,11.1,10.5,15.34,22.64,10.13C55.43,17.33,83.75-11.39,107.94,4.97c3.89,2.71,6.71,6.87,8.48,10.84,3.56,7.28,3.02,17.98,2.83,28.49Zm-13.19,66.68c-9.92-.16-20.05-.31-30.18-.68,.36-9.01,1.75-27.73-4.95-31.81-2.51-1.24-6.96-1.03-11.05-1.18-9.91,22.05-19.11,43.88-33.25,61.26-5.68,7.28-14.02,13.64-26.62,13.64,.08-25.99,.16-52,.24-77.99H36.05c6.36-14.14,12.72-28.28,18.87-42.62,9.01,.29,17.81,.37,26.39,.45-6.21,13.75-14.62,27.39-19.79,42.18,28.48-.25,44.98,8.54,44.53,36.76ZM1.88,118.77c16.54-.24,26.91-27.76,32.28-40.79v-.45c-10.85,.18-25.97,1.09-30.39,7.54-3.59,5.61-2,24.9-1.88,33.69Z"
              />
            </svg>
            <span className="topbar-logo-text">Folio RMS</span>
          </div>

          {(campusName || deptName) && (
            <div className="topbar-breadcrumb">
              <span className="topbar-breadcrumb-sep">/</span>
              <span className="topbar-breadcrumb-root">
                {institutionAcronym}
              </span>
              {campusName && (
                <>
                  <span className="topbar-breadcrumb-sep">/</span>
                  <span className="topbar-breadcrumb-item">{campusName}</span>
                </>
              )}
              {deptName && (
                <>
                  <span className="topbar-breadcrumb-sep">/</span>
                  <span className="topbar-breadcrumb-item topbar-breadcrumb-dept">
                    {deptName}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div className="topbar-right">
          <button
            className="topbar-icon-btn"
            onClick={() => setShowUploadModal(true)}
            title="Upload Document"
          >
            <i className="bi bi-upload" />
          </button>

          <button className="topbar-icon-btn" title="Read the docs">
            <i className="bi bi-journal-text" />
          </button>

          <button className="topbar-icon-btn" title="FAQs">
            <i className="bi bi-question-circle" />
          </button>

          {/* Notifications */}
          <button
            ref={notifTriggerRef}
            className="topbar-icon-btn topbar-notif-btn"
            onClick={() => setNotificationsOpen(!isNotificationsOpen)}
            title="Notifications"
          >
            <i className="bi bi-bell" />
            {!!unreadCount && unreadCount > 0 && (
              <span className="topbar-notif-badge">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          <NotificationsDropdown
            isCollapsed={false}
            anchorRef={notifTriggerRef}
            isOpen={isNotificationsOpen}
            onClose={() => setNotificationsOpen(false)}
          />

          {/* Avatar / account */}
          <button
            ref={triggerRef}
            className="topbar-avatar-btn"
            onClick={() => setAccountMenuOpen(!isAccountMenuOpen)}
            title="Account"
          >
            <img src={avatarUrl} alt="avatar" className="topbar-avatar" />
          </button>
        </div>
      </header>

      {/* Account dropdown portal */}
      {isAccountMenuOpen && createPortal(accountDropdown, document.body)}

      {/* Modals */}
      <Suspense fallback={null}>
        {showUploadModal && (
          <UploadModal
            show={showUploadModal}
            onClose={() => setShowUploadModal(false)}
          />
        )}
        {showSelectDocumentModal && (
          <SelectDocumentModal
            show={showSelectDocumentModal}
            onClose={() => setShowSelectDocumentModal(false)}
            onSelect={(docId) => {
              setSelectedDocId(docId);
              setShowSelectDocumentModal(false);
              setShowSendDocumentModal(true);
            }}
          />
        )}
        {selectedDocId && showSendDocumentModal && (
          <SendDocumentModal
            show={showSendDocumentModal}
            onClose={() => setShowSendDocumentModal(false)}
            documentId={selectedDocId}
          />
        )}
      </Suspense>
    </>
  );
}
