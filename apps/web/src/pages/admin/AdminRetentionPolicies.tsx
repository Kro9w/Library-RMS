import { useState } from "react";
import { trpc } from "../../trpc";
import "../../components/StandardModal.css";
import "./AdminRetentionPolicies.css";
import { RetentionHelpModal } from "../../components/Retention/RetentionHelpModal";

export function LifecycleBar({
  active,
  inactive,
}: {
  active: number;
  inactive: number;
}) {
  const total = active + inactive;
  if (total === 0) {
    return (
      <div className="lifecycle-bar lifecycle-bar--empty">
        <span>No retention schedule</span>
      </div>
    );
  }
  const activePct = total > 0 ? (active / total) * 100 : 50;
  const inactivePct = 100 - activePct;

  return (
    <div className="lifecycle-bar">
      <div className="lifecycle-bar__track">
        <div
          className="lifecycle-bar__segment lifecycle-bar__segment--active"
          style={{ width: `${activePct}%` }}
          title={`Active: ${active}y`}
        />
        <div
          className="lifecycle-bar__segment lifecycle-bar__segment--inactive"
          style={{ width: `${inactivePct}%` }}
          title={`Inactive: ${inactive}y`}
        />
      </div>
      <div className="lifecycle-bar__labels">
        <span className="lifecycle-bar__label lifecycle-bar__label--active">
          Active · {active}y
        </span>
        <span className="lifecycle-bar__label lifecycle-bar__label--inactive">
          Inactive · {inactive}y
        </span>
      </div>
    </div>
  );
}

