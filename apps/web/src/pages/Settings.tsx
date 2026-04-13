import { useState, useEffect } from "react";
import { useTheme } from "../Theme";
import { trpc } from "../trpc";
import { AppearanceSettings } from "../components/Settings/AppearanceSettings";
import { SystemSettings } from "../components/Settings/SystemSettings";
import { RolesSettings } from "../components/Roles/RolesSettings";
import { usePermissions } from "../hooks/usePermissions";
import { DepartmentDocumentTypesSettings } from "../components/Settings/DepartmentDocumentTypeSettings";
import "./Settings.css";

type SettingsTab = "appearance" | "system" | "roles" | "documentTypes";

export function Settings() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");

  const { data: user } = trpc.user.getMe.useQuery();
  const { canManageInstitution } = usePermissions();

  const canManageRoles =
    canManageInstitution ||
    user?.roles.some(
      (role: { canManageRoles: boolean }) => role.canManageRoles,
    ) ||
    false;

  const canManageDepartmentTypes =
    canManageInstitution ||
    (user?.roles?.length &&
      Math.min(...user.roles.map((r: { level: number }) => r.level)) <= 1 &&
      user?.roles.some(
        (r: { canManageDocuments: boolean }) => r.canManageDocuments,
      ));

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
        return canManageDepartmentTypes ? (
          <DepartmentDocumentTypesSettings />
        ) : (
          <div className="alert alert-danger">
            You do not have permission to view this page.
          </div>
        );
      default:
        return null;
    }
  };

  const hasAdminPermissions = canManageRoles || canManageDepartmentTypes;

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

              {canManageDepartmentTypes && (
                <button
                  type="button"
                  className={`settings-nav-item ${
                    activeTab === "documentTypes" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("documentTypes")}
                >
                  Document Types
                </button>
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
