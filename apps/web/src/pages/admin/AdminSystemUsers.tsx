import { useState } from "react";
import { trpc } from "../../trpc";
import { LoadingAnimation } from "../../components/ui/LoadingAnimation";

export default function AdminSystemUsers() {
  const { data: dbUser } = trpc.user.getMe.useQuery();
  const {
    data: users,
    refetch,
    isLoading,
  } = trpc.user.getUsersWithRoles.useQuery();

  const { data: campuses } = trpc.user.getCampuses.useQuery(
    { institutionId: dbUser?.institutionId || "" },
    { enabled: !!dbUser?.institutionId },
  );

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedCampusId, setSelectedCampusId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");

  const updateHierarchy = trpc.user.updateUserHierarchy.useMutation({
    onSuccess: () => {
      refetch();
      setEditingUserId(null);
      setSelectedCampusId("");
      setSelectedDepartmentId("");
      setSelectedRoleId("");
    },
  });

  const { data: departments } = trpc.user.getDepartments.useQuery(
    { campusId: selectedCampusId },
    { enabled: !!selectedCampusId },
  );

  const { data: roles } = trpc.roles.getRoles.useQuery(undefined, {
    enabled: !!selectedDepartmentId,
  });

  const [expandedCampuses, setExpandedCampuses] = useState<
    Record<string, boolean>
  >({});
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>(
    {},
  );

  if (isLoading) return <LoadingAnimation />;

  const handleEdit = (user: any) => {
    setEditingUserId(user.id);
    setSelectedCampusId(user.campusId || "");
    setSelectedDepartmentId(user.departmentId || "");
    setSelectedRoleId(user.roles?.[0]?.id || "");
  };

  const handleSave = () => {
    if (editingUserId && selectedCampusId && selectedDepartmentId) {
      updateHierarchy.mutate({
        userId: editingUserId,
        campusId: selectedCampusId,
        departmentId: selectedDepartmentId,
        roleId: selectedRoleId || undefined,
      });
    }
  };

  const filteredRoles =
    roles?.filter(
      (r: { departmentId: string }) => r.departmentId === selectedDepartmentId,
    ) || [];

  const unassignedUsers =
    users?.filter((u) => !u.campusId || !u.departmentId) || [];

  const sortedCampuses = [...(campuses || [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const toggleCampus = (id: string) => {
    setExpandedCampuses((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDept = (id: string) => {
    setExpandedDepts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderUserTable = (userList: any[]) => {
    if (!userList.length) return null;
    return (
      <div className="table-responsive">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: "35%" }}>Name</th>
              <th style={{ width: "25%" }}>Email</th>
              <th style={{ width: "25%" }}>Roles</th>
              <th style={{ width: "15%", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {userList.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-semibold">
                      {user.lastName}, {user.firstName} {user.middleName || ""}
                    </span>
                    {user.isSuperAdmin && (
                      <span className="badge-superadmin">Super Admin</span>
                    )}
                  </div>
                </td>
                <td>{user.email}</td>
                {editingUserId === user.id ? (
                  <td colSpan={2}>
                    <div className="reassign-form justify-content-end">
                      <select
                        className="form-select"
                        value={selectedCampusId}
                        onChange={(e) => {
                          setSelectedCampusId(e.target.value);
                          setSelectedDepartmentId("");
                          setSelectedRoleId("");
                        }}
                      >
                        <option value="">-- Campus --</option>
                        {campuses?.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <select
                        className="form-select"
                        value={selectedDepartmentId}
                        onChange={(e) => {
                          setSelectedDepartmentId(e.target.value);
                          setSelectedRoleId("");
                        }}
                        disabled={!selectedCampusId}
                      >
                        <option value="">-- Dept --</option>
                        {departments?.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                      <select
                        className="form-select"
                        value={selectedRoleId}
                        onChange={(e) => setSelectedRoleId(e.target.value)}
                        disabled={!selectedDepartmentId}
                      >
                        <option value="">-- Role (Opt) --</option>
                        {filteredRoles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn topbar-btn topbar-btn-primary ms-2"
                        onClick={handleSave}
                        disabled={
                          !selectedCampusId ||
                          !selectedDepartmentId ||
                          updateHierarchy.isPending
                        }
                      >
                        Save
                      </button>
                      <button
                        className="btn topbar-btn"
                        onClick={() => setEditingUserId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                ) : (
                  <>
                    <td>
                      {user.roles
                        ?.map((r: { name: string }) => r.name)
                        .join(", ") || "None"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn topbar-btn"
                        onClick={() => handleEdit(user)}
                        disabled={user.isSuperAdmin}
                      >
                        Reassign
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      <h2 className="admin-page-title">Manage System Users</h2>
      <p className="admin-page-desc">
        Super admin bird's-eye view of all users in the system, organized by
        campus and department.
      </p>

      {/* Unassigned Users */}
      {unassignedUsers.length > 0 && (
        <div className="admin-card border-danger border-opacity-50">
          <div className="admin-card-header bg-danger bg-opacity-10 text-danger">
            <span className="admin-card-title text-danger">
              Unassigned Users
            </span>
            <span className="admin-campus-count border-danger text-danger bg-white">
              {unassignedUsers.length}
            </span>
          </div>
          <div className="p-0">{renderUserTable(unassignedUsers)}</div>
        </div>
      )}

      {/* Group by Campus -> Department */}
      <div>
        {sortedCampuses.map((campus) => {
          const campusUsers =
            users?.filter((u) => u.campusId === campus.id) || [];

          const departmentMap = new Map();
          campusUsers.forEach((u) => {
            if (u.departmentId && u.department) {
              if (!departmentMap.has(u.departmentId)) {
                departmentMap.set(u.departmentId, {
                  id: u.departmentId,
                  name: u.department.name,
                  users: [],
                });
              }
              departmentMap.get(u.departmentId).users.push(u);
            }
          });

          const departmentsWithUsers = Array.from(departmentMap.values());
          departmentsWithUsers.sort((a, b) => a.name.localeCompare(b.name));

          const isCampusExpanded = !!expandedCampuses[campus.id];

          return (
            <div className="admin-campus-accordion" key={campus.id}>
              <div
                className="admin-campus-header"
                onClick={() => toggleCampus(campus.id)}
              >
                <div className="d-flex align-items-center gap-2">
                  <i
                    className={`bi bi-chevron-${isCampusExpanded ? "down" : "right"} text-muted`}
                    style={{ fontSize: "12px", width: "14px" }}
                  ></i>
                  <i
                    className="bi bi-buildings"
                    style={{ color: "var(--brand)" }}
                  ></i>
                  <span>{campus.name}</span>
                </div>
                <span className="admin-campus-count">
                  {campusUsers.length} Users
                </span>
              </div>

              {isCampusExpanded && (
                <div className="admin-dept-accordion-wrapper mt-2 mb-3">
                  {departmentsWithUsers.length === 0 ? (
                    <div
                      className="p-3 text-muted"
                      style={{ fontSize: "13px", paddingLeft: "42px" }}
                    >
                      No users assigned to this campus yet.
                    </div>
                  ) : (
                    departmentsWithUsers.map((dept) => {
                      const isDeptExpanded = !!expandedDepts[dept.id];
                      return (
                        <div className="admin-dept-accordion" key={dept.id}>
                          <div
                            className="admin-dept-header"
                            onClick={() => toggleDept(dept.id)}
                          >
                            <div className="d-flex align-items-center gap-2">
                              <i
                                className={`bi bi-chevron-${isDeptExpanded ? "down" : "right"} text-muted`}
                                style={{ fontSize: "10px", width: "12px" }}
                              ></i>
                              <span>{dept.name}</span>
                            </div>
                            <span className="admin-campus-count bg-white">
                              {dept.users.length}
                            </span>
                          </div>

                          {isDeptExpanded && (
                            <div
                              className="border-top"
                              style={{ borderColor: "var(--border-muted)" }}
                            >
                              {renderUserTable(dept.users)}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
        {campuses?.length === 0 && (
          <div className="empty-state border rounded">
            <i className="bi bi-buildings"></i>
            <p>No campuses found. Please create a campus first.</p>
          </div>
        )}
      </div>
    </div>
  );
}
