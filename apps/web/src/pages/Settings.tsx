import { useState, useEffect } from "react";
import { useTheme } from "../Theme";
import { trpc } from "../trpc";
import { AppearanceSettings } from "../components/Settings/AppearanceSettings";
import { SystemSettings } from "../components/Settings/SystemSettings";
import { RolesSettings } from "../components/Roles/RolesSettings";
import { DocumentTypesPanel } from "../components/DocumentTypes/DocumentTypsPanel";

type SettingsTab = "appearance" | "system" | "roles" | "documentTypes";

export function Settings() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");

  const { data: user } = trpc.user.getMe.useQuery();

  const canManageRoles = true;
  user?.roles.some(
    (role: { canManageRoles: boolean }) => role.canManageRoles
  ) || false;

  const canManageDocuments = true;
  user?.roles.some(
    (role: { canManageDocuments: boolean }) => role.canManageDocuments
  ) || false;

  useEffect(() => {
    document.body.setAttribute("data-bs-theme", theme);
  }, [theme]);

  const renderContent = () => {
    switch (activeTab) {
      case "appearance":
        return <AppearanceSettings />;
      case "system":
        return <SystemSettings />;
      case "roles":
        return canManageRoles ? (
          <RolesSettings />
        ) : (
          <div className="alert alert-danger">
            You do not have permission to view this page.
          </div>
        );
      case "documentTypes":
        return canManageDocuments ? (
          <DocumentTypesPanel />
        ) : (
          <div className="alert alert-danger">
            You do not have permission to view this page.
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4">Settings</h1>
      <div className="row">
        <div className="col-md-3">
          <div className="list-group">
            <button
              type="button"
              className={`list-group-item list-group-item-action ${
                activeTab === "appearance" ? "active" : ""
              }`}
              onClick={() => setActiveTab("appearance")}
            >
              Appearance
            </button>
            <button
              type="button"
              className={`list-group-item list-group-item-action ${
                activeTab === "system" ? "active" : ""
              }`}
              onClick={() => setActiveTab("system")}
            >
              System
            </button>
            {canManageRoles && (
              <button
                type="button"
                className={`list-group-item list-group-item-action ${
                  activeTab === "roles" ? "active" : ""
                }`}
                onClick={() => setActiveTab("roles")}
              >
                Roles
              </button>
            )}
            {canManageDocuments && (
              <button
                type="button"
                className={`list-group-item list-group-item-action ${
                  activeTab === "documentTypes" ? "active" : ""
                }`}
                onClick={() => setActiveTab("documentTypes")}
              >
                Document Types
              </button>
            )}
          </div>
        </div>

        <div className="col-md-9">{renderContent()}</div>
      </div>
    </div>
  );
}
