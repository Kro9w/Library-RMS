// apps/web/src/components/Navbar.tsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

// 1. ADDED: Props interface
interface NavbarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Navbar({ isCollapsed, onToggle }: NavbarProps) {
  // 2. REMOVED: Internal 'isCollapsed' state
  const { user, dbUser, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  // 3. This component now uses the props
  return (
    <div className="sidebar-wrapper">
      <nav
        className={`sidebar-float ${isCollapsed ? "collapsed" : "expanded"}`}
      >
        <div className="sidebar-content">
          <div className="logo-item">
            <a href="/" className="nav-link">
              <i className="bi bi-book"></i>
              <span className="link-text">Folio</span>
            </a>
          </div>

          <NavLink to="/" end className="nav-link">
            <i className="bi bi-grid-fill"></i>
            <span className="link-text">Dashboard</span>
          </NavLink>

          <NavLink to="/documents" className="nav-link">
            <i className="bi bi-file-earmark-text-fill"></i>
            <span className="link-text">Documents</span>
          </NavLink>

          <NavLink to="/upload" className="nav-link">
            <i className="bi bi-upload"></i>
            <span className="link-text">Upload</span>
          </NavLink>

          <NavLink to="/tags" className="nav-link">
            <i className="bi bi-tags-fill"></i>
            <span className="link-text">Tags</span>
          </NavLink>

          <NavLink to="/graph" className="nav-link">
            <i className="bi bi-share-fill"></i>
            <span className="link-text">Graph</span>
          </NavLink>

          <NavLink to="/users" className="nav-link">
            <i className="bi bi-people-fill"></i>
            <span className="link-text">Users</span>
          </NavLink>
        </div>

        <div className="sidebar-float-footer">
          {user && dbUser && (
            <div className="user-profile">
              <img
                src={
                  dbUser.imageUrl ||
                  user.photoURL ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    dbUser.name || dbUser.email
                  )}`
                }
                alt="User"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
              <div className="user-info">
                <span className="user-name">{dbUser.name}</span>
                <span className="user-email">{dbUser.email}</span>
              </div>
            </div>
          )}

          <NavLink to="/account" className="nav-link">
            <i className="bi bi-person-circle"></i>
            <span className="link-text">My Account</span>
          </NavLink>

          <button
            className="nav-link"
            onClick={handleSignOut}
            style={{ width: "100%" }}
          >
            <i className="bi bi-box-arrow-left"></i>
            <span className="link-text">Sign Out</span>
          </button>

          <hr style={{ borderColor: "var(--accent)", margin: "1rem 0" }} />

          {/* 4. Use the 'onToggle' prop */}
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
  );
}
