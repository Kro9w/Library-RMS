import { useState } from "react";
import { trpc } from "../../trpc";
import { ConfirmModal } from "../../components/ConfirmModal";

export default function AdminCampuses() {
  const { data: dbUser } = trpc.user.getMe.useQuery();
  const { data: campuses, refetch } = trpc.user.getCampuses.useQuery(
    { institutionId: dbUser?.institutionId || "" },
    { enabled: !!dbUser?.institutionId },
  );

  const createCampus = trpc.user.createCampus.useMutation({
    onSuccess: () => {
      refetch();
      setEditingCampus(null);
      setNewCampusName("");
    },
  });

  const updateCampus = trpc.user.updateCampus.useMutation({
    onSuccess: () => {
      refetch();
      setEditingCampus(null);
      setNewCampusName("");
    },
  });

  const deleteCampus = trpc.user.deleteCampus.useMutation({
    onSuccess: () => refetch(),
  });

  const [editingCampus, setEditingCampus] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [newCampusName, setNewCampusName] = useState("");
  const [campusToDelete, setCampusToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleSave = () => {
    if (!newCampusName.trim()) return;

    if (editingCampus) {
      updateCampus.mutate({ id: editingCampus.id, name: newCampusName });
    } else {
      createCampus.mutate({ name: newCampusName });
    }
  };

  return (
    <div>
      <h2 style={{ color: "var(--brand)" }}>Manage Campuses</h2>
      <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>
        Super admin view for creating and managing all campuses across the
        institution.
      </p>

      <div className="card mt-4">
        <div className="card-header">
          {editingCampus ? "Edit Campus" : "Create New Campus"}
        </div>
        <div className="card-body">
          <div className="d-flex gap-2">
            <input
              type="text"
              className="form-control"
              placeholder="Campus Name"
              value={newCampusName}
              onChange={(e) => setNewCampusName(e.target.value)}
            />
            <button
              className="btn btn-primary text-nowrap"
              onClick={handleSave}
              disabled={
                createCampus.isPending ||
                updateCampus.isPending ||
                !newCampusName.trim()
              }
            >
              {editingCampus ? "Update Campus" : "Create Campus"}
            </button>
            {editingCampus && (
              <button
                className="btn btn-secondary text-nowrap"
                onClick={() => {
                  setEditingCampus(null);
                  setNewCampusName("");
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-header">Existing Campuses</div>
        <div className="card-body p-0">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th className="px-3">Name</th>
                <th className="px-3 text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campuses?.map((campus) => (
                <tr key={campus.id} className="align-middle">
                  <td className="px-3">{campus.name}</td>
                  <td className="px-3 text-end">
                    <button
                      className="btn btn-sm btn-outline-primary me-2"
                      onClick={() => {
                        setEditingCampus(campus);
                        setNewCampusName(campus.name);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => setCampusToDelete(campus)}
                      disabled={deleteCampus.isPending}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {campuses?.length === 0 && (
                <tr>
                  <td colSpan={2} className="text-center py-4 text-muted">
                    No campuses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        show={!!campusToDelete}
        title="Delete Campus"
        onConfirm={() => {
          if (campusToDelete) {
            deleteCampus.mutate(
              { id: campusToDelete.id },
              {
                onSuccess: () => setCampusToDelete(null),
              },
            );
          }
        }}
        onClose={() => setCampusToDelete(null)}
        isConfirming={deleteCampus.isPending}
      >
        <p>Are you sure you want to delete {campusToDelete?.name}?</p>
      </ConfirmModal>
    </div>
  );
}
