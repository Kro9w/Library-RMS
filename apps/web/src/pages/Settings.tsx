import { useState, useEffect } from "react";
import { useTheme } from "../Theme";
import { trpc } from "../trpc";
import { AppearanceSettings } from "../components/Settings/AppearanceSettings";
import { SystemSettings } from "../components/Settings/SystemSettings";
import { RolesSettings } from "../components/Roles/RolesSettings";
import { DocumentTypesPanel } from "../components/DocumentTypes/DocumentTypsPanel";
import { RetentionPolicyPanel } from "../components/Retention/RetentionPolicyPanel";
import "./Settings.css";

type SettingsTab =
  | "appearance"
  | "system"
  | "roles"
  | "documentTypes"
  | "retention";

export function Settings() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");

  const { data: user } = trpc.user.getMe.useQuery();

  const canManageRoles =
    user?.roles.some(
      (role: { canManageRoles: boolean }) => role.canManageRoles
    ) || false;

  const canManageDocuments =
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
      case "retention":
        return canManageDocuments ? (
          <RetentionPolicyPanel />
        ) : (
          <div className="alert alert-danger">
            You do not have permission to view this page.
          </div>
        );
      default:
        return null;
    }
  };

  const hasAdminPermissions = canManageRoles || canManageDocuments;

  return (
    <div className="container mt-4">
      <div className="settings-container">
        {/* Sidebar */}
        <div className="settings-sidebar">
          <div className="settings-category-header">System Settings</div>

          <button
            type="button"
            className={`settings-nav-item ${
              activeTab === "appearance" ? "active" : ""
            }`}
            onClick={() => setActiveTab("appearance")}
          >
            Appearance
          </button>

          <button
            type="button"
            className={`settings-nav-item ${
              activeTab === "system" ? "active" : ""
            }`}
            onClick={() => setActiveTab("system")}
          >
            System
          </button>

          {hasAdminPermissions && (
            <>
              <div className="settings-category-header">Administration</div>

              {canManageRoles && (
                <button
                  type="button"
                  className={`settings-nav-item ${
                    activeTab === "roles" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("roles")}
                >
                  Roles
                </button>
              )}

              {canManageDocuments && (
                <>
                  <button
                    type="button"
                    className={`settings-nav-item ${
                      activeTab === "documentTypes" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("documentTypes")}
                  >
                    Document Types
                  </button>
                  <button
                    type="button"
                    className={`settings-nav-item ${
                      activeTab === "retention" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("retention")}
                  >
                    Records Retention
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {/* Content */}
        <div className="settings-content">{renderContent()}</div>
      </div>
    </div>
  );
}
