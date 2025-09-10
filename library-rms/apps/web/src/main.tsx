import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css";
import { ClerkProvider } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  trpc,
  trpcClient,
} from "/Users/jakekrow/library-rms/library-rms/apps/web/src/trpc";

const pk = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!pk) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env");

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={pk}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </trpc.Provider>
    </ClerkProvider>
  </StrictMode>
);
