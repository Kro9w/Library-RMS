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
            {/* Classification */}
            <div className="upload-field">
              <label className="form-label">Classification</label>
              <select
                className="form-control form-select"
                value={state.classification}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onChange={(e) => {
                  state.setClassification(e.target.value as any);
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
            {state.classification === "FOR_APPROVAL" && (
              <TransitRouteBuilder
                transitRoute={state.transitRoute}
                setTransitRoute={state.setTransitRoute}
                departmentsResponse={data.departmentsResponse}
              />
            )}

            {/* Document type */}
            <div className="upload-field">
              <label className="form-label">
                Document type{" "}
                <span className="upload-field-optional">optional</span>
              </label>
              <select
                className="form-control form-select"
                value={state.selectedDocumentType ?? ""}
                onChange={(e) =>
                  state.setSelectedDocumentType(e.target.value || undefined)
                }
              >
                <option value="">No type</option>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {data.documentTypes?.map((type: any) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

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
                  onChange={(e) => state.setControlNumber(e.target.value)}
                  disabled={state.isScanning}
                  placeholder="e.g. CSU-12345-A-FL"
                  style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}
                />
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
            disabled={!state.file || state.uploading || !data.bucketName}
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
    </div>
  );
};
