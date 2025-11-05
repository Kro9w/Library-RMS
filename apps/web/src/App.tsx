// apps/web/src/App.tsx
import React, { useState, useEffect } from "react";
import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import Documents from "./pages/Documents";
// import Upload from "./pages/Upload"; // This page is no longer needed
import Account from "./pages/Account";
import { Settings } from "./pages/Settings";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import {
  useSession,
  useSessionContext,
  useSupabaseClient, // Import useSupabaseClient
} from "@supabase/auth-helpers-react";
import { Navbar } from "./components/Navbar";
import { DocumentDetails } from "./pages/DocumentDetails";
import { Tags } from "./pages/Tags";
import { GraphView } from "./pages/GraphView";
import JoinOrganization from "./pages/JoinOrganization";
import { Users } from "./pages/Users";
import LogsPage from "./pages/LogsPage";
import { trpc } from "./trpc";
import { TRPCClientError } from "@trpc/client"; // Import TRPCClientError
import WordAuth from "./pages/WordAuth";
import { useIsAdmin } from "./hooks/usIsAdmin";

// 1. REMOVED: TopNavbar import is gone

const AdminRoute: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const { isAdmin, isLoading } = useIsAdmin();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AuthRedirectHandler: React.FC = () => {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const supabaseClient = useSupabaseClient(); // Get the Supabase client

  // FIX: Destructure isError and error from the hook
  const {
    data: dbUser,
    isLoading: isLoadingDbUser,
    isError,
    error,
  } = trpc.user.getMe.useQuery(undefined, {
    enabled: !!session,
    retry: 1,
    // FIX: Removed the invalid onError property
  });

  // FIX: Add a useEffect to handle the error
  useEffect(() => {
    if (isError && error) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        // This fires if the backend check fails (e.g., user not in DB)
        // We sign the user out of Supabase to clear the session
        supabaseClient.auth.signOut();
      }
    }
  }, [isError, error, supabaseClient]);

  useEffect(() => {
    if (!isLoadingDbUser && session) {
      if (dbUser && !dbUser.organizationId && location.pathname !== "/join") {
        navigate("/join", { replace: true });
      } else if (
        dbUser &&
        dbUser.organizationId &&
        location.pathname === "/join"
      ) {
        navigate("/", { replace: true });
      }
    }
  }, [session, dbUser, isLoadingDbUser, navigate, location.pathname]);

  return null;
};

const AppContent: React.FC = () => {
  const session = useSession();
  const { isLoading: isLoadingSession } = useSessionContext();
  const location = useLocation();

  // 2. RESTORED: The original state for the collapsible sidebar
  const [isCollapsed, setIsCollapsed] = useState(false);
  const toggleNavbar = () => setIsCollapsed(!isCollapsed);

  if (isLoadingSession) {
    return null; // Return nothing to avoid flashing a loader
  }

  const showNavbar = session && location.pathname !== "/join";

  // 3. RESTORED: The original class logic for main-content
  const mainContentClass = showNavbar
    ? `main-content ${isCollapsed ? "collapsed" : "expanded"}`
    : "main-content-logged-out";

  return (
    <>
      {session && <AuthRedirectHandler />}

      {/* 4. RESTORED: We only render the single, powerful Navbar */}
      {showNavbar && (
        <Navbar isCollapsed={isCollapsed} onToggle={toggleNavbar} />
      )}

      <div className={mainContentClass}>
        <Routes>
          {/* ... (All your Routes are correct and unchanged) ... */}
          <Route path="/word-auth" element={<WordAuth />} />
          <Route
            path="/login"
            element={!session ? <LoginPage /> : <Navigate to="/" replace />}
          />
          <Route
            path="/signup"
            element={!session ? <SignUpPage /> : <Navigate to="/" replace />}
          />
          <Route
            path="/"
            element={session ? <Dashboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/documents"
            element={session ? <Documents /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/documents/:id"
            element={
              session ? <DocumentDetails /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/tags"
            element={session ? <Tags /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/graph"
            element={session ? <GraphView /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/users"
            element={
              session ? (
                <AdminRoute>
                  <Users />
                </AdminRoute>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/account"
            element={session ? <Account /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/settings"
            element={session ? <Settings /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/logs"
            element={
              session ? (
                <AdminRoute>
                  <LogsPage />
                </AdminRoute>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/join"
            element={
              session ? <JoinOrganization /> : <Navigate to="/login" replace />
            }
          />
          {session && <Route path="*" element={<Navigate to="/" replace />} />}
        </Routes>
      </div>
    </>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
