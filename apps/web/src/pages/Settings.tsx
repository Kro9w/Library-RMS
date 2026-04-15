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

interface NavSection {
  label: string;
  items: {
    id: SettingsTab;
    label: string;
    icon: string;
    requiresAdmin?: boolean;
    requiresDocAdmin?: boolean;
  }[];
}

export function Settings() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");

  const { data: user } = trpc.user.getMe.useQuery();
  const { canManageInstitution } = usePermissions();

  const canManageRoles =
    canManageInstitution ||
    (user?.roles.some((r: { canManageRoles: boolean }) => r.canManageRoles) ??
      false);

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

  const navSections: NavSection[] = [
    {
      label: "System",
      items: [
        { id: "appearance", label: "Appearance", icon: "bi-palette" },
        { id: "system", label: "System", icon: "bi-cpu" },
      ],
    },
    ...(canManageRoles || canManageDepartmentTypes
      ? [
          {
            label: "Administration",
            items: [
              ...(canManageRoles
                ? [
                    {
                      id: "roles" as SettingsTab,
                      label: "Roles",
                      icon: "bi-shield",
                      requiresAdmin: true,
                    },
                  ]
                : []),
              ...(canManageDepartmentTypes
                ? [
                    {
                      id: "documentTypes" as SettingsTab,
                      label: "Document Types",
                      icon: "bi-file-earmark-text",
                      requiresDocAdmin: true,
                    },
                  ]
                : []),
            ],
          },
        ]
      : []),
  ];

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
    }
  };

  const activeItem = navSections
    .flatMap((s) => s.items)
    .find((i) => i.id === activeTab);

  return (
    <div className="settings-layout">
      {/* Sidebar */}
      <aside className="settings-sidebar">
        <div className="settings-sidebar__header">
          <div className="settings-sidebar__label">Settings</div>
          <div className="settings-sidebar__title">Preferences</div>
        </div>

        <nav className="settings-sidebar__nav">
          {navSections.map((section) => (
            <div key={section.label} className="settings-sidebar__section">
              <div className="settings-sidebar__section-label">
                {section.label}
              </div>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`settings-nav-item ${activeTab === item.id ? "active" : ""}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <i className={`bi ${item.icon}`} />
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="settings-content">
        {activeItem && (
          <div className="settings-content__header">
            <i
              className={`bi ${activeItem.icon} settings-content__header-icon`}
            />
            <div>
              <div className="settings-content__title">{activeItem.label}</div>
            </div>
          </div>
        )}
        <div className="settings-content__body">{renderContent()}</div>
      </main>
    </div>
  );
}
