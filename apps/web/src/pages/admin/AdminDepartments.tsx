import { useState } from "react";
import { trpc } from "../../trpc";

export default function AdminDepartments() {
  const { data: dbUser } = trpc.user.getMe.useQuery();
  const { data: campuses } = trpc.user.getCampuses.useQuery(
    { institutionId: dbUser?.institutionId || "" },
    { enabled: !!dbUser?.institutionId },
  );

  const [selectedCampusId, setSelectedCampusId] = useState<string>("");

  const { data: departments, refetch } = trpc.user.getDepartments.useQuery(
    { campusId: selectedCampusId },
    { enabled: !!selectedCampusId },
  );

  const [editingDepartment, setEditingDepartment] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [newDepartmentName, setNewDepartmentName] = useState("");

  const createDepartment = trpc.user.createDepartment.useMutation({
    onSuccess: () => {
      refetch();
      setEditingDepartment(null);
      setNewDepartmentName("");
    },
  });

  const updateDepartment = trpc.user.updateDepartment.useMutation({
    onSuccess: () => {
      refetch();
      setEditingDepartment(null);
      setNewDepartmentName("");
    },
  });

  const deleteDepartment = trpc.user.deleteDepartment.useMutation({
    onSuccess: () => refetch(),
  });

  const handleSave = () => {
    if (!newDepartmentName.trim() || !selectedCampusId) return;

    if (editingDepartment) {
      updateDepartment.mutate({
        id: editingDepartment.id,
        name: newDepartmentName,
      });
    } else {
      createDepartment.mutate({
        name: newDepartmentName,
        campusId: selectedCampusId,
      });
    }
  };

  return (
    <div>
      <h2 style={{ color: "var(--brand)" }}>Manage Departments</h2>
      <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>
        Super admin view for creating and managing all departments.
      </p>

      <div className="card mt-4">
        <div className="card-header">Select Campus</div>
        <div className="card-body">
          <select
            className="form-select"
            value={selectedCampusId}
            onChange={(e) => {
              setSelectedCampusId(e.target.value);
              setEditingDepartment(null);
              setNewDepartmentName("");
            }}
          >
            <option value="">-- Select a Campus --</option>
            {campuses?.map((campus) => (
              <option key={campus.id} value={campus.id}>
                {campus.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedCampusId && (
        <>
          <div className="card mt-4">
            <div className="card-header">
              {editingDepartment ? "Edit Department" : "Create New Department"}
            </div>
            <div className="card-body">
              <div className="d-flex gap-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Department Name"
                  value={newDepartmentName}
                  onChange={(e) => setNewDepartmentName(e.target.value)}
                />
                <button
                  className="btn btn-primary text-nowrap"
                  onClick={handleSave}
                  disabled={
                    createDepartment.isPending ||
                    updateDepartment.isPending ||
                    !newDepartmentName.trim()
                  }
                >
                  {editingDepartment
                    ? "Update Department"
                    : "Create Department"}
                </button>
                {editingDepartment && (
                  <button
                    className="btn btn-secondary text-nowrap"
                    onClick={() => {
                      setEditingDepartment(null);
                      setNewDepartmentName("");
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="card mt-4">
            <div className="card-header">Departments in Selected Campus</div>
            <div className="card-body p-0">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th className="px-3">Name</th>
                    <th className="px-3 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments?.map((dept) => (
                    <tr key={dept.id} className="align-middle">
                      <td className="px-3">{dept.name}</td>
                      <td className="px-3 text-end">
                        <button
                          className="btn btn-sm btn-outline-primary me-2"
                          onClick={() => {
                            setEditingDepartment(dept);
                            setNewDepartmentName(dept.name);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => {
                            if (
                              confirm(
                                `Are you sure you want to delete ${dept.name}?`,
                              )
                            ) {
                              deleteDepartment.mutate({ id: dept.id });
                            }
                          }}
                          disabled={deleteDepartment.isPending}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {departments?.length === 0 && (
                    <tr>
                      <td colSpan={2} className="text-center py-4 text-muted">
                        No departments found in this campus.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
