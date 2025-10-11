import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AppWrapper from "./App"; // The default export from App.tsx is now AppWrapper
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

// The entry point is now much simpler. It only needs to provide the router context
// and render the AppWrapper, which handles all other providers.
root.render(
  <StrictMode>
    <BrowserRouter>
      <AppWrapper />
    </BrowserRouter>
  </StrictMode>
);
