import { useState } from "react";
import { trpc } from "../../trpc";

const colors = ["b93b46", "e07b3b", "f2d04f", "5aa96d", "3b7bb9", "8c3bb9"];

export function DocumentTypesModal() {
  const { data: documentTypes, refetch } = trpc.documentTypes.getAll.useQuery();
  const createMutation = trpc.documentTypes.create.useMutation();
  const updateMutation = trpc.documentTypes.update.useMutation();
  const deleteMutation = trpc.documentTypes.delete.useMutation();

  const [name, setName] = useState("");
  const [color, setColor] = useState(colors[0]);
  const [activeRetention, setActiveRetention] = useState(0);
  const [inactiveRetention, setInactiveRetention] = useState(0);
  const [dispositionAction, setDispositionAction] = useState<
    "ARCHIVE" | "DESTROY"
  >("ARCHIVE");
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
        {
          id: editingId,
          name,
          color,
          activeRetentionDuration: activeRetention,
          inactiveRetentionDuration: inactiveRetention,
          dispositionAction,
        },
        { onSuccess: () => refetch() }
      );
    } else {
      createMutation.mutate(
        {
          name,
          color,
          activeRetentionDuration: activeRetention,
          inactiveRetentionDuration: inactiveRetention,
          dispositionAction,
        },
        { onSuccess: () => refetch() }
      );
    }
    setName("");
    setColor(colors[0]);
    setActiveRetention(0);
    setInactiveRetention(0);
    setDispositionAction("ARCHIVE");
    setEditingId(null);
  };

  const handleEdit = (type: any) => {
    setEditingId(type.id);
    setName(type.name);
    setColor(type.color);
    setActiveRetention(type.activeRetentionDuration || 0);
    setInactiveRetention(type.inactiveRetentionDuration || 0);
    setDispositionAction(type.dispositionAction || "ARCHIVE");
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id }, { onSuccess: () => refetch() });
  };

  return (
    <div className="modal fade" id="documentTypesModal" tabIndex={-1}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Manage Document Types</h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
            ></button>
          </div>
          <div className="modal-body">
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
                  <label className="form-label">Active Retention (Years)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={activeRetention}
                    onChange={(e) => setActiveRetention(Number(e.target.value))}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Inactive Retention (Years)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={inactiveRetention}
                    onChange={(e) =>
                      setInactiveRetention(Number(e.target.value))
                    }
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Disposition Action</label>
                  <select
                    className="form-select"
                    value={dispositionAction}
                    onChange={(e) =>
                      setDispositionAction(
                        e.target.value as "ARCHIVE" | "DESTROY"
                      )
                    }
                  >
                    <option value="ARCHIVE">Archive</option>
                    <option value="DESTROY">Destroy</option>
                  </select>
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
      </div>
    </div>
  );
}
