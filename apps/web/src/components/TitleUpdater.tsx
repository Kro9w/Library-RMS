import { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";

export default function TitleUpdater() {
  const location = useLocation();
  const params = useParams();

  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "Dashboard",
      "/dashboard": "Dashboard",
      "/documents": "Documents",
      "/upload": "Upload Document",
      "/users": "Users",
      "/settings": "Settings",
      "/account": "My Account",
      "/login": "Login",
      "/signup": "Sign Up",
    };

    const path = location.pathname;
    let title = titles[path];

    if (!title && path.startsWith("/documents/")) {
      title = `Document Details: ${params.documentId ?? ""}`;
    }

    if (!title) {
      title =
        path === "/"
          ? "Dashboard"
          : path
              .replace("/", "")
              .split("/")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" - ");
    }

    document.title = `${title} | Plume RMS`;
  }, [location, params]);

  return null;
}
