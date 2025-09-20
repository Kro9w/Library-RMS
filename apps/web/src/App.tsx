import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation, useParams } from "react-router-dom";
import { Navbar } from "./components/Navbar"; // Import the navbar

// Import all the pages you created
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
import "./App.css";

// Clerk components for protecting routes
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

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
      {/* The Navbar will only be shown for signed-in users */}
      <SignedIn>
        {/* Pass the state and the function to change it down to the Navbar */}
        <Navbar
          isExpanded={isNavbarExpanded}
          setIsExpanded={setIsNavbarExpanded}
        />
      </SignedIn>

      {/* The main content area now has a dynamic class based on the navbar's state */}
      <main
        className={`main-content ${
          isNavbarExpanded ? "expanded" : "collapsed"
        }`}
      >
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />

          {/* Protected Routes */}
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
                    {/* Add a catch-all or 404 page here if you want */}
                  </Routes>
                </SignedIn>
                <SignedOut>
                  <RedirectToSignIn />
                </SignedOut>
              </>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
