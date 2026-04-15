import { useState } from "react";
import { trpc } from "../../trpc";
import { RetentionHelpModal } from "./RetentionHelpModal";

export function RetentionPolicyPanel({
  selectedSeriesId,
}: {
  selectedSeriesId?: string | null;
}) {
  const { data: documentTypes, refetch } =
    trpc.documentTypes.getAllUnfiltered.useQuery();
  const updateMutation = trpc.documentTypes.update.useMutation();

  const [editingId, setEditingId] = useState<string | null>(null);

  // Explicit override state
  const [isOverriding, setIsOverriding] = useState(false);

  const [activeRetention, setActiveRetention] = useState<number | null>(0);
  const [activeRetentionMonths, setActiveRetentionMonths] = useState<
    number | null
  >(0);
  const [activeRetentionDays, setActiveRetentionDays] = useState<number | null>(
    0,
  );

  const [inactiveRetention, setInactiveRetention] = useState<number | null>(0);
  const [inactiveRetentionMonths, setInactiveRetentionMonths] = useState<
    number | null
  >(0);
  const [inactiveRetentionDays, setInactiveRetentionDays] = useState<
    number | null
  >(0);

  const [dispositionAction, setDispositionAction] = useState<
    "ARCHIVE" | "DESTROY" | null
  >("ARCHIVE");

  const handleEdit = (type: any) => {
    setEditingId(type.id);

    // If it has its own explicit retention (not null), it's overridden
    const hasOverride = type.activeRetentionDuration !== null;
    setIsOverriding(hasOverride);

    setActiveRetention(type.activeRetentionDuration ?? 0);
    setActiveRetentionMonths(type.activeRetentionMonths ?? 0);
    setActiveRetentionDays(type.activeRetentionDays ?? 0);

    setInactiveRetention(type.inactiveRetentionDuration ?? 0);
    setInactiveRetentionMonths(type.inactiveRetentionMonths ?? 0);
    setInactiveRetentionDays(type.inactiveRetentionDays ?? 0);

    setDispositionAction(type.dispositionAction ?? "ARCHIVE");
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleSave = (type: any) => {
    updateMutation.mutate(
      {
        id: type.id,
        name: type.name, // Required by schema
        color: type.color, // Required by schema
        activeRetentionDuration: isOverriding ? activeRetention : null,
        activeRetentionMonths: isOverriding ? activeRetentionMonths : null,
        activeRetentionDays: isOverriding ? activeRetentionDays : null,
        inactiveRetentionDuration: isOverriding ? inactiveRetention : null,
        inactiveRetentionMonths: isOverriding ? inactiveRetentionMonths : null,
        inactiveRetentionDays: isOverriding ? inactiveRetentionDays : null,
        dispositionAction: isOverriding ? dispositionAction : null,
      },
      {
        onSuccess: () => {
          setEditingId(null);
          refetch();
        },
      },
    );
  };

  const [showHelpModal, setShowHelpModal] = useState(false);

  const filteredTypes = documentTypes?.filter(
    (type: any) => type.recordsSeriesId === selectedSeriesId,
  );

  if (!selectedSeriesId) return null;

  return (
    <div>
      <div className="d-flex justify-content-end mb-2">
        <button
          className="btn btn-sm btn-link text-decoration-none p-0"
          onClick={() => setShowHelpModal(true)}
          title="Learn about Retention Lifecycle"
        >
          <i className="bi bi-info-circle fs-5"></i> Help
        </button>
      </div>

      <p className="text-muted mb-4">
        Optionally override the Records Series lifecycle for specific Document
        Types. If not overridden, the Document Type will inherit its schedule
        from the Series.
        <br />
        <small className="text-warning-emphasis">
          <i className="bi bi-exclamation-triangle me-1"></i>
          <strong>Note:</strong> Changes to this schedule will strictly apply to
          documents created <em>after</em> this update. Existing documents will
          retain their original retention snapshots.
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
            {filteredTypes?.map((type: any) => {
              const isEditing = editingId === type.id;
              const isOverridden = type.activeRetentionDuration !== null;

              return (
                <tr key={type.id} className={isOverridden ? "bg-light" : ""}>
                  <td>
                    <div className="d-flex flex-column">
                      <div className="d-flex align-items-center gap-2">
                        <span
                          style={{
                            backgroundColor: type.color.startsWith("#")
                              ? type.color
                              : `#${type.color}`,
                            width: "12px",
                            height: "12px",
                            borderRadius: "50%",
                            display: "inline-block",
                            marginRight: "8px",
                          }}
                        />
                        <strong>{type.name}</strong>
                      </div>
                      {isOverridden && (
                        <small
                          className="text-muted"
                          style={{ fontSize: "0.75rem" }}
                        >
                          (Overridden schedule)
                        </small>
                      )}
                    </div>
                  </td>

                  {isEditing ? (
                    <>
                      <td colSpan={4}>
                        <div className="card border-0 bg-light p-3">
                          <div className="form-check form-switch mb-3">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              role="switch"
                              id={`override-${type.id}`}
                              checked={isOverriding}
                              onChange={(e) =>
                                setIsOverriding(e.target.checked)
                              }
                            />
                            <label
                              className="form-check-label fw-bold"
                              htmlFor={`override-${type.id}`}
                            >
                              Override Series Retention Schedule
                            </label>
                          </div>

                          {isOverriding ? (
                            <div className="row g-3">
                              <div className="col-md-4">
                                <label className="form-label small text-muted">
                                  Active Retention
                                </label>
                                <div className="d-flex gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="Y"
                                    title="Years"
                                    className="form-control form-control-sm"
                                    value={activeRetention ?? ""}
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
                                    value={activeRetentionMonths ?? ""}
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
                                    value={activeRetentionDays ?? ""}
                                    onChange={(e) =>
                                      setActiveRetentionDays(
                                        Number(e.target.value),
                                      )
                                    }
                                  />
                                </div>
                              </div>
                              <div className="col-md-4">
                                <label className="form-label small text-muted">
                                  Inactive Retention
                                </label>
                                <div className="d-flex gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="Y"
                                    title="Years"
                                    className="form-control form-control-sm"
                                    value={inactiveRetention ?? ""}
                                    onChange={(e) =>
                                      setInactiveRetention(
                                        Number(e.target.value),
                                      )
                                    }
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    max="11"
                                    placeholder="M"
                                    title="Months"
                                    className="form-control form-control-sm"
                                    value={inactiveRetentionMonths ?? ""}
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
                                    value={inactiveRetentionDays ?? ""}
                                    onChange={(e) =>
                                      setInactiveRetentionDays(
                                        Number(e.target.value),
                                      )
                                    }
                                  />
                                </div>
                              </div>
                              <div className="col-md-4">
                                <label className="form-label small text-muted">
                                  Disposition
                                </label>
                                <select
                                  className="form-select form-select-sm"
                                  value={dispositionAction || "ARCHIVE"}
                                  onChange={(e) =>
                                    setDispositionAction(
                                      e.target.value as "ARCHIVE" | "DESTROY",
                                    )
                                  }
                                >
                                  <option value="ARCHIVE">Archive</option>
                                  <option value="DESTROY">Destroy</option>
                                </select>
                              </div>
                            </div>
                          ) : (
                            <div className="alert alert-info py-2 mb-0 mt-2 small">
                              This Document Type is currently inheriting its
                              retention schedule from its Records Series.
                            </div>
                          )}

                          <div className="d-flex justify-content-end gap-2 mt-3">
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={handleCancel}
                              disabled={updateMutation.isPending}
                            >
                              Cancel
                            </button>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleSave(type)}
                              disabled={updateMutation.isPending}
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>
                        {isOverridden
                          ? type.activeRetentionDuration
                          : (type.recordsSeries?.activeRetentionDuration ?? 0)}
                        y{" "}
                        {isOverridden
                          ? type.activeRetentionMonths || 0
                          : (type.recordsSeries?.activeRetentionMonths ?? 0)}
                        m{" "}
                        {isOverridden
                          ? type.activeRetentionDays || 0
                          : (type.recordsSeries?.activeRetentionDays ?? 0)}
                        d
                      </td>
                      <td>
                        {isOverridden
                          ? type.inactiveRetentionDuration
                          : (type.recordsSeries?.inactiveRetentionDuration ??
                            0)}
                        y{" "}
                        {isOverridden
                          ? type.inactiveRetentionMonths || 0
                          : (type.recordsSeries?.inactiveRetentionMonths ?? 0)}
                        m{" "}
                        {isOverridden
                          ? type.inactiveRetentionDays || 0
                          : (type.recordsSeries?.inactiveRetentionDays ?? 0)}
                        d
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            (isOverridden
                              ? type.dispositionAction
                              : type.recordsSeries?.dispositionAction) ===
                            "DESTROY"
                              ? "bg-danger"
                              : "bg-info"
                          }`}
                        >
                          {isOverridden
                            ? type.dispositionAction
                            : type.recordsSeries?.dispositionAction ||
                              "ARCHIVE"}
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
            {filteredTypes?.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted">
                  No document types defined in this series.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <RetentionHelpModal
        show={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </div>
  );
}