// Form Component for Editing Retention
function RetentionFormModal({
  show,
  onClose,
  title,
  initial,
  onSave,
  isPending,
}: {
  show: boolean;
  onClose: () => void;
  title: string;
  initial: any;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [activeY, setActiveY] = useState(initial?.activeRetentionDuration ?? 0);
  const [activeM, setActiveM] = useState(initial?.activeRetentionMonths ?? 0);
  const [activeD, setActiveD] = useState(initial?.activeRetentionDays ?? 0);
  const [inactiveY, setInactiveY] = useState(
    initial?.inactiveRetentionDuration ?? 0,
  );
  const [inactiveM, setInactiveM] = useState(
    initial?.inactiveRetentionMonths ?? 0,
  );
  const [inactiveD, setInactiveD] = useState(
    initial?.inactiveRetentionDays ?? 0,
  );
  const [disposition, setDisposition] = useState<"ARCHIVE" | "DESTROY">(
    initial?.dispositionAction ?? "ARCHIVE",
  );

  const handleNumChange =
    (setter: React.Dispatch<React.SetStateAction<number>>, maxVal: number) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value.replace(/\D/g, "");
      if (val.length > 2) val = val.slice(0, 2);
      let num = parseInt(val, 10);
      if (isNaN(num)) num = 0;
      if (num > maxVal) num = maxVal;
      setter(num);
    };

  if (!show) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: initial?.name,
      color: initial?.color,
      activeRetentionDuration: activeY,
      activeRetentionMonths: activeM,
      activeRetentionDays: activeD,
      inactiveRetentionDuration: inactiveY,
      inactiveRetentionMonths: inactiveM,
      inactiveRetentionDays: inactiveD,
      dispositionAction: disposition,
    });
  };

  return (
    <div className="standard-modal-backdrop" onClick={onClose}>
      <div
        className="standard-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 500 }}
      >
        <div className="standard-modal-header">
          <div className="standard-modal-icon">
            <i className="bi bi-clock-history"></i>
          </div>
          <div className="standard-modal-header-text">
            <h5 className="standard-modal-title">Edit Retention</h5>
            <p className="standard-modal-subtitle">{title}</p>
          </div>
          <button
            type="button"
            className="standard-modal-close"
            onClick={onClose}
          >
            <i className="bi bi-x"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="standard-modal-body">
            <div className="retention-modal-grid">
              <div className="retention-modal-col">
                <div className="retention-modal-label">
                  <i className="bi bi-hourglass-split" /> Active Retention
                </div>
                <div className="retention-modal-ymd">
                  <div>
                    <label className="form-label">Years</label>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      className="form-control form-control-sm"
                      onChange={handleNumChange(setActiveY, 99)}
                      value={activeY === 0 ? "" : activeY}
                    />
                  </div>
                  <div>
                    <label className="form-label">Months</label>
                    <input
                      type="number"
                      min={0}
                      max={12}
                      className="form-control form-control-sm"
                      onChange={handleNumChange(setActiveM, 12)}
                      value={activeM === 0 ? "" : activeM}
                    />
                  </div>
                  <div>
                    <label className="form-label">Days</label>
                    <input
                      type="number"
                      min={0}
                      max={31}
                      className="form-control form-control-sm"
                      onChange={handleNumChange(setActiveD, 31)}
                      value={activeD === 0 ? "" : activeD}
                    />
                  </div>
                </div>
              </div>

              <div className="retention-modal-col">
                <div className="retention-modal-label">
                  <i className="bi bi-archive" /> Inactive Retention
                </div>
                <div className="retention-modal-ymd">
                  <div>
                    <label className="form-label">Years</label>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      className="form-control form-control-sm"
                      onChange={handleNumChange(setInactiveY, 99)}
                      value={inactiveY === 0 ? "" : inactiveY}
                    />
                  </div>
                  <div>
                    <label className="form-label">Months</label>
                    <input
                      type="number"
                      min={0}
                      max={12}
                      className="form-control form-control-sm"
                      onChange={handleNumChange(setInactiveM, 12)}
                      value={inactiveM === 0 ? "" : inactiveM}
                    />
                  </div>
                  <div>
                    <label className="form-label">Days</label>
                    <input
                      type="number"
                      min={0}
                      max={31}
                      className="form-control form-control-sm"
                      onChange={handleNumChange(setInactiveD, 31)}
                      value={inactiveD === 0 ? "" : inactiveD}
                    />
                  </div>
                </div>
              </div>

              <div className="retention-modal-col">
                <div className="retention-modal-label">
                  <i className="bi bi-lightning-charge" /> Disposition
                </div>
                <div className="retention-modal-disposition">
                  <label
                    className={`retention-disp-option ${disposition === "ARCHIVE" ? "active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="disposition"
                      value="ARCHIVE"
                      checked={disposition === "ARCHIVE"}
                      onChange={() => setDisposition("ARCHIVE")}
                    />
                    <i className="bi bi-archive" /> Archive
                  </label>
                  <label
                    className={`retention-disp-option retention-disp-option--destroy ${disposition === "DESTROY" ? "active active--destroy" : ""}`}
                  >
                    <input
                      type="radio"
                      name="disposition"
                      value="DESTROY"
                      checked={disposition === "DESTROY"}
                      onChange={() => setDisposition("DESTROY")}
                    />
                    <i className="bi bi-trash3" /> Destroy
                  </label>
                </div>
              </div>
            </div>

            <div className="standard-modal-notice standard-modal-notice-info mt-2">
              <i className="bi bi-info-circle"></i>
              <p>
                Setting all retention fields to 0 means "No schedule". For
                document types, setting fields to 0 acts as a local override.
              </p>
            </div>
          </div>

          <div className="standard-modal-footer">
            <button
              type="button"
              className="standard-modal-btn standard-modal-btn-ghost"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="standard-modal-btn standard-modal-btn-confirm"
              disabled={isPending}
            >
              {isPending ? "Saving..." : "Save Retention"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Retention Row

function RetentionRow({
  name,
  color,
  activeY,
  activeM,
  activeD,
  inactiveY,
  inactiveM,
  inactiveD,
  dispositionAction,
  isOverride,
  isSeriesRow,
  totalTypes,
  onEdit,
}: {
  name: string;
  color?: string;
  activeY: number;
  activeM: number;
  activeD: number;
  inactiveY: number;
  inactiveM: number;
  inactiveD: number;
  dispositionAction: string;
  isOverride?: boolean;
  isSeriesRow?: boolean;
  totalTypes?: number;
  onEdit: () => void;
}) {
  const fmtDuration = (y: number, m: number, d: number) => {
    const parts: string[] = [];
    if (y) parts.push(`${y}y`);
    if (m) parts.push(`${m}m`);
    if (d) parts.push(`${d}d`);
    return parts.length ? parts.join(" ") : "—";
  };

  const totalYears = activeY + inactiveY;
  const activePct =
    totalYears > 0 ? Math.round((activeY / totalYears) * 100) : 0;

  return (
    <div
      className={`retention-row ${isSeriesRow ? "retention-row--series" : "retention-row--type"}`}
    >
      <div className="retention-row__name">
        {color && (
          <span
            className="retention-row__color-dot"
            style={{
              backgroundColor: color.startsWith("#") ? color : `#${color}`,
            }}
          />
        )}
        {isSeriesRow && !color && (
          <i className="bi bi-collection retention-row__series-icon" />
        )}
        <span
          className={
            isSeriesRow
              ? "retention-row__series-name"
              : "retention-row__type-name"
          }
        >
          {name}
        </span>
        {isSeriesRow && totalTypes !== undefined && (
          <span className="retention-row__type-count">{totalTypes} types</span>
        )}
        {isOverride && (
          <span className="retention-row__override-chip">Override</span>
        )}
      </div>

      <div className="retention-row__active">
        {fmtDuration(activeY, activeM, activeD)}
      </div>
      <div className="retention-row__inactive">
        {fmtDuration(inactiveY, inactiveM, inactiveD)}
      </div>

      <div className="retention-row__bar">
        {totalYears > 0 ? (
          <div className="retention-mini-bar">
            <div
              className="retention-mini-bar__active"
              style={{ width: `${activePct}%` }}
              title={`Active: ${activeY}y`}
            />
            <div
              className="retention-mini-bar__inactive"
              style={{ width: `${100 - activePct}%` }}
              title={`Inactive: ${inactiveY}y`}
            />
          </div>
        ) : (
          <span className="retention-row__no-schedule">No schedule</span>
        )}
      </div>

      <div className="retention-row__disposition">
        <span
          className={`retention-row__action-badge ${dispositionAction === "DESTROY" ? "retention-row__action-badge--destroy" : "retention-row__action-badge--archive"}`}
        >
          <i
            className={`bi ${dispositionAction === "DESTROY" ? "bi-trash3" : "bi-archive"}`}
          />
          {dispositionAction}
        </span>
      </div>

      <div className="retention-row__actions">
        <button
          className="btn-icon"
          title="Edit retention"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <i className="bi bi-pencil" />
        </button>
      </div>
    </div>
  );
}

