import React, { useState, useEffect } from "react";
import "./App.css"; // Make sure App.css is imported
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
import Upload from "./pages/Upload";
import Account from "./pages/Account";
import { Settings } from "./pages/Settings";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import { useSession, useSessionContext } from "@supabase/auth-helpers-react";
import { Navbar } from "./components/Navbar";
import { DocumentDetails } from "./pages/DocumentDetails";
import { Tags } from "./pages/Tags";
import { GraphView } from "./pages/GraphView";
import JoinOrganization from "./pages/JoinOrganization";
import { Users } from "./pages/Users";
import { trpc } from "./trpc";

const AuthRedirectHandler: React.FC = () => {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: dbUser, isLoading: isLoadingDbUser } = trpc.user.getMe.useQuery(
    undefined,
    {
      enabled: !!session,
      retry: 1,
    }
  );

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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const toggleNavbar = () => setIsCollapsed(!isCollapsed);

  if (isLoadingSession) {
    return <div>Loading...</div>;
  }

  const showNavbar = session && location.pathname !== "/join";

  const mainContentClass = showNavbar
    ? `main-content ${isCollapsed ? "collapsed" : "expanded"}`
    : "main-content-logged-out";

  return (
    <>
      {session && <AuthRedirectHandler />}
      {showNavbar && <Navbar isCollapsed={isCollapsed} onToggle={toggleNavbar} />}
      <div className={mainContentClass}>
        <Routes>
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
            path="/upload"
            element={session ? <Upload /> : <Navigate to="/login" replace />}
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
            element={session ? <Users /> : <Navigate to="/login" replace />}
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
