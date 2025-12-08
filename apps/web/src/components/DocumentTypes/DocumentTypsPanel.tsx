// apps/web/src/components/DocumentTypes/DocumentTypesPanel.tsx
import { useState } from "react";
import { trpc } from "../../trpc";

const colors = ["b93b46", "e07b3b", "f2d04f", "5aa96d", "3b7bb9", "8c3bb9"];

export function DocumentTypesPanel() {
  const { data: documentTypes, refetch } = trpc.documentTypes.getAll.useQuery();
  const createMutation = trpc.documentTypes.create.useMutation();
  const updateMutation = trpc.documentTypes.update.useMutation();
  const deleteMutation = trpc.documentTypes.delete.useMutation();

  const [name, setName] = useState("");
  const [color, setColor] = useState(colors[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!name.trim()) {
      setError("Please enter a document type name.");
      return;
    }
    setError(null);
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, name, color },
        { onSuccess: () => refetch() }
      );
    } else {
      createMutation.mutate({ name, color }, { onSuccess: () => refetch() });
    }
    setName("");
    setColor(colors[0]);
    setEditingId(null);
  };

  const handleEdit = (type: { id: string; name: string; color: string }) => {
    setEditingId(type.id);
    setName(type.name);
    setColor(type.color);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id }, { onSuccess: () => refetch() });
  };

  return (
    <div className="card">
      <div className="card-header">Document Types</div>
      <div className="card-body">
        <div className="row">
          <div className="col-md-4">
            <h6>{editingId ? "Edit Type" : "Add Type"}</h6>
            <div className="mb-3">
              <label htmlFor="typeName" className="form-label">
                Name
              </label>
              <input
                type="text"
                className="form-control"
                id="typeName"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {error && <div className="text-danger mt-1">{error}</div>}
            </div>
            <div className="mb-3">
              <label className="form-label">Color</label>
              <div>
                {colors.map((c) => (
                  <div
                    key={c}
                    onClick={() => setColor(c)}
                    style={{
                      backgroundColor: `#${c}`,
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      display: "inline-block",
                      margin: "5px",
                      cursor: "pointer",
                      border: color === c ? "2px solid black" : "none",
                    }}
                  />
                ))}
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleSave}>
              {editingId ? "Save Changes" : "Add Type"}
            </button>
            {editingId && (
              <button
                className="btn btn-secondary ms-2"
                onClick={() => setEditingId(null)}
              >
                Cancel
              </button>
            )}
          </div>
          <div className="col-md-8">
            <h6>Existing Types</h6>
            <ul className="list-group">
              {documentTypes?.map((type) => (
                <li
                  key={type.id}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <div className="d-flex align-items-center">
                    <span
                      style={{
                        backgroundColor: `#${type.color}`,
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        display: "inline-block",
                        marginRight: "10px",
                      }}
                    />
                    {type.name}
                  </div>
                  <div>
                    <button
                      className="btn btn-sm btn-outline-primary me-2"
                      onClick={() => handleEdit(type)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(type.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
