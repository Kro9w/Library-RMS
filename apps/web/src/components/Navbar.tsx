// apps/web/src/components/Navbar.tsx
import { useState, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useUser } from "../contexts/SessionContext";
import { supabase } from "../supabase";
import { trpc } from "../trpc";
import { useOutsideClick } from "../hooks/OutsideClick";
import { useIsAdmin } from "../hooks/usIsAdmin";
import "./Navbar.css";

// --- Imports for Modals ---
import { useForm } from "react-hook-form";
import { UploadModal } from "./UploadModal";
import { ConfirmModal } from "./ConfirmModal";

// Define the form types for the transfer modal
type TransferFormData = {
  controlNumber: string;
  email: string;
};

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

  // State for account menu
  const [isAccountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(accountMenuRef, () => {
    setAccountMenuOpen(false);
  });

  // --- Modal State and Logic ---
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const { register, handleSubmit, reset } = useForm<TransferFormData>();

  const { mutate: transferMutation, isPending: isTransferring } =
    trpc.documents.sendDocument.useMutation({
      onSuccess: () => {
        alert("Document transferred successfully!");
        setShowTransferModal(false);
        reset();
      },
      onError: (error) => {
        alert(`Error transferring document: ${error.message}`);
      },
    });

  const handleCloseTransferModal = () => {
    setShowTransferModal(false);
    reset();
  };

  // --- THIS IS THE FIX ---
  // Added the missing '=>' to define the arrow function
  const onConfirmTransfer = (formData: TransferFormData) => {
    transferMutation({
      documentId: formData.controlNumber, // Changed from docId to documentId
      recipientId: formData.email, // Changed from newOwnerEmail to recipientId
      tagIds: [], // Added missing tagIds property
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const { isAdmin } = useIsAdmin();

  const avatarUrl =
    dbUser?.imageUrl ||
    user?.user_metadata?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      dbUser?.name || dbUser?.email || "User"
    )}&background=random&color=fff&size=128`;

  return (
    <>
      <div className="sidebar-wrapper">
        <nav
          className={`sidebar-float ${isCollapsed ? "collapsed" : "expanded"}`}
        >
          <div className="sidebar-content">
            {/* Logo */}
            <div className="logo-item">
              <a href="/" className="nav-link">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 119.4 152.21"
                  width="24"
                  height="24"
                  style={{
                    fill: "var(--accent)",
                    background: "transparent",
                    width: "50px",
                    height: "50px",
                    marginRight: "0.4rem",
                    marginLeft: "0.5rem",
                  }}
                >
                  <path
                    fillRule="evenodd"
                    d="M119.25,44.29h-30.63c-.21-8.67,.8-19.25-3.3-24.72-3.64-5-14.23-6.25-22.15-3.77-13.27,4.93-21.94,17.44-29.95,27.78-3.32,4.28-7.25,9.8-13.43,11.07-7.05,1.45-9.54-5.24-11.05-10.11-3.94-14.68,1.31-31.7,5.63-42.44,.39,.08,.79,.16,1.18,.02v1.18c-.98,3.38-.29,7.88,.47,10.37,3.08,11.1,10.5,15.34,22.64,10.13C55.43,17.33,83.75-11.39,107.94,4.97c3.89,2.71,6.71,6.87,8.48,10.84,3.56,7.28,3.02,17.98,2.83,28.49Zm-13.19,66.68c-9.92-.16-20.05-.31-30.18-.68,.36-9.01,1.75-27.73-4.95-31.81-2.51-1.24-6.96-1.03-11.05-1.18-9.91,22.05-19.11,43.88-33.25,61.26-5.68,7.28-14.02,13.64-26.62,13.64,.08-25.99,.16-52,.24-77.99H36.05c6.36-14.14,12.72-28.28,18.87-42.62,9.01,.29,17.81,.37,26.39,.45-6.21,13.75-14.62,27.39-19.79,42.18,28.48-.25,44.98,8.54,44.53,36.76ZM1.88,118.77c16.54-.24,26.91-27.76,32.28-40.79v-.45c-10.85,.18-25.97,1.09-30.39,7.54-3.59,5.61-2,24.9-1.88,33.69Z"
                  />
                </svg>
                <span className="link-text" style={{ fontSize: "2.3rem" }}>
                  Folio
                </span>
              </a>
            </div>

            {/* Action Buttons */}
            <div className="sidebar-actions">
              <button
                className="nav-link"
                onClick={() => setShowUploadModal(true)}
              >
                <i className="bi bi-cloud-arrow-up-fill"></i>
                <span className="link-text">Upload</span>
              </button>
              <button
                className="nav-link"
                onClick={() => setShowTransferModal(true)}
              >
                <i className="bi bi-box-arrow-right"></i>
                <span className="link-text">Transfer</span>
              </button>
            </div>

            {/* Main Navigation */}
            <div className="sidebar-nav-links">
              <NavLink to="/" end className="nav-link">
                <i className="bi bi-grid-fill"></i>
                <span className="link-text">Dashboard</span>
              </NavLink>
              <NavLink to="/documents" className="nav-link">
                <i className="bi bi-file-earmark-text-fill"></i>
                <span className="link-text">Documents</span>
              </NavLink>
              <NavLink to="/tags" className="nav-link">
                <i className="bi bi-tags-fill"></i>
                <span className="link-text">Tags</span>
              </NavLink>
              <NavLink to="/graph" className="nav-link">
                <i className="bi bi-share-fill"></i>
                <span className="link-text">Graph</span>
              </NavLink>
              {isAdmin && (
                <NavLink to="/users" className="nav-link">
                  <i className="bi bi-people-fill"></i>
                  <span className="link-text">Users</span>
                </NavLink>
              )}
              {isAdmin && (
                <NavLink to="/logs" className="nav-link">
                  <i className="bi bi-journal-text"></i>
                  <span className="link-text">Logs</span>
                </NavLink>
              )}
            </div>
          </div>

          {/* Footer with Dropdown */}
          <div className="sidebar-float-footer">
            {user && dbUser && (
              <div className="account-menu-wrapper" ref={accountMenuRef}>
                {isAccountMenuOpen && (
                  <div className="account-menu-dropup">
                    <div className="dropdown-header">
                      <img src={avatarUrl} alt="User Avatar" />
                      <div className="user-details">
                        <span className="user-name">{dbUser.name}</span>
                        <span className="user-email">{dbUser.email}</span>
                      </div>
                    </div>
                    <NavLink
                      to="/account"
                      className="dropdown-item"
                      onClick={() => setAccountMenuOpen(false)}
                    >
                      <i className="bi bi-person-circle"></i> My Account
                    </NavLink>
                    <NavLink
                      to="/settings"
                      className="dropdown-item"
                      onClick={() => setAccountMenuOpen(false)}
                    >
                      <i className="bi bi-gear-fill"></i> Settings
                    </NavLink>
                    <button className="dropdown-item" onClick={handleSignOut}>
                      <i className="bi bi-box-arrow-left"></i> Sign Out
                    </button>
                  </div>
                )}

                {/* This is the new trigger button */}
                <button
                  className="user-profile-button"
                  onClick={() => setAccountMenuOpen(!isAccountMenuOpen)}
                >
                  <img src={avatarUrl} alt="User Avatar" />
                  <div className="user-info single-line">
                    <span className="user-greeting">Hello, </span>
                    <span className="user-name">{dbUser.name}</span>
                  </div>
                </button>
              </div>
            )}

            {/* This is the original collapse button */}
            <button className="collapse-btn" onClick={onToggle}>
              <i
                className={`bi ${
                  isCollapsed ? "bi-chevron-right" : "bi-chevron-left"
                }`}
              ></i>
            </button>
          </div>
        </nav>
      </div>

      {/* Modals (Unchanged) */}
      <UploadModal
        show={showUploadModal}
        onClose={() => setShowUploadModal(false)}
      />

      <ConfirmModal
        show={showTransferModal}
        onClose={handleCloseTransferModal}
        onConfirm={handleSubmit(onConfirmTransfer)}
        title="Transfer Document"
        isConfirming={isTransferring}
      >
        <fieldset disabled={isTransferring}>
          <label
            htmlFor="controlNumber"
            className="form-label"
            style={{ display: "block", marginBottom: "0.5rem" }}
          >
            Document Control Number:
          </label>
          <input
            {...register("controlNumber", { required: true })}
            type="text"
            id="controlNumber"
            className="form-control"
            placeholder="Scan or Enter Control Number"
            style={{ width: "100%", marginBottom: "1rem" }}
          />
          <label
            htmlFor="email"
            className="form-label"
            style={{ display: "block", marginBottom: "0.5rem" }}
          >
            New Owner's Email:
          </label>
          <input
            {...register("email", { required: true })}
            type="email"
            id="email"
            className="form-control"
            placeholder="user@example.com"
            style={{ width: "100%" }}
          />
        </fieldset>
      </ConfirmModal>
    </>
  );
}
