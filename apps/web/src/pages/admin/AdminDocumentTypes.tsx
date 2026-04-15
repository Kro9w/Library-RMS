import { useState } from "react";
import { trpc } from "../../trpc";
import { ConfirmModal } from "../../components/ConfirmModal";
import "../../components/StandardModal.css";
import "./AdminDocumentTypes.css";

const presetColors = [
  "b93b46",
  "e07b3b",
  "f2d04f",
  "5aa96d",
  "3b7bb9",
  "8c3bb9",
  "383838",
];

// Series Form Modal

function SeriesFormModal({
  show,
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  show: boolean;
  initial?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");

  if (!show) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name });
  };

  return (
    <div className="standard-modal-backdrop" onClick={onCancel}>
      <div
        className="standard-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 400 }}
      >
        <div className="standard-modal-header">
          <div className="standard-modal-icon">
            <i className="bi bi-collection"></i>
          </div>
          <div className="standard-modal-header-text">
            <h5 className="standard-modal-title">
              {initial ? "Edit Records Series" : "New Records Series"}
            </h5>
            <p className="standard-modal-subtitle">
              Top-level groupings for document types
            </p>
          </div>
          <button
            type="button"
            className="standard-modal-close"
            onClick={onCancel}
          >
            <i className="bi bi-x"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="standard-modal-body">
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
            <div className="standard-modal-notice standard-modal-notice-info mt-3">
              <i className="bi bi-info-circle"></i>
              <p>
                Retention schedule configuration has been moved to the Records
                Retention page.
              </p>
            </div>
          </div>
          <div className="standard-modal-footer">
            <button
              type="button"
              className="standard-modal-btn standard-modal-btn-ghost"
              onClick={onCancel}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="standard-modal-btn standard-modal-btn-confirm"
              disabled={!name.trim() || isPending}
            >
              {isPending
                ? "Saving…"
                : initial
                  ? "Update Series"
                  : "Create Series"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Document Type Form Modal

function DocumentTypeFormModal({
  show,
  seriesId,
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  show: boolean;
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

  if (!show) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanColor = color.startsWith("#") ? color.slice(1) : color;
    onSave({
      name,
      color: cleanColor,
      recordsSeriesId: seriesId,
    });
  };

  return (
    <div className="standard-modal-backdrop" onClick={onCancel}>
      <div
        className="standard-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 440 }}
      >
        <div className="standard-modal-header">
          <div className="standard-modal-icon">
            <i className="bi bi-file-earmark"></i>
          </div>
          <div className="standard-modal-header-text">
            <h5 className="standard-modal-title">
              {initial ? "Edit Document Type" : "New Document Type"}
            </h5>
            <p className="standard-modal-subtitle">
              Configure name and color for categorization
            </p>
          </div>
          <button
            type="button"
            className="standard-modal-close"
            onClick={onCancel}
          >
            <i className="bi bi-x"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="standard-modal-body">
            <div className="doctype-form__name-field mb-3">
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
                        width: 30,
                        height: 30,
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

            <div className="standard-modal-notice standard-modal-notice-info mt-3">
              <i className="bi bi-info-circle"></i>
              <p>
                Retention schedule overrides have been moved to the Records
                Retention page.
              </p>
            </div>
          </div>

          <div className="standard-modal-footer">
            <button
              type="button"
              className="standard-modal-btn standard-modal-btn-ghost"
              onClick={onCancel}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="standard-modal-btn standard-modal-btn-confirm"
              disabled={!name.trim() || isPending}
            >
              {isPending ? "Saving…" : initial ? "Update Type" : "Add Type"}
            </button>
          </div>
        </form>
      </div>
    </div>
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
              Top-level groupings for document types
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setEditingSeries(null);
              setShowSeriesForm(true);
            }}
          >
            <i className="bi bi-plus-lg" /> New Series
          </button>
        </div>

        <div className="rc-series-list">
          {!allSeries?.length && (
            <div className="rc-empty">
              <i className="bi bi-collection" />
              <p>No records series yet.</p>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => {
                  setEditingSeries(null);
                  setShowSeriesForm(true);
                }}
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
                  Types define visual classification colors
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setEditingType(null);
                  setShowTypeForm(true);
                }}
              >
                <i className="bi bi-plus-lg" /> Add Type
              </button>
            </div>

            {!seriesDocTypes.length ? (
              <div className="rc-empty">
                <i className="bi bi-file-earmark-plus" />
                <p>No document types in this series.</p>
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => {
                    setEditingType(null);
                    setShowTypeForm(true);
                  }}
                >
                  Add the first type
                </button>
              </div>
            ) : (
              <div className="rc-types-table">
                <div className="rc-types-table__head">
                  <span>Type</span>
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
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            backgroundColor: color,
                            flexShrink: 0,
                            display: "inline-block",
                            aspectRatio: "1 / 1",
                          }}
                        />
                        {docType.name}
                      </div>
                      <div className="rc-types-table__actions">
                        <button
                          className="btn-icon"
                          title="Edit type"
                          onClick={() => {
                            setEditingType(docType);
                            setShowTypeForm(true);
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

      {/* Series Modal */}
      {showSeriesForm && (
        <SeriesFormModal
          key={editingSeries ? editingSeries.id : "new"}
          show={showSeriesForm}
          initial={editingSeries}
          onSave={handleSaveSeries}
          onCancel={() => {
            setShowSeriesForm(false);
            setEditingSeries(null);
          }}
          isPending={isSeriesFormPending}
        />
      )}

      {/* DocType Modal */}
      {showTypeForm && (
        <DocumentTypeFormModal
          key={editingType ? editingType.id : "new"}
          show={showTypeForm}
          seriesId={selectedSeriesId!}
          initial={editingType}
          onSave={handleSaveDocType}
          onCancel={() => {
            setShowTypeForm(false);
            setEditingType(null);
          }}
          isPending={isTypeFormPending}
        />
      )}

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
