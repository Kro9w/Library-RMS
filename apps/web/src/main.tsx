// apps/web/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { trpc, trpcClient } from "./trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider, createTheme } from "@mantine/core";
import "@mantine/core/styles.css";
import { ThemeProvider, useTheme } from "./Theme"; // Import useTheme
import { AuthProvider } from "./context/AuthContext";
import { RouterProvider } from "react-router-dom";
import { router } from "./App";

const queryClient = new QueryClient();

// Keep your theme definition using hex codes
const mantineTheme = createTheme({
  colors: {
    primary: [
      "#ffe5e7",
      "#ffb8be",
      "#ff8a93",
      "#ff5a66",
      "#ff2c3b",
      "#BA3B46",
      "#a5343d",
      "#7d282e",
      "#551c1f",
      "#2e0f11",
    ],
    accent: [
      "#fff4e3",
      "#fde4b9",
      "#fbd48c",
      "#fac35c",
      "#ED9B40",
      "#d88c3a",
      "#b0722f",
      "#875823",
      "#5f3e18",
      "#37230b",
    ],
  },
  primaryColor: "primary",
  fontFamily: "system-ui, Avenir, Helvetica, Arial, sans-serif",
  components: {
    Button: {
      defaultProps: { color: "primary" },
    },
  },
});

// Wrapper component remains the same
function MantineWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme(); // Get theme state

  return (
    // Pass the theme state explicitly via forceColorScheme
    <MantineProvider theme={mantineTheme} forceColorScheme={theme}>
      {children}
    </MantineProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      {/* Use the wrapper component */}
      <MantineWrapper>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <RouterProvider router={router} />
            </AuthProvider>
          </QueryClientProvider>
        </trpc.Provider>
      </MantineWrapper>
    </ThemeProvider>
  </React.StrictMode>
);
