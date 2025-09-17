import React, { useState, useEffect } from "react";
import Select from "react-select";
import "./UploadDetailsModal.css";

// Define the shape of the data we'll be working with
type Tag = { id: string; name: string };
type DocumentType = "memorandum" | "office_order" | "communication_letter";
type FileDetails = {
  docType: DocumentType;
  tags: string[];
};

interface UploadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: File[];
  // Make sure the onUploadAll prop in the parent component returns a Promise
  onUploadAll: (fileDetailsMap: Map<File, FileDetails>) => Promise<void>;
  isUploading: boolean;
  availableTags: Tag[];
}

export function UploadDetailsModal({
  isOpen,
  onClose,
  files,
  onUploadAll,
  isUploading,
  availableTags = [],
}: UploadDetailsModalProps) {
  const [fileDetailsMap, setFileDetailsMap] = useState<Map<File, FileDetails>>(
    new Map()
  );
  // 1. Add state to track the success animation
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Reset success state when the modal opens
    setShowSuccess(false);
    const newMap = new Map<File, FileDetails>();
    files.forEach((file) => {
      const existingDetails = Array.from(fileDetailsMap.keys()).find(
        (f) => f.name === file.name
      );
      if (existingDetails) {
        newMap.set(file, fileDetailsMap.get(existingDetails)!);
      } else {
        newMap.set(file, { docType: "memorandum", tags: [] });
      }
    });
    setFileDetailsMap(newMap);
  }, [files, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleDetailChange = (file: File, newDetails: Partial<FileDetails>) => {
    const updatedMap = new Map(fileDetailsMap);
    const currentDetails = updatedMap.get(file) || {
      docType: "memorandum",
      tags: [],
    };
    updatedMap.set(file, { ...currentDetails, ...newDetails });
    setFileDetailsMap(updatedMap);
  };

  const tagOptions = availableTags.map((tag) => ({
    value: tag.name,
    label: tag.name,
  }));

  // 2. The submit handler now triggers the success animation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUploadAll(fileDetailsMap);
    setShowSuccess(true);
    // Automatically close the modal after the animation finishes
    setTimeout(() => {
      onClose();
    }, 2000); // 2 seconds delay
  };

  return (
    <div className="upload-modal-overlay">
      <form
        className="upload-modal-content"
        style={{ maxWidth: "800px" }}
        onSubmit={handleSubmit}
      >
        <div className="upload-modal-header">
          <h4 className="upload-modal-title">Finalize and Upload Documents</h4>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
          ></button>
        </div>
        <div
          className="upload-modal-body"
          style={{ maxHeight: "60vh", overflowY: "auto" }}
        >
          {Array.from(fileDetailsMap.keys()).map((file) => (
            <div key={file.name} className="card mb-3">
              <div className="card-body">
                <h5 className="card-title">{file.name}</h5>
                <div className="row">
                  <div className="col-md-6 mb-2">
                    <label className="form-label">Document Type</label>
                    <select
                      className="form-select"
                      value={fileDetailsMap.get(file)?.docType}
                      onChange={(e) =>
                        handleDetailChange(file, {
                          docType: e.target.value as DocumentType,
                        })
                      }
                    >
                      <option value="memorandum">Memorandum</option>
                      <option value="office_order">Office Order</option>
                      <option value="communication_letter">
                        Communication Letter
                      </option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-2">
                    <label className="form-label">Tags</label>
                    <Select
                      isMulti
                      options={tagOptions}
                      value={fileDetailsMap
                        .get(file)
                        ?.tags.map((t) => ({ value: t, label: t }))}
                      onChange={(selected) =>
                        handleDetailChange(file, {
                          tags: selected.map((s) => s.value),
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="upload-modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-success"
            disabled={isUploading || files.length === 0}
          >
            {isUploading ? "Uploading..." : `Upload All (${files.length})`}
          </button>
        </div>

        {/* 3. Conditionally render the success overlay and checkmark */}
        {showSuccess && (
          <div className="success-overlay">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 52 52"
              width="80"
              height="80"
            >
              <circle className="checkmark-circle" cx="26" cy="26" r="25" />
              <path
                className="checkmark-draw"
                fill="none"
                d="M14.1 27.2l7.1 7.2 16.7-16.8"
              />
            </svg>
          </div>
        )}
      </form>
    </div>
  );
}
