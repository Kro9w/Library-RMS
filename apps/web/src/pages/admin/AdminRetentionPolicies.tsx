import { useState } from "react";
import { trpc } from "../../trpc";
import "./AdminRetentionPolicies.css";

function LifecycleBar({
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
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────

export default function AdminRetentionPolicies() {
  const { data: allSeries } = trpc.recordsSeries.getAll.useQuery();
  const { data: allDocTypes } = trpc.documentTypes.getAllUnfiltered.useQuery();

  const [expandedSeries, setExpandedSeries] = useState<Record<string, boolean>>(
    {},
  );

  const toggleSeries = (id: string) => {
    setExpandedSeries((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!allSeries?.length) {
    return (
      <div className="rp-page">
        <div className="rp-header">
          <div>
            <h2 className="admin-page-title">Records Retention Policies</h2>
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
          <h2 className="admin-page-title">Records Retention Policies</h2>
          <p className="admin-page-desc">
            Lifecycle schedules inherited from Records Series and optionally
            overridden per Document Type. Edit schedules in{" "}
            <a
              href="/admin/document-types"
              style={{ color: "var(--brand)", fontWeight: 500 }}
            >
              Records Classification
            </a>
            .
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
        </div>

        {allSeries.map((series: any) => {
          const types =
            allDocTypes?.filter((t: any) => t.recordsSeriesId === series.id) ??
            [];
          const isExpanded = !!expandedSeries[series.id];

          return (
            <div key={series.id} className="rp-series-block">
              {/* Series row */}
              <button
                className="rp-series-toggle"
                onClick={() => toggleSeries(series.id)}
                title={isExpanded ? "Collapse types" : "Expand types"}
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
                />
                <i
                  className={`bi bi-chevron-${isExpanded ? "up" : "down"} rp-series-toggle__icon`}
                />
              </button>

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
      <div className="rp-prospective-note">
        <i className="bi bi-info-circle" />
        <span>
          Retention schedules are{" "}
          <strong>snapshotted at document creation</strong>. Changes here apply
          to new documents only and will not affect existing records.
        </span>
      </div>
    </div>
  );
}
