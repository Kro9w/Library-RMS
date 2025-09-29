import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
  useParams,
} from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Dashboard } from "./pages/Dashboard";
import { Documents } from "./pages/Documents";
import { DocumentDetails } from "./pages/DocumentDetails";
import { Upload } from "./pages/Upload";
import { Tags } from "./pages/Tags";
import { Users } from "./pages/Users";
import { Settings } from "./pages/Settings";
import { LoginPage } from "./pages/LoginPage";
import { SignUpPage } from "./pages/SignUpPage";
import { AccountPage } from "./pages/Account";
import { JoinOrganization } from "./pages/JoinOrganization";
import { GraphView } from "./pages/GraphView";
import "./App.css";

import {
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  useUser,
} from "@clerk/clerk-react";

function AppRoutes() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (
      isLoaded &&
      user &&
      user.organizationMemberships.length === 0 &&
      location.pathname !== "/join-organization" &&
      location.pathname !== "/login" &&
      location.pathname !== "/signup"
    ) {
      navigate("/join-organization");
    }
  }, [isLoaded, user, navigate, location.pathname]);

  if (!isLoaded) {
    return (
      <div className="container mt-4 text-center">
        Loading authentication...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/join-organization" element={<JoinOrganization />} />{" "}
      {/* 3. Add the new route */}
      <Route
        path="/*"
        element={
          <>
            <SignedIn>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/documents" element={<Documents />} />
                <Route
                  path="/documents/:documentId"
                  element={<DocumentDetails />}
                />
                <Route path="/upload" element={<Upload />} />
                <Route path="/tags" element={<Tags />} />
                <Route path="/users" element={<Users />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/graph" element={<GraphView />} />
              </Routes>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        }
      />
    </Routes>
  );
}

export default function App() {
  const [isNavbarExpanded, setIsNavbarExpanded] = useState(false);
  const location = useLocation();
  const params = useParams();

  // ✅ Dynamically update document.title when the route changes
  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "Dashboard",
      "/dashboard": "Dashboard",
      "/documents": "Documents",
      "/upload": "Upload Document",
      "/tags": "Tags",
      "/users": "Users",
      "/settings": "Settings",
      "/account": "My Account",
      "/login": "Login",
      "/signup": "Sign Up",
    };

    let path = location.pathname;
    let title = titles[path];

    if (!title && path.startsWith("/documents/")) {
      title = `Document Details: ${params.documentId ?? ""}`;
    }

    if (!title) {
      title =
        path === "/"
          ? "Dashboard"
          : path
              .replace("/", "")
              .split("/")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" - ");
    }

    document.title = `${title} | Folio RMS`;
  }, [location, params]);

  return (
    <div className="d-flex">
      <SignedIn>
        <Navbar
          isExpanded={isNavbarExpanded}
          setIsExpanded={setIsNavbarExpanded}
        />
      </SignedIn>
      <main
        className={`main-content ${
          isNavbarExpanded ? "expanded" : "collapsed"
        }`}
      >
        <AppRoutes />
      </main>
    </div>
  );
}
