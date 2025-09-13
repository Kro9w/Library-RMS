// /pages/Upload.tsx
import React, { useState } from "react";

export function Upload() {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  return (
    <div className="container mt-4">
      <h1>Upload Documents</h1>
      <div className="row">
        <div className="col-md-6">
          {/* Drag and Drop Zone */}
          <div
            className={`p-5 border-2 border-dashed rounded text-center ${
              isDragging ? "border-primary bg-light" : "border-secondary"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <i className="bi bi-cloud-arrow-up fs-1"></i>
            <p>Drag & drop files here, or</p>
            <label htmlFor="file-upload" className="btn btn-primary">
              Browse Files
            </label>
            <input
              id="file-upload"
              type="file"
              multiple
              className="d-none"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <div className="col-md-6">
          <h4>Files to Upload</h4>
          {files.length === 0 ? (
            <p className="text-muted">No files selected.</p>
          ) : (
            <ul className="list-group mb-3">
              {files.map((file, index) => (
                <li key={index} className="list-group-item">
                  {file.name}
                </li>
              ))}
            </ul>
          )}

          {/* Metadata Form */}
          <form>
            <div className="mb-3">
              <label htmlFor="type" className="form-label">
                Document Type
              </label>
              <select id="type" className="form-select">
                <option>memorandum</option>
                <option>office_order</option>
                <option>communication_letter</option>
              </select>
            </div>
            <div className="mb-3">
              <label htmlFor="tags" className="form-label">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                id="tags"
                className="form-control"
                placeholder="e.g. finance, urgent"
              />
            </div>
            <button
              type="submit"
              className="btn btn-success w-100"
              disabled={files.length === 0}
            >
              <i className="bi bi-upload me-2"></i>Start Upload
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
