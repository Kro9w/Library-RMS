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

  const { data: departments } = trpc.user.getDepartments.useQuery(
    { campusId: selectedCampusId },
    { enabled: !!selectedCampusId },
  );

  const { data: roles } = trpc.roles.getRoles.useQuery(undefined, {
    enabled: !!selectedDepartmentId, // Roles exist per department, we will fetch the current dept's roles
  });

  const filteredRoles =
    roles?.filter(
      (r: { departmentId: string }) => r.departmentId === selectedDepartmentId,
    ) || [];

  const updateHierarchy = trpc.user.updateUserHierarchy.useMutation({
    onSuccess: () => {
      refetch();
      setEditingUserId(null);
    },
  });

  const handleEdit = (user: any) => {
    setEditingUserId(user.id);
    setSelectedCampusId(user.campusId || "");
    setSelectedDepartmentId(user.departmentId || "");
    setSelectedRoleId(user.roles?.[0]?.id || "");
  };

  const handleSave = () => {
    if (!editingUserId || !selectedCampusId || !selectedDepartmentId) return;

    updateHierarchy.mutate({
      userId: editingUserId,
      campusId: selectedCampusId,
      departmentId: selectedDepartmentId,
      roleId: selectedRoleId || undefined,
    });
  };

  if (isLoading) {
    return <LoadingAnimation />;
  }

  // Sort Campuses: University Administration first, then alphabetical
  const sortedCampuses = campuses
    ? [...campuses].sort((a, b) => {
        const isAAdmin = a.name
          .toLowerCase()
          .includes("university administration");
        const isBAdmin = b.name
          .toLowerCase()
          .includes("university administration");
        if (isAAdmin && !isBAdmin) return -1;
        if (!isAAdmin && isBAdmin) return 1;
        return a.name.localeCompare(b.name);
      })
    : [];

  // Group users by Campus and Department
  const unassignedUsers =
    users?.filter((u) => !u.campusId || !u.departmentId) || [];

  const renderUserTable = (departmentUsers: any[]) => {
    if (departmentUsers.length === 0) {
      return <div className="p-3 text-muted text-center">No users found.</div>;
    }

    return (
      <div className="table-responsive">
        <table className="table table-hover mb-0">
          <thead>
            <tr>
              <th className="px-3" style={{ width: "25%" }}>
                Name
              </th>
              <th className="px-3" style={{ width: "30%" }}>
                Email
              </th>
              <th className="px-3" style={{ width: "20%" }}>
                Role
              </th>
              <th className="px-3 text-end" style={{ width: "25%" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {departmentUsers.map((user) => (
              <tr key={user.id} className="align-middle">
                <td className="px-3">
                  {user.firstName} {user.lastName}
                  {user.isSuperAdmin && (
                    <span className="badge bg-danger ms-2">Super Admin</span>
                  )}
                </td>
                <td className="px-3">{user.email}</td>

                {editingUserId === user.id ? (
                  <td colSpan={2} className="px-3">
                    <div className="d-flex flex-wrap gap-2 justify-content-end">
                      <select
                        className="form-select form-select-sm w-auto"
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
                        className="form-select form-select-sm w-auto"
                        value={selectedDepartmentId}
                        onChange={(e) => {
                          setSelectedDepartmentId(e.target.value);
                          setSelectedRoleId("");
                        }}
                        disabled={!selectedCampusId}
                      >
                        <option value="">-- Department --</option>
                        {departments?.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                      <select
                        className="form-select form-select-sm w-auto"
                        value={selectedRoleId}
                        onChange={(e) => setSelectedRoleId(e.target.value)}
                        disabled={!selectedDepartmentId}
                      >
                        <option value="">-- Role (Optional) --</option>
                        {filteredRoles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn btn-sm btn-success"
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
                        className="btn btn-sm btn-secondary"
                        onClick={() => setEditingUserId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                ) : (
                  <>
                    <td className="px-3">
                      {user.roles
                        ?.map((r: { name: string }) => r.name)
                        .join(", ") || "None"}
                    </td>
                    <td className="px-3 text-end">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleEdit(user)}
                        disabled={user.isSuperAdmin} // Disable editing other super admins
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
      <h2 style={{ color: "var(--primary)" }}>Manage System Users</h2>
      <p
        style={{
          color: "var(--text-muted)",
          marginTop: "0.5rem",
          marginBottom: "2rem",
        }}
      >
        Super admin bird's-eye view of all users in the system, organized by
        campus and department.
      </p>

      {/* Unassigned Users */}
      {unassignedUsers.length > 0 && (
        <div
          className="card mb-4"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <div
            className="card-header fw-bold d-flex justify-content-between align-items-center"
            style={{
              backgroundColor: "var(--card-background)",
              borderBottom: "1px solid var(--card-border)",
            }}
          >
            <span>Unassigned Users</span>
            <span className="badge bg-secondary rounded-pill">
              {unassignedUsers.length}
            </span>
          </div>
          <div className="card-body p-0">
            {renderUserTable(unassignedUsers)}
          </div>
        </div>
      )}

      {/* Group by Campus -> Department */}
      <div className="accordion" id="campusesAccordion">
        {sortedCampuses.map((campus) => {
          // Get all departments for this campus from the users' data to show accurate counts
          // Or we can just use the unique departments from the users in this campus
          const campusUsers =
            users?.filter((u) => u.campusId === campus.id) || [];

          // Get unique departments for this campus from the users array
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
          // Sort departments alphabetically
          departmentsWithUsers.sort((a, b) => a.name.localeCompare(b.name));

          const campusCollapseId = `collapseCampus-${campus.id}`;

          return (
            <div
              className="accordion-item shadow-sm mb-3 rounded overflow-hidden"
              style={{ border: "1px solid var(--card-border)" }}
              key={campus.id}
            >
              <h2
                className="accordion-header"
                id={`headingCampus-${campus.id}`}
              >
                <button
                  className="accordion-button collapsed fw-bold fs-5"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target={`#${campusCollapseId}`}
                  aria-expanded="false"
                  aria-controls={campusCollapseId}
                  style={{
                    backgroundColor: "var(--card-background)",
                    color: "var(--text)",
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center w-100 pe-3">
                    <div>
                      <i
                        className="bi bi-buildings me-2"
                        style={{ color: "var(--primary)" }}
                      ></i>
                      {campus.name}
                    </div>
                    <span className="badge bg-secondary rounded-pill">
                      {campusUsers.length} Users
                    </span>
                  </div>
                </button>
              </h2>

              <div
                id={campusCollapseId}
                className="accordion-collapse collapse"
                aria-labelledby={`headingCampus-${campus.id}`}
                data-bs-parent="#campusesAccordion"
              >
                <div className="accordion-body p-3 bg-white">
                  {departmentsWithUsers.length === 0 ? (
                    <p className="text-muted mb-0">
                      No users assigned to this campus yet.
                    </p>
                  ) : (
                    <div
                      className="accordion"
                      id={`departmentsAccordion-${campus.id}`}
                    >
                      {departmentsWithUsers.map((dept) => {
                        const deptCollapseId = `collapseDept-${dept.id}`;
                        return (
                          <div
                            className="accordion-item mb-2 rounded"
                            style={{ border: "1px solid var(--card-border)" }}
                            key={dept.id}
                          >
                            <h2
                              className="accordion-header"
                              id={`headingDept-${dept.id}`}
                            >
                              <button
                                className="accordion-button collapsed py-2"
                                type="button"
                                data-bs-toggle="collapse"
                                data-bs-target={`#${deptCollapseId}`}
                                aria-expanded="false"
                                aria-controls={deptCollapseId}
                                style={{
                                  backgroundColor: "var(--card-background)",
                                  color: "var(--text)",
                                }}
                              >
                                <div className="d-flex justify-content-between align-items-center w-100 pe-3">
                                  <div>
                                    <i className="bi bi-building me-2 text-muted"></i>
                                    {dept.name}
                                  </div>
                                  <span className="badge rounded-pill bg-secondary">
                                    {dept.users.length}
                                  </span>
                                </div>
                              </button>
                            </h2>
                            <div
                              id={deptCollapseId}
                              className="accordion-collapse collapse"
                              aria-labelledby={`headingDept-${dept.id}`}
                              data-bs-parent={`#departmentsAccordion-${campus.id}`}
                            >
                              <div className="accordion-body p-0">
                                {renderUserTable(dept.users)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {campuses?.length === 0 && (
          <div className="alert alert-info">
            No campuses found. Please create a campus first.
          </div>
        )}
      </div>
    </div>
  );
}
