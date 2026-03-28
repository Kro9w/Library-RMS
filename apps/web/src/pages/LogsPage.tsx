import React from "react";
import { trpc } from "../trpc";

import RolePill from "../components/Roles/RolePill";
import { formatUserName } from "../utils/user";

const getActionType = (action: string) => {
  const lowerCaseAction = action.toLowerCase();
  if (
    lowerCaseAction.includes("create") ||
    lowerCaseAction.includes("upload") ||
    lowerCaseAction.includes("add") ||
    lowerCaseAction.includes("assign")
  ) {
    return "success";
  }
  if (
    lowerCaseAction.includes("delete") ||
    lowerCaseAction.includes("remove") ||
    lowerCaseAction.includes("unassign")
  ) {
    return "danger";
  }
  return "secondary";
};

const getActionBadgeClass = (type: string) => {
  if (type === "success") return "bg-success";
  if (type === "danger") return "bg-danger";
  return "bg-secondary";
};

const LogsPage: React.FC = () => {
  const { data, isLoading, isError } = trpc.logs.getLogs.useQuery({
    page: 1,
    limit: 100, // Fetch up to 100 logs
  });

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Audit Logs</h2>
      {isLoading && null}
      {isError && <p>Error loading logs.</p>}

      {data && data.logs.length === 0 && (
        <p className="text-muted">No audit logs found.</p>
      )}

      {data && data.logs.length > 0 && (
        <div className="document-table-card">
          <table className="table mb-0">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Date / Time</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((log) => {
                const actionType = getActionType(log.action);
                const badgeClass = getActionBadgeClass(actionType);

                return (
                  <tr key={log.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-medium text-dark">
                          {formatUserName(log.user)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <RolePill roleName={log.userRole} />
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span className={`badge ${badgeClass} text-white`}>
                          {actionType === "success" && "Added"}
                          {actionType === "danger" && "Removed"}
                          {actionType === "secondary" && "Updated"}
                        </span>
                        <span className="text-muted">{log.action}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-muted">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LogsPage;