// Main Page

export default function AdminRetentionPolicies() {
  const { data: allSeries, refetch: refetchSeries } =
    trpc.recordsSeries.getAll.useQuery();
  const { data: allDocTypes, refetch: refetchTypes } =
    trpc.documentTypes.getAllUnfiltered.useQuery();

  const updateSeries = trpc.recordsSeries.update.useMutation();
  const updateDocType = trpc.documentTypes.update.useMutation();

  const [expandedSeries, setExpandedSeries] = useState<Record<string, boolean>>(
    {},
  );

  const [editingItem, setEditingItem] = useState<{
    type: "SERIES" | "DOCTYPE";
    id: string;
    name: string;
    initialData: any;
  } | null>(null);

  const [showHelp, setShowHelp] = useState(false);

  const toggleSeries = (id: string) => {
    setExpandedSeries((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveRetention = (data: any) => {
    if (!editingItem) return;
    if (editingItem.type === "SERIES") {
      updateSeries.mutate(
        { id: editingItem.id, ...data },
        {
          onSuccess: () => {
            refetchSeries();
            setEditingItem(null);
          },
        },
      );
    } else {
      updateDocType.mutate(
        { id: editingItem.id, ...data },
        {
          onSuccess: () => {
            refetchTypes();
            setEditingItem(null);
          },
        },
      );
    }
  };

  if (!allSeries?.length) {
    return (
      <div className="rp-page">
        <div className="rp-header">
          <div>
            <h2 style={{ color: "var(--brand)" }}>
              Records Retention Policies
            </h2>
            <p className="admin-page-desc">
              Lifecycle schedules inherited from Records Series and optionally
              overridden per Document Type.
            </p>
          </div>
        </div>
        <div className="rp-empty-state">
          <i className="bi bi-clock-history" />
          <h4>No Records Series defined</h4>
          <p>
            Create Records Series and Document Types in the{" "}
            <strong>Records Classification</strong> page first.
          </p>
          <a href="/admin/document-types" className="btn btn-primary btn-sm">
            <i className="bi bi-arrow-left me-1" />
            Go to Records Classification
          </a>
        </div>
      </div>
    );
  }

  const totalDocTypes = allDocTypes?.length ?? 0;
  const overriddenCount =
    allDocTypes?.filter((t: any) => t.activeRetentionDuration !== null)
      .length ?? 0;
  const destroyCount =
    allDocTypes?.filter((t: any) => {
      const effectiveAction =
        t.activeRetentionDuration !== null
          ? t.dispositionAction
          : allSeries?.find((s: any) => s.id === t.recordsSeriesId)
              ?.dispositionAction;
      return effectiveAction === "DESTROY";
    }).length ?? 0;

  return (
    <div className="rp-page">
      <div className="rp-header">
        <div>
          <h2 style={{ color: "var(--brand)" }}>Records Retention Policies</h2>{" "}
          <p className="admin-page-desc">
            Lifecycle schedules inherited from Records Series and optionally
            overridden per Document Type. Click the edit icon to change
            retention settings.
          </p>
        </div>
      </div>

      {/* Summary chips */}
      <div className="rp-summary">
        <div className="rp-summary__chip">
          <div className="rp-summary__chip-icon rp-summary__chip-icon--series">
            <i className="bi bi-collection" />
          </div>
          <div>
            <div className="rp-summary__chip-value">{allSeries.length}</div>
            <div className="rp-summary__chip-label">Records Series</div>
          </div>
        </div>
        <div className="rp-summary__chip">
          <div className="rp-summary__chip-icon rp-summary__chip-icon--types">
            <i className="bi bi-file-earmark" />
          </div>
          <div>
            <div className="rp-summary__chip-value">{totalDocTypes}</div>
            <div className="rp-summary__chip-label">Document Types</div>
          </div>
        </div>
        <div className="rp-summary__chip">
          <div className="rp-summary__chip-icon rp-summary__chip-icon--override">
            <i className="bi bi-pencil-square" />
          </div>
          <div>
            <div className="rp-summary__chip-value">{overriddenCount}</div>
            <div className="rp-summary__chip-label">Overridden Types</div>
          </div>
        </div>
        <div className="rp-summary__chip">
          <div className="rp-summary__chip-icon rp-summary__chip-icon--destroy">
            <i className="bi bi-trash3" />
          </div>
          <div>
            <div className="rp-summary__chip-value">{destroyCount}</div>
            <div className="rp-summary__chip-label">
              Scheduled for Destruction
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="rp-legend">
        <span className="rp-legend__item">
          <span className="rp-legend__dot rp-legend__dot--active" />
          Active period
        </span>
        <span className="rp-legend__sep">·</span>
        <span className="rp-legend__item">
          <span className="rp-legend__dot rp-legend__dot--inactive" />
          Inactive period
        </span>
        <span className="rp-legend__sep">·</span>
        <span className="rp-legend__item">
          <span className="rp-legend__badge rp-legend__badge--override">
            Override
          </span>
          Type-specific override
        </span>
        <span className="rp-legend__sep">·</span>
        <span className="rp-legend__item">
          Duration uses <strong>Y</strong>ears / <strong>M</strong>onths /{" "}
          <strong>D</strong>ays
        </span>
      </div>

      {/* Table */}
      <div className="rp-table-card">
        <div className="rp-table-head">
          <span>Name</span>
          <span>Active</span>
          <span>Inactive</span>
          <span>Proportion</span>
          <span>Disposition</span>
          <span style={{ width: 40 }}></span>
        </div>

        {allSeries.map((series: any) => {
          const types =
            allDocTypes?.filter((t: any) => t.recordsSeriesId === series.id) ??
            [];
          const isExpanded = !!expandedSeries[series.id];

          return (
            <div key={series.id} className="rp-series-block">
              {/* Series row */}
              <div
                className="rp-series-toggle"
                onClick={() => toggleSeries(series.id)}
                title={isExpanded ? "Collapse types" : "Expand types"}
                style={{ cursor: "pointer" }}
              >
                <RetentionRow
                  name={series.name}
                  activeY={series.activeRetentionDuration ?? 0}
                  activeM={series.activeRetentionMonths ?? 0}
                  activeD={series.activeRetentionDays ?? 0}
                  inactiveY={series.inactiveRetentionDuration ?? 0}
                  inactiveM={series.inactiveRetentionMonths ?? 0}
                  inactiveD={series.inactiveRetentionDays ?? 0}
                  dispositionAction={series.dispositionAction ?? "ARCHIVE"}
                  isSeriesRow
                  totalTypes={types.length}
                  onEdit={() => {
                    setEditingItem({
                      type: "SERIES",
                      id: series.id,
                      name: series.name,
                      initialData: series,
                    });
                  }}
                />
                <i
                  className={`bi bi-chevron-${isExpanded ? "up" : "down"} rp-series-toggle__icon`}
                />
              </div>

              {/* Document type rows */}
              {isExpanded && types.length > 0 && (
                <div className="rp-types-list">
                  {types.map((docType: any) => {
                    const isOverride = docType.activeRetentionDuration !== null;
                    const src = isOverride ? docType : series;

                    return (
                      <RetentionRow
                        key={docType.id}
                        name={docType.name}
                        color={docType.color}
                        activeY={src.activeRetentionDuration ?? 0}
                        activeM={src.activeRetentionMonths ?? 0}
                        activeD={src.activeRetentionDays ?? 0}
                        inactiveY={src.inactiveRetentionDuration ?? 0}
                        inactiveM={src.inactiveRetentionMonths ?? 0}
                        inactiveD={src.inactiveRetentionDays ?? 0}
                        dispositionAction={src.dispositionAction ?? "ARCHIVE"}
                        isOverride={isOverride}
                        onEdit={() => {
                          setEditingItem({
                            type: "DOCTYPE",
                            id: docType.id,
                            name: docType.name,
                            initialData: isOverride
                              ? docType
                              : {
                                  activeRetentionDuration: 0,
                                  activeRetentionMonths: 0,
                                  activeRetentionDays: 0,
                                  inactiveRetentionDuration: 0,
                                  inactiveRetentionMonths: 0,
                                  inactiveRetentionDays: 0,
                                  dispositionAction: "ARCHIVE",
                                },
                          });
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {isExpanded && types.length === 0 && (
                <div className="rp-types-empty">
                  No document types in this series.
                  <a
                    href="/admin/document-types"
                    style={{ color: "var(--brand)", marginLeft: 6 }}
                  >
                    Add types →
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Prospective note */}
      <div className="rp-prospective-note mt-3">
        <i className="bi bi-info-circle" />
        <span>
          Retention schedules are{" "}
          <strong>snapshotted at document creation</strong>. Changes here apply
          to new documents only and will not affect existing records.{" "}
          <button
            onClick={() => setShowHelp(true)}
            className="btn-link"
            style={{
              padding: 0,
              border: "none",
              background: "none",
              color: "var(--brand)",
              fontWeight: 600,
            }}
          >
            Learn more...
          </button>
        </span>
      </div>

      <RetentionHelpModal show={showHelp} onClose={() => setShowHelp(false)} />

      <RetentionFormModal
        key={editingItem ? editingItem.id : "new"}
        show={editingItem !== null}
        onClose={() => setEditingItem(null)}
        title={editingItem?.name ?? ""}
        initial={editingItem?.initialData}
        onSave={handleSaveRetention}
        isPending={updateSeries.isPending || updateDocType.isPending}
      />
    </div>
  );
}
