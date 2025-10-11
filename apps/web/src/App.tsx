import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
  useParams,
} from "react-router-dom";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  useAuth,
  useUser,
} from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";

import { trpc } from "@/trpc";
import { Navbar } from "@/components/Navbar";
import { Dashboard } from "@/pages/Dashboard";
import { Documents } from "@/pages/Documents";
import { Upload } from "@/pages/Upload";
import { Users } from "@/pages/Users";
import { Tags } from "@/pages/Tags";
import { Settings } from "@/pages/Settings";
import { AccountPage } from "@/pages/Account";
import { LoginPage } from "@/pages/LoginPage";
import { SignUpPage } from "@/pages/SignUpPage";
import { DocumentDetails } from "@/pages/DocumentDetails";
import { GraphView } from "@/pages/GraphView";
import { JoinOrganization } from "@/pages/JoinOrganization";
import { ThemeProvider } from "@/Theme";
import "@/App.css";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Component to handle the main application layout and routing
function AppLayout() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [isNavbarExpanded, setIsNavbarExpanded] = useState(false);

  // Effect to redirect users without an organization
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

  // Effect to update the document title based on the route
  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "Dashboard",
      "/documents": "Documents",
      "/upload": "Upload Document",
      "/tags": "Tags",
      "/users": "Users",
      "/settings": "Settings",
      "/account": "My Account",
      "/graph": "Ownership Graph",
      "/join-organization": "Join Organization",
      "/login": "Login",
      "/signup": "Sign Up",
    };
    let path = location.pathname;
    let title = titles[path];

    if (!title && path.startsWith("/documents/")) {
      title = `Document: ${params.documentId ?? "Details"}`;
    }

    document.title = `${title || "Folio"} | Folio RMS`;
  }, [location, params]);

  if (!isLoaded) {
    return <div className="loading-container">Loading Application...</div>;
  }

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
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
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
                    <Route
                      path="/join-organization"
                      element={<JoinOrganization />}
                    />
                  </Routes>
                </SignedIn>
                <SignedOut>
                  <Navigate to="/login" />
                </SignedOut>
              </>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

// This component creates the authenticated tRPC client using Clerk's `useAuth` hook.
function App() {
  const { getToken } = useAuth();
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "http://localhost:3000/trpc",
          async headers() {
            const token = await getToken();
            return {
              Authorization: token ? `Bearer ${token}` : "",
            };
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AppLayout />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

// This is the new root component. It wraps the app with providers that do NOT need access to the router.
export default function AppWrapper() {
  if (!clerkPubKey) {
    throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env");
  }

  return (
    <ThemeProvider>
      <ClerkProvider publishableKey={clerkPubKey}>
        <App />
      </ClerkProvider>
    </ThemeProvider>
  );
}
