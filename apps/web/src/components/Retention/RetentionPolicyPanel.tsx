import { useState } from "react";
import { trpc } from "../../trpc";
import { RetentionHelpModal } from "./RetentionHelpModal";

export function RetentionPolicyPanel() {
  const { data: documentTypes, refetch } =
    trpc.documentTypes.getAllUnfiltered.useQuery();
  const updateMutation = trpc.documentTypes.update.useMutation();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeRetention, setActiveRetention] = useState(0);
  const [activeRetentionMonths, setActiveRetentionMonths] = useState(0);
  const [activeRetentionDays, setActiveRetentionDays] = useState(0);

  const [inactiveRetention, setInactiveRetention] = useState(0);
  const [inactiveRetentionMonths, setInactiveRetentionMonths] = useState(0);
  const [inactiveRetentionDays, setInactiveRetentionDays] = useState(0);

  const [dispositionAction, setDispositionAction] = useState<
    "ARCHIVE" | "DESTROY"
  >("ARCHIVE");
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleEdit = (type: {
    id: string;
    activeRetentionDuration: number;
    activeRetentionMonths: number;
    activeRetentionDays: number;
    inactiveRetentionDuration: number;
    inactiveRetentionMonths: number;
    inactiveRetentionDays: number;
    dispositionAction: "ARCHIVE" | "DESTROY";
  }) => {
    setEditingId(type.id);
    setActiveRetention(type.activeRetentionDuration || 0);
    setActiveRetentionMonths(type.activeRetentionMonths || 0);
    setActiveRetentionDays(type.activeRetentionDays || 0);

    setInactiveRetention(type.inactiveRetentionDuration || 0);
    setInactiveRetentionMonths(type.inactiveRetentionMonths || 0);
    setInactiveRetentionDays(type.inactiveRetentionDays || 0);

    setDispositionAction(type.dispositionAction || "ARCHIVE");
  };

  const handleCancel = () => {
    setEditingId(null);
    setActiveRetention(0);
    setActiveRetentionMonths(0);
    setActiveRetentionDays(0);

    setInactiveRetention(0);
    setInactiveRetentionMonths(0);
    setInactiveRetentionDays(0);

    setDispositionAction("ARCHIVE");
  };

  const handleSave = (type: { id: string; name: string; color: string }) => {
    updateMutation.mutate(
      {
        id: type.id,
        name: type.name, // Required by schema, though strictly we aren't changing it
        color: type.color, // Required by schema
        activeRetentionDuration: activeRetention,
        activeRetentionMonths: activeRetentionMonths,
        activeRetentionDays: activeRetentionDays,
        inactiveRetentionDuration: inactiveRetention,
        inactiveRetentionMonths: inactiveRetentionMonths,
        inactiveRetentionDays: inactiveRetentionDays,
        dispositionAction: dispositionAction,
      },
      {
        onSuccess: () => {
          setEditingId(null);
          refetch();
        },
      },
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
          <table className="table align-middle">
            <thead>
              <tr>
                <th style={{ width: "30%" }}>Document Type</th>
                <th style={{ width: "20%" }}>Active (Y/M/D)</th>
                <th style={{ width: "20%" }}>Inactive (Y/M/D)</th>
                <th style={{ width: "15%" }}>Disposition</th>
                <th style={{ width: "15%" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documentTypes?.map(
                (type: {
                  id: string;
                  name: string;
                  color: string;
                  activeRetentionDuration: number;
                  activeRetentionMonths: number;
                  activeRetentionDays: number;
                  inactiveRetentionDuration: number;
                  inactiveRetentionMonths: number;
                  inactiveRetentionDays: number;
                  dispositionAction: "ARCHIVE" | "DESTROY";
                }) => {
                  const isEditing = editingId === type.id;

                  return (
                    <tr key={type.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
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
                            <div className="d-flex gap-1">
                              <input
                                type="number"
                                min="0"
                                placeholder="Y"
                                title="Years"
                                className="form-control form-control-sm"
                                value={activeRetention}
                                onChange={(e) =>
                                  setActiveRetention(Number(e.target.value))
                                }
                              />
                              <input
                                type="number"
                                min="0"
                                max="11"
                                placeholder="M"
                                title="Months"
                                className="form-control form-control-sm"
                                value={activeRetentionMonths}
                                onChange={(e) =>
                                  setActiveRetentionMonths(
                                    Number(e.target.value),
                                  )
                                }
                              />
                              <input
                                type="number"
                                min="0"
                                max="30"
                                placeholder="D"
                                title="Days"
                                className="form-control form-control-sm"
                                value={activeRetentionDays}
                                onChange={(e) =>
                                  setActiveRetentionDays(Number(e.target.value))
                                }
                              />
                            </div>
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <input
                                type="number"
                                min="0"
                                placeholder="Y"
                                title="Years"
                                className="form-control form-control-sm"
                                value={inactiveRetention}
                                onChange={(e) =>
                                  setInactiveRetention(Number(e.target.value))
                                }
                              />
                              <input
                                type="number"
                                min="0"
                                max="11"
                                placeholder="M"
                                title="Months"
                                className="form-control form-control-sm"
                                value={inactiveRetentionMonths}
                                onChange={(e) =>
                                  setInactiveRetentionMonths(
                                    Number(e.target.value),
                                  )
                                }
                              />
                              <input
                                type="number"
                                min="0"
                                max="30"
                                placeholder="D"
                                title="Days"
                                className="form-control form-control-sm"
                                value={inactiveRetentionDays}
                                onChange={(e) =>
                                  setInactiveRetentionDays(
                                    Number(e.target.value),
                                  )
                                }
                              />
                            </div>
                          </td>
                          <td>
                            <select
                              className="form-select form-select-sm"
                              value={dispositionAction}
                              onChange={(e) =>
                                setDispositionAction(
                                  e.target.value as "ARCHIVE" | "DESTROY",
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
                          <td>
                            {type.activeRetentionDuration}y{" "}
                            {type.activeRetentionMonths || 0}m{" "}
                            {type.activeRetentionDays || 0}d
                          </td>
                          <td>
                            {type.inactiveRetentionDuration}y{" "}
                            {type.inactiveRetentionMonths || 0}m{" "}
                            {type.inactiveRetentionDays || 0}d
                          </td>
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
                },
              )}
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
