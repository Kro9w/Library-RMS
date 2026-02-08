import React, { useState, useEffect, Suspense } from "react";
import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  useSession,
  useSessionContext,
  useSupabaseClient,
} from "./contexts/SessionContext";

import { Navbar } from "./components/Navbar";
import { trpc } from "./trpc";
import { TRPCClientError } from "@trpc/client";
import { useIsAdmin } from "./hooks/usIsAdmin";
import { LoadingAnimation } from "./components/ui/LoadingAnimation";

// Lazy-loaded components
const Dashboard = React.lazy(() =>
  import("./pages/Dashboard").then((module) => ({ default: module.Dashboard }))
);
const Documents = React.lazy(() => import("./pages/Documents"));
const Account = React.lazy(() => import("./pages/Account"));
const Settings = React.lazy(() =>
  import("./pages/Settings").then((module) => ({ default: module.Settings }))
);
const LoginPage = React.lazy(() => import("./pages/LoginPage"));
const SignUpPage = React.lazy(() => import("./pages/SignUpPage"));
const DocumentDetails = React.lazy(() =>
  import("./pages/DocumentDetails").then((module) => ({
    default: module.DocumentDetails,
  }))
);
const GraphView = React.lazy(() =>
  import("./pages/GraphView").then((module) => ({ default: module.GraphView }))
);
const JoinOrganization = React.lazy(() => import("./pages/JoinOrganization"));
const Users = React.lazy(() =>
  import("./pages/Users").then((module) => ({ default: module.Users }))
);
const LogsPage = React.lazy(() => import("./pages/LogsPage"));
const WordAuth = React.lazy(() => import("./pages/WordAuth"));

const AdminRoute: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const { isAdmin, isLoading } = useIsAdmin();

  if (isLoading) {
    return <LoadingAnimation />;
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

  const {
    data: dbUser,
    isLoading: isLoadingDbUser,
    isError,
    error,
  } = trpc.user.getMe.useQuery(undefined, {
    enabled: !!session,
    retry: 1,
  });

  useEffect(() => {
    if (isError && error) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
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

  const [isCollapsed, setIsCollapsed] = useState(false);
  const toggleNavbar = () => setIsCollapsed(!isCollapsed);

  if (isLoadingSession) {
    return <LoadingAnimation />;
  }

  const showNavbar = session && location.pathname !== "/join";

  const mainContentClass = showNavbar
    ? `main-content ${isCollapsed ? "collapsed" : "expanded"}`
    : "main-content-logged-out";

  return (
    <>
      {session && <AuthRedirectHandler />}

      {showNavbar && (
        <Navbar isCollapsed={isCollapsed} onToggle={toggleNavbar} />
      )}

      <div className={mainContentClass}>
        <Suspense fallback={<LoadingAnimation />}>
          <Routes>
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
              element={
                session ? <Dashboard /> : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/documents"
              element={
                session ? <Documents /> : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/documents/:id"
              element={
                session ? <DocumentDetails /> : <Navigate to="/login" replace />
              }
            />
            <Route path="/graph" element={<GraphView />} />
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
            <Route path="/settings" element={<Settings />} />
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
                session ? (
                  <JoinOrganization />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            {session && (
              <Route path="*" element={<Navigate to="/" replace />} />
            )}
          </Routes>
        </Suspense>
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
