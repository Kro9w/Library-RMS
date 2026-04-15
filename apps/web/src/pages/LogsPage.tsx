import React, { useState } from "react";
import { trpc } from "../trpc";

import RolePill from "../components/Roles/RolePill";
import { formatUserName } from "../utils/user";
import { getActionDetails } from "../utils/logAction";

const LogsPage: React.FC = () => {
  const { data: me } = trpc.user.getMe.useQuery();
  const isCampusExecutive = me?.roles.some((r) => r.level === 0) ?? false;
  const [activeTab, setActiveTab] = useState<"DEPARTMENT" | "CAMPUS">(
    "DEPARTMENT",
  );

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(25);

  const nextPage = () => setPage((p) => Math.min(p + 1, totalPages));
  const prevPage = () => setPage((p) => Math.max(p - 1, 1));

  const [userId, setUserId] = useState<string>("");
  const [actionQuery, setActionQuery] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { data: allUsersData } = trpc.user.getUsersWithRoles.useQuery();

  const usersData = allUsersData?.filter((u) => {
    if (activeTab === "DEPARTMENT") return u.departmentId === me?.departmentId;
    if (activeTab === "CAMPUS") return u.campusId === me?.campusId;
    return true;
  });

  const { data, isLoading, isError } = trpc.logs.getLogs.useQuery({
    page,
    limit,
    userId: userId || undefined,
    actionQuery: actionQuery || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    scope: activeTab,
  });

  React.useEffect(() => {
    if (data?.totalPages) {
      setTotalPages(data.totalPages);
    }
  }, [data?.totalPages, setTotalPages]);

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          {activeTab === "CAMPUS" ? "Campus Audit Logs" : "Office Audit Logs"}
        </h2>
        {isCampusExecutive && (
          <div className="header-actions">
            <select
              className="form-select border-0 shadow-sm"
              style={{ width: "auto", cursor: "pointer", fontWeight: 500 }}
              value={activeTab}
              onChange={(e) => {
                setActiveTab(e.target.value as "DEPARTMENT" | "CAMPUS");
                setPage(1);
                setUserId("");
              }}
            >
              <option value="DEPARTMENT">Office Logs</option>
              <option value="CAMPUS">Campus Logs</option>
            </select>
          </div>
        )}
      </div>
      <div className="card shadow-sm border-0 mb-4 p-3 bg-white rounded">
        <h6 className="mb-3 text-muted fw-semibold">Filters</h6>
        <div className="row g-3">
          <div className="col-12 col-md-3">
            <label className="form-label text-muted small mb-1">User</label>
            <select
              className="form-select"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">All Users</option>
              {usersData?.map((u) => (
                <option key={u.id} value={u.id}>
                  {formatUserName(u)}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label text-muted small mb-1">
              Action Type
            </label>
            <select
              className="form-select"
              value={actionQuery}
              onChange={(e) => setActionQuery(e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="Created">Created</option>
              <option value="Deleted">Deleted</option>
              <option value="Updated">Updated</option>
              <option value="Sent">Sent</option>
              <option value="Received">Received</option>
              <option value="Joined">Joined</option>
              <option value="Assigned">Assigned</option>
              <option value="Removed">Removed</option>
              <option value="Checked">Checked In/Out</option>
              <option value="Disposition">Disposition</option>
              <option value="Legal Hold">Legal Hold</option>
            </select>
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label text-muted small mb-1">
              Start Date
            </label>
            <input
              type="date"
              className="form-control"
              placeholder="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label text-muted small mb-1">End Date</label>
            <input
              type="date"
              className="form-control"
              placeholder="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>
      {isLoading && (
        <div className="page-loading">
          <div className="page-spinner" />
          <span>Loading logs...</span>
        </div>
      )}{" "}
      {isError && <p className="text-danger">Error loading logs.</p>}
      {!isLoading && !isError && data?.logs.length === 0 && (
        <p className="text-muted">No audit logs found.</p>
      )}
      {!isLoading && !isError && data && data.logs.length > 0 && (
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
                const { label, badgeClass } = getActionDetails(log.action);

                return (
                  <tr key={log.id}>
                    <td>
                      <div className="d-flex flex-column">
                        <span className="fw-medium text-dark">
                          {formatUserName(log.user)}
                        </span>
                        <span
                          className="text-muted small"
                          style={{ fontSize: "0.8rem" }}
                        >
                          {log.user.email}
                        </span>
                      </div>
                    </td>
                    <td>
                      <RolePill roleName={log.userRole} />
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span className={`badge ${badgeClass}`}>{label}</span>
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

          {data.totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center p-3 border-top">
              <span className="text-muted">
                Page {page} of {data.totalPages}
              </span>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={prevPage}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={nextPage}
                  disabled={page === data.totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LogsPage;
