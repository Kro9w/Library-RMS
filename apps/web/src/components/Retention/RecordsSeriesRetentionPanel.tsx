import { useState } from "react";
import { trpc } from "../../trpc";

export function RecordsSeriesRetentionPanel() {
  const { data: recordsSeries, refetch } = trpc.recordsSeries.getAll.useQuery();
  const updateMutation = trpc.recordsSeries.update.useMutation();

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

  const handleEdit = (series: any) => {
    setEditingId(series.id);
    setActiveRetention(series.activeRetentionDuration || 0);
    setActiveRetentionMonths(series.activeRetentionMonths || 0);
    setActiveRetentionDays(series.activeRetentionDays || 0);

    setInactiveRetention(series.inactiveRetentionDuration || 0);
    setInactiveRetentionMonths(series.inactiveRetentionMonths || 0);
    setInactiveRetentionDays(series.inactiveRetentionDays || 0);

    setDispositionAction(series.dispositionAction || "ARCHIVE");
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleSave = (series: any) => {
    updateMutation.mutate(
      {
        id: series.id,
        name: series.name,
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
    <div>
      <p className="text-muted mb-4">
        Configure the base lifecycle for each Records Series. Document Types
        within a series will inherit these settings by default.
      </p>

      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr>
              <th style={{ width: "30%" }}>Records Series</th>
              <th style={{ width: "20%" }}>Active (Y/M/D)</th>
              <th style={{ width: "20%" }}>Inactive (Y/M/D)</th>
              <th style={{ width: "15%" }}>Disposition</th>
              <th style={{ width: "15%" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recordsSeries?.map((series: any) => {
              const isEditing = editingId === series.id;

              return (
                <tr key={series.id}>
                  <td>
                    <strong>{series.name}</strong>
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
                              setActiveRetention(Number(e.target.value) || 0)
                            }
                          />
                          <input
                            type="number"
                            min="0"
                            placeholder="M"
                            title="Months"
                            className="form-control form-control-sm"
                            value={activeRetentionMonths}
                            onChange={(e) =>
                              setActiveRetentionMonths(
                                Number(e.target.value) || 0,
                              )
                            }
                          />
                          <input
                            type="number"
                            min="0"
                            placeholder="D"
                            title="Days"
                            className="form-control form-control-sm"
                            value={activeRetentionDays}
                            onChange={(e) =>
                              setActiveRetentionDays(
                                Number(e.target.value) || 0,
                              )
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
                              setInactiveRetention(Number(e.target.value) || 0)
                            }
                          />
                          <input
                            type="number"
                            min="0"
                            placeholder="M"
                            title="Months"
                            className="form-control form-control-sm"
                            value={inactiveRetentionMonths}
                            onChange={(e) =>
                              setInactiveRetentionMonths(
                                Number(e.target.value) || 0,
                              )
                            }
                          />
                          <input
                            type="number"
                            min="0"
                            placeholder="D"
                            title="Days"
                            className="form-control form-control-sm"
                            value={inactiveRetentionDays}
                            onChange={(e) =>
                              setInactiveRetentionDays(
                                Number(e.target.value) || 0,
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
                        <button
                          className="btn btn-sm btn-primary me-2"
                          onClick={() => handleSave(series)}
                          disabled={updateMutation.isPending}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={handleCancel}
                          disabled={updateMutation.isPending}
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>
                        {series.activeRetentionDuration}y{" "}
                        {series.activeRetentionMonths}m{" "}
                        {series.activeRetentionDays}d
                      </td>
                      <td>
                        {series.inactiveRetentionDuration}y{" "}
                        {series.inactiveRetentionMonths}m{" "}
                        {series.inactiveRetentionDays}d
                      </td>
                      <td>
                        <span
                          className={`badge bg-${
                            series.dispositionAction === "ARCHIVE"
                              ? "info"
                              : "danger"
                          }`}
                        >
                          {series.dispositionAction}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleEdit(series)}
                        >
                          Edit
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {recordsSeries?.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-4 text-muted">
                  No records series exist.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
