// apps/web/src/components/Settings/AppearanceSettings.tsx
import { useTheme } from "../../Theme";

export function AppearanceSettings() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="card">
      <div className="card-header">Appearance</div>
      <div className="card-body">
        <h5 className="card-title">Theme Preferences</h5>
        <p className="card-text text-muted">
          Customize the look and feel of the application.
        </p>
        <div className="form-check form-switch mt-3">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            id="themeSwitch"
            checked={theme === "dark"}
            onChange={toggleTheme}
            style={{ cursor: "pointer" }}
          />
          <label
            className="form-check-label"
            htmlFor="themeSwitch"
            style={{ cursor: "pointer" }}
          >
            Dark Mode
          </label>
        </div>
      </div>
    </div>
  );
}
