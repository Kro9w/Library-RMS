import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // 👇 1. Import BrowserRouter
import { ClerkProvider } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { trpc, trpcClient } from "./trpc"; // 👇 (Cleaned up this import path)
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import { ThemeProvider } from "./Theme";

const pk = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!pk) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env");

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={pk}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ThemeProvider>
              <App />
            </ThemeProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </trpc.Provider>
    </ClerkProvider>
  </StrictMode>
);
