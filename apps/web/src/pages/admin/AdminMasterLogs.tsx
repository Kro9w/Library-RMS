import React, { useState } from "react";
import { trpc } from "../../trpc";
import RolePill from "../../components/Roles/RolePill";
import { formatUserName } from "../../utils/user";
import { getActionDetails } from "../../utils/logAction";

export default function AdminMasterLogs() {
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(25);

  const nextPage = () => setPage((p) => Math.min(p + 1, totalPages));
  const prevPage = () => setPage((p) => Math.max(p - 1, 1));

  const [campusId, setCampusId] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [actionQuery, setActionQuery] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { data: campusesData } = trpc.user.getCampuses.useQuery();

  const { data: departmentsData } = trpc.user.getDepartments.useQuery(
    { campusId },
    { enabled: !!campusId },
  );

  const { data: usersData } = trpc.user.getUsersWithRoles.useQuery();

  const [userId, setUserId] = useState<string>("");

  const filteredUsers = usersData?.filter((u) => {
    if (departmentId) return u.departmentId === departmentId;
    if (campusId) return u.campusId === campusId;
    return true;
  });

  const { data, isLoading, isError } = trpc.logs.getLogs.useQuery({
    page,
    limit,
    campusId: campusId || undefined,
    departmentId: departmentId || undefined,
    userId: userId || undefined,
    actionQuery: actionQuery || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    scope: "INSTITUTION",
  });

  React.useEffect(() => {
    if (data?.totalPages) {
      setTotalPages(data.totalPages);
    }
  }, [data?.totalPages, setTotalPages]);

  return (
    <div className="admin-page w-100">
      <div className="admin-page-header">
        <h2 style={{ color: "var(--brand)" }}>Manage Campuses</h2>
        <p className="admin-page-desc text-muted mb-4">
          View system-wide activity across all campuses and departments.
        </p>
      </div>

      <div className="card shadow-sm border-0 mb-4 p-3 bg-white rounded">
        <h6 className="mb-3 text-muted fw-semibold">Filters</h6>
        <div className="row g-3">
          <div className="col-12 col-md-3">
            <label className="form-label text-muted small mb-1">Campus</label>
            <select
              className="form-select"
              value={campusId}
              onChange={(e) => {
                setCampusId(e.target.value);
                setDepartmentId(""); // Reset dept on campus change
                setUserId(""); // Reset user on campus change
              }}
            >
              <option value="">All Campuses</option>
              {campusesData?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label text-muted small mb-1">
              Department
            </label>
            <select
              className="form-select"
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setUserId(""); // Reset user on dept change
              }}
              disabled={!campusId}
            >
              <option value="">All Departments</option>
              {departmentsData?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label text-muted small mb-1">User</label>
            <select
              className="form-select"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">All Users</option>
              {filteredUsers?.map((u) => (
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
        </div>
        <div className="row g-3 mt-1">
          <div className="col-12 col-md-6">
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
          <div className="col-12 col-md-6">
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

      <div className="admin-table-card card border-0 shadow-sm bg-white rounded">
        {isLoading && <div className="p-4 text-center">Loading logs...</div>}
        {isError && (
          <div className="p-4 text-center text-danger">Error loading logs.</div>
        )}

        {!isLoading && !isError && data?.logs.length === 0 && (
          <div className="p-4 text-center text-muted">No logs found.</div>
        )}

        {!isLoading && !isError && data && data.logs.length > 0 && (
          <table className="admin-table table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Location</th>
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
                      <div className="d-flex flex-column">
                        {log.campus ? (
                          <span className="text-dark fw-medium">
                            {log.campus.name}
                          </span>
                        ) : (
                          <span className="text-muted fst-italic">Global</span>
                        )}
                        {log.department && (
                          <span
                            className="text-muted small"
                            style={{ fontSize: "0.8rem" }}
                          >
                            {log.department.name}
                          </span>
                        )}
                      </div>
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
        )}

        {/* Simple Pagination Control */}
        {!isLoading && !isError && data && data.totalPages > 1 && (
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
    </div>
  );
}
