import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, trpcClient } from "./trpc.ts";
// import { AuthProvider } from './context/AuthContext.tsx'; // Remove this
import { SessionContextProvider } from "@supabase/auth-helpers-react"; // Add this
import { supabase } from "./supabase.ts"; // Add this
import { ThemeProvider } from "./Theme.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SessionContextProvider supabaseClient={supabase}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            {/* <AuthProvider> // Remove this wrapper
              <App />
            </AuthProvider> */}
            <App /> {/* App is now a direct child */}
          </ThemeProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </SessionContextProvider>
  </React.StrictMode>
);
