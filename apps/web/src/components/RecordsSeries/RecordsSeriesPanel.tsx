import { useState } from "react";
import { trpc } from "../../trpc";

interface RecordsSeriesPanelProps {
  onSelectSeries: (seriesId: string | null) => void;
  selectedSeriesId: string | null;
}

export function RecordsSeriesPanel({
  onSelectSeries,
  selectedSeriesId,
}: RecordsSeriesPanelProps) {
  const { data: recordsSeries, refetch } = trpc.recordsSeries.getAll.useQuery();
  const createMutation = trpc.recordsSeries.create.useMutation();
  const updateMutation = trpc.recordsSeries.update.useMutation();
  const deleteMutation = trpc.recordsSeries.delete.useMutation();

  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSave = () => {
    if (!name.trim()) return;

    if (editingId) {
      updateMutation.mutate(
        { id: editingId, name },
        {
          onSuccess: () => {
            refetch();
            resetForm();
          },
        },
      );
    } else {
      createMutation.mutate(
        { name },
        {
          onSuccess: () => {
            refetch();
            resetForm();
          },
        },
      );
    }
  };

  const handleEdit = (series: { id: string; name: string }) => {
    setEditingId(series.id);
    setName(series.name);
  };

  const handleDelete = (id: string, name: string) => {
    if (
      confirm(
        `Are you sure you want to delete ${name}? This action cannot be undone if there are no document types attached.`,
      )
    ) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            refetch();
            if (selectedSeriesId === id) {
              onSelectSeries(null);
            }
          },
          onError: (err) => alert(err.message),
        },
      );
    }
  };

  const resetForm = () => {
    setName("");
    setEditingId(null);
  };

  return (
    <div>
      <div className="card mt-4">
        <div className="card-header">
          {editingId ? "Edit Records Series" : "Create New Records Series"}
        </div>
        <div className="card-body">
          <div className="d-flex flex-wrap gap-3 align-items-end">
            <div className="flex-grow-1" style={{ minWidth: "200px" }}>
              <label
                className="form-label mb-1"
                style={{ fontSize: "13px", fontWeight: 500 }}
              >
                Series Name
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Communication Letters"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              {editingId && (
                <button
                  type="button"
                  className="btn btn-secondary me-2"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={
                  !name.trim() ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
              >
                {editingId ? "Update" : "Create"} Series
              </button>
            </div>
          </div>
        </div>
      </div>

      <h5 className="mt-5 mb-3" style={{ color: "var(--brand)" }}>
        Existing Records Series
      </h5>

      {!recordsSeries?.length ? (
        <div className="alert alert-info">
          No records series have been created yet.
        </div>
      ) : (
        <div className="row g-3">
          {recordsSeries.map((series: any) => (
            <div className="col-md-4" key={series.id}>
              <div
                className={`card h-100 ${selectedSeriesId === series.id ? "border-primary" : ""}`}
                style={{ cursor: "pointer", transition: "border-color 0.2s" }}
                onClick={() => onSelectSeries(series.id)}
              >
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h6 className="mb-0 text-truncate" title={series.name}>
                      {series.name}
                    </h6>
                  </div>
                  <div className="mt-auto pt-3 d-flex justify-content-between align-items-center">
                    <span className="badge bg-secondary">
                      {series._count?.documentTypes || 0} Document Types
                    </span>
                    <div>
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 text-muted me-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(series);
                        }}
                        title="Edit Series"
                      >
                        <i className="bi bi-pencil" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 text-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(series.id, series.name);
                        }}
                        title="Delete Series"
                      >
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
