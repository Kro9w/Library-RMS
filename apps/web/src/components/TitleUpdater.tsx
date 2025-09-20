import { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";

export default function TitleUpdater() {
  const location = useLocation();
  const params = useParams();

  useEffect(() => {
    // Map of routes to page titles
    const titles: Record<string, string> = {
      "/": "Dashboard",
      "/dashboard": "Dashboard",
      "/documents": "Documents",
      "/upload": "Upload Document",
      "/tags": "Tags",
      "/users": "Users",
      "/settings": "Settings",
      "/account": "My Account",
      "/login": "Login",
      "/signup": "Sign Up",
    };

    let path = location.pathname;
    let title = titles[path];

    // Handle dynamic document details route
    if (!title && path.startsWith("/documents/")) {
      title = `Document Details: ${params.documentId ?? ""}`;
    }

    // Fallback: convert path into readable title
    if (!title) {
      title =
        path === "/"
          ? "Dashboard"
          : path
              .replace("/", "")
              .split("/")
              .map(
                (word) => word.charAt(0).toUpperCase() + word.slice(1)
              )
              .join(" - ");
    }

    document.title = `${title} | Folio RMS`; // ✅ Final title format
  }, [location, params]);

  return null; // No UI output
}
