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
import { useGlobalLoading } from "../hooks/useGlobalLoading";
import "./Navbar.css";
import { formatUserName } from "../utils/user";
import { NotificationsDropdown } from "./NotificationsDropdown";
import type { SidebarMode } from "../App";

const UploadModal = React.lazy(() =>
  import("./UploadModal").then((m) => ({ default: m.UploadModal })),
);
const ForwardDocumentModal = React.lazy(() =>
  import("./ForwardDocumentModal").then((m) => ({
    default: m.ForwardDocumentModal,
  })),
);

interface NavbarProps {
  sidebarMode: SidebarMode;
  setSidebarMode: (mode: SidebarMode) => void;
}

export function Navbar({ sidebarMode, setSidebarMode }: NavbarProps) {
  const user = useUser();
  const { data: dbUser } = trpc.user.getMe.useQuery(undefined, {
    enabled: !!user,
  });
  const { canManageInstitution, canManageDocuments, highestRoleLevel } =
    usePermissions();

  const navigate = useNavigate();
  const [isAccountMenuOpen, setAccountMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const modeTriggerRef = useRef<HTMLButtonElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [modeMenuStyle, setModeMenuStyle] = useState<React.CSSProperties>({});

  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setAccountMenuOpen(false);
    setIsModeMenuOpen(false);
  }, [sidebarMode]);

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

  useLayoutEffect(() => {
    if (isModeMenuOpen && modeTriggerRef.current) {
      const rect = modeTriggerRef.current.getBoundingClientRect();
      setModeMenuStyle({
        position: "fixed",
        left: `${rect.right + 6}px`,
        bottom: `${window.innerHeight - rect.bottom}px`,
        zIndex: 9999,
      });
    }
  }, [isModeMenuOpen]);

  useOutsideClick([triggerRef, dropdownRef], () => {
    setAccountMenuOpen(false);
  });

  useOutsideClick([modeTriggerRef, modeDropdownRef], () => {
    setIsModeMenuOpen(false);
  });

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showForwardDocumentModal, setShowForwardDocumentModal] =
    useState(false);
  const [selectedDocId, _setSelectedDocId] = useState<string | null>(null);

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

  const isGlobalLoading = useGlobalLoading();

  const displayName = dbUser ? formatUserName(dbUser) : user?.email || "User";

  const avatarUrl =
    dbUser?.imageUrl ||
    user?.user_metadata?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=9B2335&color=fff&size=128`;

  let campusName;
  if (dbUser?.campus?.name != "University Administration") {
    campusName = dbUser?.campus?.name ? `${dbUser.campus.name} Campus` : null;
  } else {
    campusName = dbUser?.campus?.name ? `${dbUser.campus.name}` : null;
  }
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
      {canManageInstitution && (
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

  const isActuallyExpanded =
    sidebarMode === "expanded" ||
    (sidebarMode === "hover" && (isHovered || isModeMenuOpen));

  const sidebarClassName = `sidebar ${isActuallyExpanded ? "expanded" : "collapsed"} ${
    sidebarMode === "hover" && isActuallyExpanded ? "hover-overlay" : ""
  }`;

  const modeDropdown = (
    <div
      className="account-dropdown mode-dropdown"
      ref={modeDropdownRef}
      style={modeMenuStyle}
    >
      <button
        className={`account-dropdown-item ${sidebarMode === "expanded" ? "active" : ""}`}
        onClick={() => {
          setSidebarMode("expanded");
          setIsModeMenuOpen(false);
        }}
      >
        <i className="bi bi-layout-sidebar-inset" />
        Pin sidebar
      </button>
      <button
        className={`account-dropdown-item ${sidebarMode === "hover" ? "active" : ""}`}
        onClick={() => {
          setSidebarMode("hover");
          setIsModeMenuOpen(false);
        }}
      >
        <i className="bi bi-layout-sidebar" />
        Expand on hover
      </button>
      <button
        className={`account-dropdown-item ${sidebarMode === "collapsed" ? "active" : ""}`}
        onClick={() => {
          setSidebarMode("collapsed");
          setIsModeMenuOpen(false);
        }}
      >
        <i className="bi bi-box-arrow-in-left" />
        Collapse sidebar
      </button>
    </div>
  );

  return (
    <>
      {/* ── Left sidebar ── */}
      <aside
        className={sidebarClassName}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
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
          {(canManageInstitution ||
            (canManageDocuments && highestRoleLevel <= 2)) && (
            <NavLink
              to="/archives"
              className={({ isActive }) =>
                `sidebar-nav-link${isActive ? " active" : ""}`
              }
              title="Archives"
            >
              <i className="bi bi-archive" />
              <span>Archives</span>
            </NavLink>
          )}
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

        {/* Sidebar footer: mode selector toggle */}
        <div className="sidebar-footer">
          <button
            ref={modeTriggerRef}
            className="sidebar-toggle-btn active"
            onClick={() => setIsModeMenuOpen(!isModeMenuOpen)}
            title="Change sidebar mode"
          >
            <i
              className={`bi ${
                sidebarMode === "expanded"
                  ? "bi-layout-sidebar-inset"
                  : sidebarMode === "hover"
                    ? "bi-layout-sidebar"
                    : "bi-box-arrow-in-left"
              }`}
            />
          </button>
        </div>
      </aside>

      {/* Mode dropdown portal */}
      {isModeMenuOpen && createPortal(modeDropdown, document.body)}

      {/* ── Top bar ── */}
      <header className={`topbar ${isGlobalLoading ? "topbar-loading" : ""}`}>
        {/* Left: Logo and Breadcrumb */}
        <div className="topbar-left">
          <div className="topbar-brand">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 190 180"
              className="topbar-logo-svg plume-logo-shape"
            >
              <polygon points="110,0 190,0 190,60 160,90 160,30 80,30" />
              <polygon points="70,40 150,40 150,100 120,130 120,70 40,70" />
              <polygon points="30,80 110,80 110,140 10,180 80,110 0,110" />
            </svg>
            <span className="topbar-logo-text">Plume RMS</span>
          </div>

          {(campusName || deptName) && (
            <div className="topbar-breadcrumb">
              <span className="topbar-breadcrumb-sep">/</span>
              <span className="topbar-breadcrumb-root">CSU</span>
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

          <button
            className="topbar-icon-btn"
            title="Help & FAQs"
            onClick={() => navigate("/faq")}
          >
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
        {selectedDocId && showForwardDocumentModal && (
          <ForwardDocumentModal
            show={showForwardDocumentModal}
            onClose={() => setShowForwardDocumentModal(false)}
            documentId={selectedDocId}
          />
        )}
      </Suspense>
    </>
  );
}
