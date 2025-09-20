import React from "react";
import { NavLink } from "react-router-dom";
import { UserButton, useUser } from "@clerk/clerk-react";
import "./Navbar.css";


interface NavbarProps {
  isExpanded: boolean;
  setIsExpanded: (isExpanded: boolean) => void;
}

export function Navbar({ isExpanded, setIsExpanded }: NavbarProps) {
  const { user } = useUser();

  const navItems = [
    { to: "/", name: "Dashboard", icon: "bi-grid-1x2-fill" },
    { to: "/documents", name: "Documents", icon: "bi-file-earmark-text-fill" },
    { to: "/upload", name: "Upload", icon: "bi-upload" },
    { to: "/tags", name: "Tags", icon: "bi-tags-fill" },
    { to: "/settings", name: "Settings", icon: "bi-gear-fill" },
    { to: "/users", name: "Users", icon: "bi-people-fill" },
  ];

  return (
    <nav className={`sidebar ${isExpanded ? "expanded" : "collapsed"}`}>
      <div className="sidebar-content">
        <ul className="nav flex-column">
          <li className="nav-item logo-item">
            <span className="nav-link text-white fs-4">
              <img src="/foliotwo.svg" alt="Folio" style={{ height: '30px', marginRight: '10px' }} />
              <span className="link-text">Folio</span>  
            </span>
          </li>
          {/* This part renders the actual navigation links */}
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
  );
}
