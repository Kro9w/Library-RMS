import { useState } from "react";
import { trpc } from "../../trpc";
import { ConfirmModal } from "../../components/ConfirmModal";
import "./AdminDocumentTypes.css";

const presetColors = [
  "b93b46",
  "e07b3b",
  "f2d04f",
  "5aa96d",
  "3b7bb9",
  "8c3bb9",
];

// Series Form

function SeriesForm({
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  initial?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
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
    <form onSubmit={handleSubmit} className="series-form">
      <div className="series-form__field series-form__field--wide">
        <label className="form-label">Series Name</label>
        <input
          type="text"
          className="form-control"
          placeholder="e.g. Communication Letters, Financial Records"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="series-form__retention-grid">
        <div className="series-form__retention-col">
          <div className="series-form__retention-label">
            <i className="bi bi-hourglass-split" />
            Active Retention
          </div>
          <div className="series-form__ymd">
            <div>
              <label className="form-label">Years</label>
              <input
                type="number"
                min="0"
                className="form-control"
                value={activeY}
                onChange={(e) => setActiveY(+e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Months</label>
              <input
                type="number"
                min="0"
                max="11"
                className="form-control"
                value={activeM}
                onChange={(e) => setActiveM(+e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Days</label>
              <input
                type="number"
                min="0"
                max="30"
                className="form-control"
                value={activeD}
                onChange={(e) => setActiveD(+e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="series-form__retention-col">
          <div className="series-form__retention-label">
            <i className="bi bi-archive" />
            Inactive Retention
          </div>
          <div className="series-form__ymd">
            <div>
              <label className="form-label">Years</label>
              <input
                type="number"
                min="0"
                className="form-control"
                value={inactiveY}
                onChange={(e) => setInactiveY(+e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Months</label>
              <input
                type="number"
                min="0"
                max="11"
                className="form-control"
                value={inactiveM}
                onChange={(e) => setInactiveM(+e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Days</label>
              <input
                type="number"
                min="0"
                max="30"
                className="form-control"
                value={inactiveD}
                onChange={(e) => setInactiveD(+e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="series-form__retention-col series-form__retention-col--disposition">
          <div className="series-form__retention-label">
            <i className="bi bi-lightning-charge" />
            Disposition
          </div>
          <div className="series-form__disposition-options">
            <label
              className={`series-form__disposition-option ${disposition === "ARCHIVE" ? "active" : ""}`}
            >
              <input
                type="radio"
                name="disposition"
                value="ARCHIVE"
                checked={disposition === "ARCHIVE"}
                onChange={() => setDisposition("ARCHIVE")}
              />
              <i className="bi bi-archive" />
              Archive
            </label>
            <label
              className={`series-form__disposition-option series-form__disposition-option--destroy ${disposition === "DESTROY" ? "active active--destroy" : ""}`}
            >
              <input
                type="radio"
                name="disposition"
                value="DESTROY"
                checked={disposition === "DESTROY"}
                onChange={() => setDisposition("DESTROY")}
              />
              <i className="bi bi-trash3" />
              Destroy
            </label>
          </div>
        </div>
      </div>

      <div className="series-form__actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!name.trim() || isPending}
        >
          {isPending ? "Saving…" : initial ? "Update Series" : "Create Series"}
        </button>
      </div>
    </form>
  );
}

// Document Type Form

function DocumentTypeForm({
  seriesId,
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  seriesId: string;
  initial?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(
    initial?.color
      ? initial.color.startsWith("#")
        ? initial.color
        : `#${initial.color}`
      : `#${presetColors[0]}`,
  );
  const [isOverriding, setIsOverriding] = useState(
    initial ? initial.activeRetentionDuration !== null : false,
  );
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
  const [disposition, setDisposition] = useState<"ARCHIVE" | "DESTROY" | null>(
    initial?.dispositionAction ?? null,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanColor = color.startsWith("#") ? color.slice(1) : color;
    onSave({
      name,
      color: cleanColor,
      recordsSeriesId: seriesId,
      activeRetentionDuration: isOverriding ? activeY : null,
      activeRetentionMonths: isOverriding ? activeM : null,
      activeRetentionDays: isOverriding ? activeD : null,
      inactiveRetentionDuration: isOverriding ? inactiveY : null,
      inactiveRetentionMonths: isOverriding ? inactiveM : null,
      inactiveRetentionDays: isOverriding ? inactiveD : null,
      dispositionAction: isOverriding ? disposition : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="doctype-form">
      <div className="doctype-form__top">
        <div className="doctype-form__name-field">
          <label className="form-label">Type Name</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. Office Order, Memorandum"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="doctype-form__color-field">
          <label className="form-label">Color</label>
          <div className="doctype-form__color-row">
            <input
              type="color"
              className="form-control form-control-color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: 38, height: 38, padding: 4 }}
            />
            <input
              type="text"
              className="form-control"
              value={color}
              onChange={(e) =>
                setColor(
                  e.target.value.startsWith("#")
                    ? e.target.value
                    : `#${e.target.value}`,
                )
              }
              style={{
                width: 90,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
              }}
            />
            <div className="doctype-form__presets">
              {presetColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(`#${c}`)}
                  style={{
                    backgroundColor: `#${c}`,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: "none",
                    cursor: "pointer",
                    boxShadow:
                      color === `#${c}`
                        ? `0 0 0 2px #fff, 0 0 0 4px #${c}`
                        : "none",
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="doctype-form__override-toggle">
        <label className="doctype-form__toggle-label">
          <input
            type="checkbox"
            className="form-check-input"
            checked={isOverriding}
            onChange={(e) => setIsOverriding(e.target.checked)}
          />
          Override series retention schedule for this type
        </label>
      </div>

      {isOverriding && (
        <div className="doctype-form__override-fields">
          <div className="series-form__retention-grid">
            <div className="series-form__retention-col">
              <div className="series-form__retention-label">
                <i className="bi bi-hourglass-split" />
                Active Retention
              </div>
              <div className="series-form__ymd">
                <div>
                  <label className="form-label">Years</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={activeY}
                    onChange={(e) => setActiveY(+e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Months</label>
                  <input
                    type="number"
                    min="0"
                    max="11"
                    className="form-control"
                    value={activeM}
                    onChange={(e) => setActiveM(+e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Days</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    className="form-control"
                    value={activeD}
                    onChange={(e) => setActiveD(+e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="series-form__retention-col">
              <div className="series-form__retention-label">
                <i className="bi bi-archive" />
                Inactive Retention
              </div>
              <div className="series-form__ymd">
                <div>
                  <label className="form-label">Years</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={inactiveY}
                    onChange={(e) => setInactiveY(+e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Months</label>
                  <input
                    type="number"
                    min="0"
                    max="11"
                    className="form-control"
                    value={inactiveM}
                    onChange={(e) => setInactiveM(+e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Days</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    className="form-control"
                    value={inactiveD}
                    onChange={(e) => setInactiveD(+e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="series-form__retention-col series-form__retention-col--disposition">
              <div className="series-form__retention-label">
                <i className="bi bi-lightning-charge" />
                Disposition
              </div>
              <div className="series-form__disposition-options">
                <label
                  className={`series-form__disposition-option ${disposition === "ARCHIVE" ? "active" : ""}`}
                >
                  <input
                    type="radio"
                    name="doctype-disposition"
                    value="ARCHIVE"
                    checked={disposition === "ARCHIVE"}
                    onChange={() => setDisposition("ARCHIVE")}
                  />
                  <i className="bi bi-archive" />
                  Archive
                </label>
                <label
                  className={`series-form__disposition-option series-form__disposition-option--destroy ${disposition === "DESTROY" ? "active active--destroy" : ""}`}
                >
                  <input
                    type="radio"
                    name="doctype-disposition"
                    value="DESTROY"
                    checked={disposition === "DESTROY"}
                    onChange={() => setDisposition("DESTROY")}
                  />
                  <i className="bi bi-trash3" />
                  Destroy
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="series-form__actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!name.trim() || isPending}
        >
          {isPending ? "Saving…" : initial ? "Update Type" : "Add Type"}
        </button>
      </div>
    </form>
  );
}

// Series Card

function SeriesCard({
  series,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: {
  series: any;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const totalYears =
    (series.activeRetentionDuration ?? 0) +
    (series.inactiveRetentionDuration ?? 0);
  const totalMonths =
    (series.activeRetentionMonths ?? 0) + (series.inactiveRetentionMonths ?? 0);

  return (
    <div
      className={`series-card ${isSelected ? "series-card--selected" : ""}`}
      onClick={onSelect}
    >
      <div className="series-card__body">
        <div className="series-card__name">{series.name}</div>
        <div className="series-card__meta">
          <span className="series-card__badge">
            <i className="bi bi-file-earmark" />
            {series._count?.documentTypes ?? 0} types
          </span>
          <span className="series-card__badge">
            <i className="bi bi-clock" />
            {totalYears > 0
              ? `${totalYears}y`
              : totalMonths > 0
                ? `${totalMonths}m`
                : "No retention"}
          </span>
          <span
            className={`series-card__badge series-card__badge--disposition ${series.dispositionAction === "DESTROY" ? "series-card__badge--destroy" : "series-card__badge--archive"}`}
          >
            <i
              className={`bi ${series.dispositionAction === "DESTROY" ? "bi-trash3" : "bi-archive"}`}
            />
            {series.dispositionAction}
          </span>
        </div>
      </div>
      <div className="series-card__actions">
        <button
          className="btn-icon"
          title="Edit series"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <i className="bi bi-pencil" style={{ fontSize: 12 }} />
        </button>
        <button
          className="btn-icon btn-delete"
          title="Delete series"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <i className="bi bi-trash3" style={{ fontSize: 12 }} />
        </button>
      </div>
    </div>
  );
}

// Retention Display

function RetentionDisplay({ docType, series }: { docType: any; series: any }) {
  const isOverridden = docType.activeRetentionDuration !== null;
  const src = isOverridden ? docType : series;

  const formatYMD = (y: number, m: number, d: number) => {
    const parts = [];
    if (y) parts.push(`${y}y`);
    if (m) parts.push(`${m}m`);
    if (d) parts.push(`${d}d`);
    return parts.length ? parts.join(" ") : "0";
  };

  const activeStr = formatYMD(
    src.activeRetentionDuration ?? 0,
    src.activeRetentionMonths ?? 0,
    src.activeRetentionDays ?? 0,
  );
  const inactiveStr = formatYMD(
    src.inactiveRetentionDuration ?? 0,
    src.inactiveRetentionMonths ?? 0,
    src.inactiveRetentionDays ?? 0,
  );
  const action = src.dispositionAction ?? "ARCHIVE";

  return (
    <div className="retention-display">
      <div className="retention-display__phase">
        <span className="retention-display__phase-label">Active</span>
        <span className="retention-display__phase-value">{activeStr}</span>
      </div>
      <div className="retention-display__divider">→</div>
      <div className="retention-display__phase">
        <span className="retention-display__phase-label">Inactive</span>
        <span className="retention-display__phase-value">{inactiveStr}</span>
      </div>
      <div className="retention-display__divider">→</div>
      <span
        className={`retention-display__action ${action === "DESTROY" ? "retention-display__action--destroy" : "retention-display__action--archive"}`}
      >
        <i
          className={`bi ${action === "DESTROY" ? "bi-trash3" : "bi-archive"}`}
        />
        {action}
      </span>
      {isOverridden && (
        <span className="retention-display__override-badge">Override</span>
      )}
    </div>
  );
}

// Main Page

export default function AdminDocumentTypes() {
  const { data: allSeries, refetch: refetchSeries } =
    trpc.recordsSeries.getAll.useQuery();
  const { data: allDocTypes, refetch: refetchTypes } =
    trpc.documentTypes.getAllUnfiltered.useQuery();

  const createSeries = trpc.recordsSeries.create.useMutation();
  const updateSeries = trpc.recordsSeries.update.useMutation();
  const deleteSeries = trpc.recordsSeries.delete.useMutation();
  const createDocType = trpc.documentTypes.create.useMutation();
  const updateDocType = trpc.documentTypes.update.useMutation();
  const deleteDocType = trpc.documentTypes.delete.useMutation();

  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [showSeriesForm, setShowSeriesForm] = useState(false);
  const [editingSeries, setEditingSeries] = useState<any | null>(null);
  const [seriesToDelete, setSeriesToDelete] = useState<any | null>(null);

  const [showTypeForm, setShowTypeForm] = useState(false);
  const [editingType, setEditingType] = useState<any | null>(null);
  const [typeToDelete, setTypeToDelete] = useState<any | null>(null);

  const selectedSeries =
    allSeries?.find((s: any) => s.id === selectedSeriesId) ?? null;
  const seriesDocTypes =
    allDocTypes?.filter((t: any) => t.recordsSeriesId === selectedSeriesId) ??
    [];

  const handleSaveSeries = (data: any) => {
    if (editingSeries) {
      updateSeries.mutate(
        { id: editingSeries.id, ...data },
        {
          onSuccess: () => {
            refetchSeries();
            setEditingSeries(null);
            setShowSeriesForm(false);
          },
        },
      );
    } else {
      createSeries.mutate(data, {
        onSuccess: (created: any) => {
          refetchSeries();
          setShowSeriesForm(false);
          setSelectedSeriesId(created.id);
        },
      });
    }
  };

  const handleDeleteSeries = () => {
    if (!seriesToDelete) return;
    deleteSeries.mutate(
      { id: seriesToDelete.id },
      {
        onSuccess: () => {
          refetchSeries();
          if (selectedSeriesId === seriesToDelete.id) setSelectedSeriesId(null);
          setSeriesToDelete(null);
        },
        onError: (e) => alert(e.message),
      },
    );
  };

  const handleSaveDocType = (data: any) => {
    if (editingType) {
      updateDocType.mutate(
        { id: editingType.id, ...data },
        {
          onSuccess: () => {
            refetchTypes();
            setEditingType(null);
            setShowTypeForm(false);
          },
        },
      );
    } else {
      createDocType.mutate(data, {
        onSuccess: () => {
          refetchTypes();
          setShowTypeForm(false);
        },
      });
    }
  };

  const handleDeleteDocType = () => {
    if (!typeToDelete) return;
    deleteDocType.mutate(
      { id: typeToDelete.id },
      {
        onSuccess: () => {
          refetchTypes();
          setTypeToDelete(null);
        },
      },
    );
  };

  const isSeriesFormPending = createSeries.isPending || updateSeries.isPending;
  const isTypeFormPending = createDocType.isPending || updateDocType.isPending;

  return (
    <div className="rc-page">
      {/* Left column: Records Series */}
      <div className="rc-col rc-col--series">
        <div className="rc-col__header">
          <div>
            <div className="rc-col__title">Records Series</div>
            <div className="rc-col__desc">
              Top-level groupings with default retention
            </div>
          </div>
          {!showSeriesForm && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setShowSeriesForm(true);
                setEditingSeries(null);
              }}
            >
              <i className="bi bi-plus-lg" /> New Series
            </button>
          )}
        </div>

        {(showSeriesForm || editingSeries) && (
          <div className="rc-inline-form">
            <div className="rc-inline-form__label">
              {editingSeries
                ? `Editing: ${editingSeries.name}`
                : "New Records Series"}
            </div>
            <SeriesForm
              initial={editingSeries}
              onSave={handleSaveSeries}
              onCancel={() => {
                setShowSeriesForm(false);
                setEditingSeries(null);
              }}
              isPending={isSeriesFormPending}
            />
          </div>
        )}

        <div className="rc-series-list">
          {!allSeries?.length && !showSeriesForm && (
            <div className="rc-empty">
              <i className="bi bi-collection" />
              <p>No records series yet.</p>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => setShowSeriesForm(true)}
              >
                Create the first series
              </button>
            </div>
          )}
          {allSeries?.map((series: any) => (
            <SeriesCard
              key={series.id}
              series={series}
              isSelected={selectedSeriesId === series.id}
              onSelect={() => {
                setSelectedSeriesId(
                  series.id === selectedSeriesId ? null : series.id,
                );
                setShowTypeForm(false);
                setEditingType(null);
              }}
              onEdit={() => {
                setEditingSeries(series);
                setShowSeriesForm(true);
                setSelectedSeriesId(series.id);
              }}
              onDelete={() => setSeriesToDelete(series)}
            />
          ))}
        </div>
      </div>

      {/* Right column: Document Types */}
      <div
        className={`rc-col rc-col--types ${!selectedSeriesId ? "rc-col--disabled" : ""}`}
      >
        {!selectedSeriesId ? (
          <div className="rc-types-placeholder">
            <i className="bi bi-arrow-left" />
            <p>Select a series to manage its document types</p>
          </div>
        ) : (
          <>
            <div className="rc-col__header">
              <div>
                <div className="rc-col__title">
                  Document Types
                  <span className="rc-col__title-context">
                    in {selectedSeries?.name}
                  </span>
                </div>
                <div className="rc-col__desc">
                  Each type can optionally override the series retention
                </div>
              </div>
              {!showTypeForm && !editingType && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowTypeForm(true)}
                >
                  <i className="bi bi-plus-lg" /> Add Type
                </button>
              )}
            </div>

            {(showTypeForm || editingType) && (
              <div className="rc-inline-form">
                <div className="rc-inline-form__label">
                  {editingType
                    ? `Editing: ${editingType.name}`
                    : "New Document Type"}
                </div>
                <DocumentTypeForm
                  seriesId={selectedSeriesId}
                  initial={editingType}
                  onSave={handleSaveDocType}
                  onCancel={() => {
                    setShowTypeForm(false);
                    setEditingType(null);
                  }}
                  isPending={isTypeFormPending}
                />
              </div>
            )}

            {!seriesDocTypes.length && !showTypeForm ? (
              <div className="rc-empty">
                <i className="bi bi-file-earmark-plus" />
                <p>No document types in this series.</p>
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => setShowTypeForm(true)}
                >
                  Add the first type
                </button>
              </div>
            ) : (
              <div className="rc-types-table">
                <div className="rc-types-table__head">
                  <span>Type</span>
                  <span>Retention Schedule</span>
                  <span />
                </div>
                {seriesDocTypes.map((docType: any) => {
                  const color = docType.color.startsWith("#")
                    ? docType.color
                    : `#${docType.color}`;
                  return (
                    <div key={docType.id} className="rc-types-table__row">
                      <div className="rc-types-table__name">
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            backgroundColor: color,
                            flexShrink: 0,
                            display: "inline-block",
                          }}
                        />
                        {docType.name}
                      </div>
                      <RetentionDisplay
                        docType={docType}
                        series={selectedSeries}
                      />
                      <div className="rc-types-table__actions">
                        <button
                          className="btn-icon"
                          title="Edit type"
                          onClick={() => {
                            setEditingType(docType);
                            setShowTypeForm(false);
                          }}
                        >
                          <i
                            className="bi bi-pencil"
                            style={{ fontSize: 12 }}
                          />
                        </button>
                        <button
                          className="btn-icon btn-delete"
                          title="Delete type"
                          onClick={() => setTypeToDelete(docType)}
                        >
                          <i
                            className="bi bi-trash3"
                            style={{ fontSize: 12 }}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirm Modals */}
      <ConfirmModal
        show={!!seriesToDelete}
        title="Delete Records Series"
        onConfirm={handleDeleteSeries}
        onClose={() => setSeriesToDelete(null)}
        isConfirming={deleteSeries.isPending}
      >
        <p>
          Are you sure you want to delete{" "}
          <strong>{seriesToDelete?.name}</strong>? This cannot be undone if the
          series has no document types.
        </p>
      </ConfirmModal>

      <ConfirmModal
        show={!!typeToDelete}
        title="Delete Document Type"
        onConfirm={handleDeleteDocType}
        onClose={() => setTypeToDelete(null)}
        isConfirming={deleteDocType.isPending}
      >
        <p>
          Are you sure you want to delete <strong>{typeToDelete?.name}</strong>?
        </p>
      </ConfirmModal>
    </div>
  );
}
