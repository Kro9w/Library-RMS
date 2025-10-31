// apps/web/src/components/Navbar.tsx
import React, { useState, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "../supabase";
import { trpc } from "../trpc";
import { useOutsideClick } from "../hooks/OutsideClick";
import "./Navbar.css";

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

  // --- THIS IS THE FIX ---
  // We specify <HTMLDivElement> for the ref's type.
  const accountMenuRef = useRef<HTMLDivElement>(null);
  // -------------------------

  useOutsideClick(accountMenuRef, () => {
    setAccountMenuOpen(false);
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

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
            <div className="account-menu-wrapper" ref={accountMenuRef}>
              {isAccountMenuOpen && (
                <div className="account-menu-dropup">
                  <NavLink to="/account" className="nav-link">
                    <i className="bi bi-person-circle"></i>
                    <span className="link-text">My Account</span>
                  </NavLink>
                  <button
                    className="nav-link"
                    onClick={handleSignOut}
                    style={{ textAlign: "left" }}
                  >
                    <i className="bi bi-box-arrow-left"></i>
                    <span className="link-text">Sign Out</span>
                  </button>
                </div>
              )}

              <button
                className="user-profile as-button"
                onClick={() => setAccountMenuOpen(!isAccountMenuOpen)}
              >
                <img
                  src={
                    // @ts-ignore
                    dbUser.imageUrl ||
                    user.user_metadata?.avatar_url ||
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
              </button>
            </div>
          )}
          <hr style={{ borderColor: "var(--accent)", margin: "1rem 0" }} />
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