// apps/web/srcV/App.tsx
import React, { useState } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { LoadingOverlay } from "@mantine/core";
import { Navbar } from "./components/Navbar";
import { Dashboard } from "./pages/Dashboard";
import { Documents } from "./pages/Documents";
import { DocumentDetails } from "./pages/DocumentDetails";
import { GraphView } from "./pages/GraphView";
import { Settings } from "./pages/Settings";
import { Tags } from "./pages/Tags";
import { Upload } from "./pages/Upload";
import { Users } from "./pages/Users";
import { Account } from "./pages/Account";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import JoinOrganization from "./pages/JoinOrganization";
import { useAuth } from "./context/AuthContext";
import "./App.css";

// 1. --- ENTIRE 'AppLayout' FUNCTION REMOVED ---
// The router now uses 'MainContent' directly,
// so this function is no longer needed and caused the error.

/**
 * This is the main layout component.
 * It manages the sidebar state and renders the pages.
 */
function MainContent() {
  const { dbUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // This is the core onboarding logic
  if (!dbUser?.organizationId) {
    // If user is authenticated but has no org, redirect to onboarding
    return <Navigate to="/join-organization" replace />;
  }

  return (
    <>
      {/* We pass the state and the setter to the Navbar */}
      <Navbar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      {/* We apply the class to the main content area */}
      <main
        className={`main-content ${
          isSidebarCollapsed ? "collapsed" : "expanded"
        }`}
      >
        <Outlet />
      </main>
    </>
  );
}

/**
 * A layout for public pages (Login, Signup).
 * If the user is already logged in, it redirects them.
 */
function PublicLayout() {
  const { user, dbUser } = useAuth();

  if (user && dbUser?.organizationId) {
    return <Navigate to="/" replace />;
  }

  if (user && !dbUser?.organizationId) {
    return <Navigate to="/join-organization" replace />;
  }

  return <Outlet />;
}

/**
 * A component to protect routes.
 * It checks for an authenticated user.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingOverlay visible c="blue" />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// Define the router
export const router = createBrowserRouter([
  {
    // Protected routes (require login AND onboarding)
    path: "/",
    element: (
      <ProtectedRoute>
        <MainContent />
      </ProtectedRoute>
    ),
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "/documents", element: <Documents /> },
      { path: "/documents/:id", element: <DocumentDetails /> },
      { path: "/graph", element: <GraphView /> },
      { path: "/settings", element: <Settings /> },
      { path: "/tags", element: <Tags /> },
      { path: "/upload", element: <Upload /> },
      { path: "/users", element: <Users /> },
      { path: "/account", element: <Account /> },
    ],
  },
  {
    // Onboarding route (requires login, but NOT onboarding)
    path: "/join-organization",
    element: (
      <ProtectedRoute>
        <JoinOrganization />
      </ProtectedRoute>
    ),
  },
  {
    // Public routes (login/signup)
    path: "/",
    element: <PublicLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/signup", element: <SignUpPage /> },
    ],
  },
]);

// This component is no longer used, but main.tsx imports it.
export function App() {
  return <div>This component is not used.</div>;
}
