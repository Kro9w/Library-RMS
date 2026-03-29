import { useState } from "react";
import { trpc } from "../../trpc";
import { ConfirmModal } from "../ConfirmModal";

const presetColors = [
  "b93b46",
  "e07b3b",
  "f2d04f",
  "5aa96d",
  "3b7bb9",
  "8c3bb9",
];

export function DocumentTypesPanel() {
  const { data: documentTypes, refetch } = trpc.documentTypes.getAll.useQuery();
  const createMutation = trpc.documentTypes.create.useMutation();
  const updateMutation = trpc.documentTypes.update.useMutation();
  const deleteMutation = trpc.documentTypes.delete.useMutation();

  const [name, setName] = useState("");
  const [color, setColor] = useState(presetColors[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleSave = () => {
    if (!name.trim()) return;

    // Ensure color is stored correctly (without # if backend expects it that way, but actually the old code used `#${c}` to render, meaning it stores without #)
    const cleanColor = color.startsWith("#") ? color.slice(1) : color;

    if (editingId) {
      updateMutation.mutate(
        { id: editingId, name, color: cleanColor },
        {
          onSuccess: () => {
            refetch();
            resetForm();
          },
        },
      );
    } else {
      createMutation.mutate(
        { name, color: cleanColor },
        {
          onSuccess: () => {
            refetch();
            resetForm();
          },
        },
      );
    }
  };

  const handleEdit = (type: { id: string; name: string; color: string }) => {
    setEditingId(type.id);
    setName(type.name);
    // ensure hex format for the color picker
    setColor(
      type.color.length === 6 && !type.color.startsWith("#")
        ? `#${type.color}`
        : type.color,
    );
  };

  const handleDelete = (id: string, name: string) => {
    setItemToDelete({ id, name });
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(
        { id: itemToDelete.id },
        {
          onSuccess: () => {
            refetch();
            setItemToDelete(null);
          },
        },
      );
    }
  };

  const resetForm = () => {
    setName("");
    setColor(presetColors[0]);
    setEditingId(null);
  };

  return (
    <div>
      <div className="card mt-4">
        <div className="card-header">
          {editingId ? "Edit Document Type" : "Create New Document Type"}
        </div>
        <div className="card-body">
          <div className="d-flex flex-wrap gap-3 align-items-end">
            <div className="flex-grow-1" style={{ minWidth: "200px" }}>
              <label
                className="form-label mb-1"
                style={{ fontSize: "13px", fontWeight: 500 }}
              >
                Name
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Document Type Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div style={{ minWidth: "280px" }}>
              <label
                className="form-label mb-1"
                style={{ fontSize: "13px", fontWeight: 500 }}
              >
                Color
              </label>
              <div className="d-flex align-items-center gap-2">
                {/* Custom Color Input */}
                <div className="d-flex align-items-center gap-2 me-3">
                  <input
                    type="color"
                    className="form-control form-control-color"
                    id="customColor"
                    value={color.startsWith("#") ? color : `#${color}`}
                    title="Choose your color"
                    onChange={(e) => setColor(e.target.value)}
                    style={{ width: "38px", height: "38px", padding: "4px" }}
                  />
                  <input
                    type="text"
                    className="form-control text-uppercase"
                    value={color.startsWith("#") ? color : `#${color}`}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (!val.startsWith("#")) val = "#" + val;
                      setColor(val);
                    }}
                    style={{ width: "90px", fontSize: "13px", height: "38px" }}
                    placeholder="#HEX"
                  />
                </div>

                {/* Preset Colors */}
                <div className="d-flex gap-2">
                  {presetColors.map((c) => {
                    const hex = `#${c}`;
                    const isSelected =
                      color.toLowerCase() === hex ||
                      color.toLowerCase() === c.toLowerCase();
                    return (
                      <button
                        key={c}
                        onClick={() => setColor(hex)}
                        className="btn p-0 border-0 rounded-circle"
                        style={{
                          backgroundColor: hex,
                          width: "30px",
                          height: "30px",
                          boxShadow: isSelected
                            ? "0 0 0 2px var(--bg-surface), 0 0 0 4px var(--brand)"
                            : "none",
                          transition: "box-shadow 0.2s ease",
                        }}
                        title={`Preset ${hex}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="d-flex gap-2 ms-auto mt-3 mt-md-0">
              <button
                className="btn btn-primary text-nowrap"
                onClick={handleSave}
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  !name.trim()
                }
              >
                {editingId ? "Update Type" : "Create Type"}
              </button>
              {editingId && (
                <button
                  className="btn btn-secondary text-nowrap"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-header">Existing Document Types</div>
        <div className="card-body p-0">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th className="px-3" style={{ width: "40px" }}>
                  Color
                </th>
                <th className="px-3">Name</th>
                <th className="px-3 text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documentTypes?.map((type) => (
                <tr key={type.id} className="align-middle">
                  <td className="px-3 text-center">
                    <div
                      style={{
                        backgroundColor: type.color.startsWith("#")
                          ? type.color
                          : `#${type.color}`,
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        display: "inline-block",
                        boxShadow: "var(--shadow-xs)",
                      }}
                    />
                  </td>
                  <td className="px-3 fw-medium">{type.name}</td>
                  <td className="px-3 text-end">
                    <button
                      className="btn btn-sm btn-outline-primary me-2"
                      onClick={() => handleEdit(type)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(type.id, type.name)}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {documentTypes?.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-4 text-muted">
                    No document types found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        show={!!itemToDelete}
        title="Delete Document Type"
        onConfirm={confirmDelete}
        onClose={() => setItemToDelete(null)}
        isConfirming={deleteMutation.isPending}
      >
        <p>
          Are you sure you want to delete the document type "
          {itemToDelete?.name}"?
        </p>
      </ConfirmModal>
    </div>
  );
}
