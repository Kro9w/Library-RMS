import React from "react";
import { useDropzone } from "react-dropzone";
import { useUser } from "../contexts/SessionContext.tsx";
import { useUploadDocument } from "../hooks/useUploadDocument";
import { FileDropzone, TransitRouteBuilder } from "./UploadModalSubcomponents";
import "./StandardModal.css";
import "./UploadModal.css";

interface UploadModalProps {
  show: boolean;
  onClose: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ show, onClose }) => {
  const user = useUser();
  const { state, data, auth, actions } = useUploadDocument(onClose);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles[0]) {
        state.setFile(acceptedFiles[0]);
        state.setError(null);
        actions.scanForControlNumber(acceptedFiles[0]);
      }
    },
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/tiff": [".tiff", ".tif"],
    },
    multiple: false,
  });

  if (!show) return null;

  return (
    <div
      className="standard-modal-backdrop"
      onClick={!state.uploading ? onClose : undefined}
    >
      <div
        className="standard-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="standard-modal-header">
          <div className="standard-modal-icon">
            <i className="bi bi-upload"></i>
          </div>
          <div className="standard-modal-header-text">
            <h5 className="standard-modal-title">Upload document</h5>
            <p className="standard-modal-subtitle">
              PDF, DOCX, or image formats supported
            </p>
          </div>
          {!state.uploading && (
            <button
              type="button"
              className="standard-modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              <i className="bi bi-x"></i>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="standard-modal-body upload-dialog-body">
          <FileDropzone
            getRootProps={getRootProps}
            getInputProps={getInputProps}
            isDragActive={isDragActive}
            file={state.file}
            setFile={state.setFile}
            setControlNumber={state.setControlNumber}
          />

          {/* Error */}
          {state.error && (
            <div className="upload-error">
              <i className="bi bi-exclamation-circle" />
              {state.error}
            </div>
          )}

          {/* Fields */}
          <div className="upload-fields">
            {/* Records Series & Document Type */}
            <div style={{ display: "flex", gap: "12px" }}>
              <div className="upload-field" style={{ flex: 1 }}>
                <label className="form-label">Records series</label>
                <select
                  className="form-control form-select"
                  value={state.selectedRecordsSeries ?? ""}
                  onChange={(e) => {
                    state.setSelectedRecordsSeries(e.target.value || undefined);
                    state.setSelectedDocumentType(undefined);
                  }}
                >
                  <option value="">Select a records series</option>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {data.recordsSeriesList.map((series: any) => (
                    <option key={series.id} value={series.id}>
                      {series.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="upload-field" style={{ flex: 1 }}>
                <label className="form-label">Document type</label>
                <select
                  className="form-control form-select"
                  value={state.selectedDocumentType ?? ""}
                  onChange={(e) =>
                    state.setSelectedDocumentType(e.target.value || undefined)
                  }
                  disabled={!state.selectedRecordsSeries}
                >
                  <option value="">Select a document type</option>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {data.filteredDocumentTypes.map((type: any) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category */}
            <div className="upload-field">
              <label className="form-label">Category</label>
              <select
                className="form-control form-select"
                value={state.category}
                onChange={(e) => {
                  state.setCategory(e.target.value as any);
                  if (e.target.value !== "FOR_APPROVAL") {
                    state.setTransitRoute([]);
                  } else {
                    if (state.transitRoute.length === 0)
                      state.setTransitRoute([""]);
                  }
                }}
              >
                {auth.canManageInstitution && (
                  <option value="INSTITUTIONAL">
                    Institutional — institution-wide
                  </option>
                )}
                {(auth.highestRoleLevel <= 0 || auth.canManageInstitution) && (
                  <option value="INTERNAL">Internal — campus-wide</option>
                )}
                {(auth.highestRoleLevel <= 1 || auth.canManageDocs) && (
                  <option value="DEPARTMENTAL">
                    Departmental — department only
                  </option>
                )}
                <option value="RESTRICTED">
                  Restricted — sender & recipient only
                </option>
                <option value="EXTERNAL">External — outside documents</option>
                <option value="FOR_APPROVAL">
                  For Approval — requires approval routing
                </option>
              </select>
            </div>

            {/* Transit Route Builder */}
            {state.category === "FOR_APPROVAL" && (
              <TransitRouteBuilder
                transitRoute={state.transitRoute}
                setTransitRoute={state.setTransitRoute}
                departmentsResponse={data.departmentsResponse}
              />
            )}

            {/* Control number */}
            {state.file && (
              <div className="upload-field">
                <label className="form-label">
                  Control number
                  <span className="upload-field-hint">
                    {state.isScanning
                      ? "Scanning document..."
                      : "Auto-extracted or enter manually"}
                  </span>
                </label>
                <input
                  type="text"
                  className={`form-control ${state.isScanning ? "scanning-input" : ""}`}
                  value={
                    state.isScanning
                      ? "Scanning..."
                      : (state.controlNumber ?? "")
                  }
                  onChange={(e) =>
                    actions.handleManualControlNumberChange(e.target.value)
                  }
                  disabled={state.isScanning}
                  placeholder="e.g. CSU-12345-A-FL"
                  style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}
                />
                {state.duplicateWarning && (
                  <div
                    className="text-danger mt-1"
                    style={{ fontSize: "0.875rem" }}
                  >
                    <i className="bi bi-exclamation-triangle-fill me-1" />
                    {state.duplicateWarning}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="standard-modal-footer">
          <button
            className="standard-modal-btn standard-modal-btn-ghost"
            onClick={onClose}
            disabled={state.uploading}
          >
            Cancel
          </button>
          <button
            className="standard-modal-btn standard-modal-btn-confirm"
            onClick={() => actions.handleUpload(user?.id)}
            disabled={
              !state.file ||
              state.uploading ||
              !data.bucketName ||
              !state.selectedRecordsSeries ||
              !state.selectedDocumentType ||
              !!state.duplicateWarning
            }
          >
            {state.uploading ? (
              <>
                <span className="standard-modal-spinner" />
                Uploading…
              </>
            ) : (
              <>
                <i className="bi bi-upload" />
                Upload
              </>
            )}
          </button>
        </div>
      </div>

      {state.showControlNumberWarning && (
        <div className="standard-modal-backdrop" style={{ zIndex: 9999 }}>
          <div
            className="standard-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "400px" }}
          >
            <div className="standard-modal-header">
              <div
                className="standard-modal-icon"
                style={{
                  background: "var(--color-warning-subtle)",
                  color: "var(--color-warning)",
                }}
              >
                <i className="bi bi-exclamation-triangle"></i>
              </div>
              <div className="standard-modal-header-text">
                <h5 className="standard-modal-title">Missing Control Number</h5>
              </div>
              <button
                type="button"
                className="standard-modal-close"
                onClick={() => state.setShowControlNumberWarning(false)}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
            <div className="standard-modal-body">
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--color-text-secondary)",
                  margin: 0,
                }}
              >
                You’re about to upload a document without its control number.
                This number is essential for tracking and searching. Continue
                anyway?
              </p>
            </div>
            <div className="standard-modal-footer">
              <button
                className="standard-modal-btn standard-modal-btn-ghost"
                onClick={() => state.setShowControlNumberWarning(false)}
              >
                Cancel
              </button>
              <button
                className="standard-modal-btn standard-modal-btn-confirm"
                onClick={() => actions.forceUpload(user?.id)}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
