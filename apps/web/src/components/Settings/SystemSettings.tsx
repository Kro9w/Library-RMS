// apps/web/src/components/Settings/SystemSettings.tsx
import { useState } from "react";

export function SystemSettings() {
  const [dbStatus, setDbStatus] = useState<"checked" | "unchecked" | "error">(
    "unchecked"
  );

  const checkDbHealth = () => {
    // Simulate an API call to your backend
    // In a real scenario, you'd trigger a tRPC query here
    setTimeout(() => {
      setDbStatus("checked");
    }, 1000);
  };

  return (
    <div className="card">
      <div className="card-header">System</div>
      <div className="card-body">
        <h5>Database Health</h5>
        <p className="text-muted">
          Check the connection status to the Prisma database.
        </p>
        <button className="btn btn-secondary" onClick={checkDbHealth}>
          Run Check
        </button>
        {dbStatus === "checked" && (
          <div className="alert alert-success mt-3">Connection successful.</div>
        )}
        {dbStatus === "error" && (
          <div className="alert alert-danger mt-3">Connection failed.</div>
        )}
      </div>
    </div>
  );
}
