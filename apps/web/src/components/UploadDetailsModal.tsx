// apps/web/src/components/UploadDetailsModal.tsx
import React, { useState, useEffect } from "react";
import Select from "react-select"; // This will work now
import "./UploadDetailsModal.css";

// 1. UPDATED: These types now match our new schema
type Tag = { id: string; name: string };
type FileDetails = {
  // 'docType' has been removed
  tags: Tag[]; // Changed from string[] to Tag[]
};

interface UploadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: File[];
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
    new Map(),
  );
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setShowSuccess(false);

    setFileDetailsMap((prevFileDetailsMap) => {
      const newMap = new Map<File, FileDetails>();

      // Optimize lookup by creating a name -> details map
      const existingDetailsByName = new Map<string, FileDetails>();
      for (const [existingFile, details] of prevFileDetailsMap.entries()) {
        if (!existingDetailsByName.has(existingFile.name)) {
          existingDetailsByName.set(existingFile.name, details);
        }
      }

      files.forEach((file) => {
        const existingDetails = existingDetailsByName.get(file.name);
        if (existingDetails) {
          newMap.set(file, existingDetails);
        } else {
          // 2. UPDATED: Default details no longer include 'docType'
          newMap.set(file, { tags: [] });
        }
      });
      return newMap;
    });
  }, [files, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleDetailChange = (file: File, newDetails: Partial<FileDetails>) => {
    const updatedMap = new Map(fileDetailsMap);
    // 3. UPDATED: Default details
    const currentDetails = updatedMap.get(file) || {
      tags: [],
    };
    updatedMap.set(file, { ...currentDetails, ...newDetails });
    setFileDetailsMap(updatedMap);
  };

  // 4. UPDATED: 'react-select' options now use the Tag object
  const tagOptions = availableTags.map((tag) => ({
    value: tag, // The value is the whole tag object
    label: tag.name,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUploadAll(fileDetailsMap);
    setShowSuccess(true);
    setTimeout(() => {
      onClose();
    }, 2000);
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
                {/* 5. REMOVED: The entire 'docType' input row */}
                <div className="mb-2">
                  <label className="form-label">Tags</label>
                  {/* 6. UPDATED: 'react-select' now works with Tag objects */}
                  <Select
                    isMulti
                    options={tagOptions}
                    // Find the full Tag object from 'availableTags'
                    value={fileDetailsMap
                      .get(file)
                      ?.tags.map((t) => ({ value: t, label: t.name }))}
                    onChange={(selected) =>
                      handleDetailChange(file, {
                        // 'selected' is an array of { value: Tag, label: string }
                        tags: selected.map((s) => s.value),
                      })
                    }
                  />
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
