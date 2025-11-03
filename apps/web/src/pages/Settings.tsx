// /pages/Settings.tsx
import { useState, useEffect } from "react";
import { useTheme } from "../Theme";
import { RolesModal } from "../components/Roles/RolesModal";
import { trpc } from "../trpc";
import { DocumentTypesSettings } from "./DocumentTypesSettings";

export function Settings() {
  const { theme, toggleTheme } = useTheme();
  const [dbStatus, setDbStatus] = useState<"checked" | "unchecked" | "error">(
    "unchecked"
  );

  const { data: user } = trpc.user.getMe.useQuery();

  const canManageRoles =
    user?.roles.some(
      (userRole: { role: { canManageRoles: any } }) =>
        userRole.role.canManageRoles
    ) || false;

  useEffect(() => {
    document.body.setAttribute("data-bs-theme", theme);
  }, [theme]);

  const handleThemeToggle = () => {
    toggleTheme();
  };

  const checkDbHealth = () => {
    // Simulate an API call to your backend
    setTimeout(() => {
      setDbStatus("checked");
    }, 1000);
  };

  return (
    <div className="container mt-4">
      <h1>Settings</h1>

      {/* Appearance */}
      <div className="card mb-4">
        <div className="card-header">Appearance</div>
        <div className="card-body">
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="themeSwitch"
              checked={theme === "dark"}
              onChange={handleThemeToggle}
            />
            <label className="form-check-label" htmlFor="themeSwitch">
              Dark Mode
            </label>
          </div>
        </div>
      </div>

      {/* System */}
      <div className="card mb-4">
        <div className="card-header">System</div>
        <div className="card-body">
          <h5>Database Health</h5>
          <p>Check the connection status to the Prisma database.</p>
          <button className="btn btn-secondary" onClick={checkDbHealth}>
            Run Check
          </button>
          {dbStatus === "checked" && (
            <div className="alert alert-success mt-3">
              Connection successful.
            </div>
          )}
          {dbStatus === "error" && (
            <div className="alert alert-danger mt-3">Connection failed.</div>
          )}
        </div>
      </div>

      {/* Roles */}
      {canManageRoles && (
        <>
          <div className="card">
            <div className="card-header">Roles</div>
            <div className="card-body">
              <h5>Manage Roles</h5>
              <p>Create, edit, and delete roles, and assign them to users.</p>
              <button
                className="btn btn-primary"
                data-bs-toggle="modal"
                data-bs-target="#rolesModal"
              >
                Manage Roles
              </button>
            </div>
          </div>
          <RolesModal />
        </>
      )}
      <DocumentTypesSettings />
    </div>
  );
}
