import { useState } from "react";
import { trpc } from "../../trpc";
import { RetentionHelpModal } from "./RetentionHelpModal";

export function RetentionPolicyPanel() {
  const { data: documentTypes, refetch } = trpc.documentTypes.getAll.useQuery();
  const updateMutation = trpc.documentTypes.update.useMutation();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeRetention, setActiveRetention] = useState(0);
  const [inactiveRetention, setInactiveRetention] = useState(0);
  const [dispositionAction, setDispositionAction] = useState<
    "ARCHIVE" | "DESTROY"
  >("ARCHIVE");
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleEdit = (type: any) => {
    setEditingId(type.id);
    setActiveRetention(type.activeRetentionDuration || 0);
    setInactiveRetention(type.inactiveRetentionDuration || 0);
    setDispositionAction(type.dispositionAction || "ARCHIVE");
  };

  const handleCancel = () => {
    setEditingId(null);
    setActiveRetention(0);
    setInactiveRetention(0);
    setDispositionAction("ARCHIVE");
  };

  const handleSave = (type: any) => {
    updateMutation.mutate(
      {
        id: type.id,
        name: type.name, // Required by schema, though strictly we aren't changing it
        color: type.color, // Required by schema
        activeRetentionDuration: activeRetention,
        inactiveRetentionDuration: inactiveRetention,
        dispositionAction: dispositionAction,
      },
      {
        onSuccess: () => {
          setEditingId(null);
          refetch();
        },
      }
    );
  };

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <span>Records Retention Policy</span>
        <button
          className="btn btn-sm btn-link text-decoration-none p-0"
          onClick={() => setShowHelpModal(true)}
          title="Learn about Retention Lifecycle"
        >
          <i className="bi bi-info-circle fs-5"></i>
        </button>
      </div>
      <div className="card-body">
        <p className="text-muted mb-4">
          Configure the lifecycle for each document type.
          <br />
          <small className="text-warning-emphasis">
            <i className="bi bi-exclamation-triangle me-1"></i>
            <strong>Note:</strong> Changes to this schedule will strictly apply
            to documents created <em>after</em> this update. Existing documents
            will retain their original retention snapshots.
          </small>
        </p>

        <div className="table-responsive">
          <table className="table table-bordered table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>Document Type</th>
                <th style={{ width: "15%" }}>Active (Years)</th>
                <th style={{ width: "15%" }}>Inactive (Years)</th>
                <th style={{ width: "20%" }}>Disposition</th>
                <th style={{ width: "10%" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documentTypes?.map((type) => {
                const isEditing = editingId === type.id;

                return (
                  <tr key={type.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <span
                          style={{
                            backgroundColor: `#${type.color}`,
                            width: "12px",
                            height: "12px",
                            borderRadius: "50%",
                            display: "inline-block",
                            marginRight: "8px",
                          }}
                        />
                        <strong>{type.name}</strong>
                      </div>
                    </td>

                    {isEditing ? (
                      <>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="form-control form-control-sm"
                            value={activeRetention}
                            onChange={(e) =>
                              setActiveRetention(Number(e.target.value))
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="form-control form-control-sm"
                            value={inactiveRetention}
                            onChange={(e) =>
                              setInactiveRetention(Number(e.target.value))
                            }
                          />
                        </td>
                        <td>
                          <select
                            className="form-select form-select-sm"
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
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handleSave(type)}
                              title="Save"
                              disabled={updateMutation.isPending}
                            >
                              <i className="bi bi-check-lg"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={handleCancel}
                              title="Cancel"
                            >
                              <i className="bi bi-x-lg"></i>
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{type.activeRetentionDuration}</td>
                        <td>{type.inactiveRetentionDuration}</td>
                        <td>
                          <span
                            className={`badge ${
                              type.dispositionAction === "DESTROY"
                                ? "bg-danger"
                                : "bg-info"
                            }`}
                          >
                            {type.dispositionAction}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleEdit(type)}
                          >
                            Edit
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
              {documentTypes?.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted">
                    No document types defined.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <RetentionHelpModal
        show={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </div>
  );
}
