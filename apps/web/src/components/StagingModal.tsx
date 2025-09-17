import React, { useState, useEffect } from "react";
import Select from "react-select";
import "./ConfirmModal.css"; // Reuse the modal styling

// Define the shape of the Tag and File objects
type Tag = { id: string; name: string };
type DocumentType = "memorandum" | "office_order" | "communication_letter";

interface UploadFinalizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, docType: DocumentType, tags: string[]) => void;
  isUploading: boolean;
  file: File | null;
  availableTags: Tag[];
}

export function UploadFinalizeModal({
  isOpen,
  onClose,
  onUpload,
  isUploading,
  file,
  availableTags = [],
}: UploadFinalizeModalProps) {
  const [docType, setDocType] = useState<DocumentType>("memorandum");
  const [selectedTags, setSelectedTags] = useState<
    { value: string; label: string }[]
  >([]);

  // Reset state when the modal is opened for a new file
  useEffect(() => {
    if (isOpen) {
      setDocType("memorandum");
      setSelectedTags([]);
    }
  }, [isOpen]);

  if (!isOpen || !file) {
    return null;
  }

  const tagOptions = availableTags.map((tag) => ({
    value: tag.name,
    label: tag.name,
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tagNames = selectedTags.map((tag) => tag.value);
    onUpload(file, docType, tagNames);
  };

  return (
    <div className="modal-overlay">
      <form className="modal-content" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h4 className="modal-title">Finalize Details</h4>
        </div>
        <div className="modal-body">
          <p>
            <strong>File:</strong> {file.name}
          </p>
          <div className="mb-3">
            <label htmlFor="type" className="form-label">
              Document Type
            </label>
            <select
              id="type"
              className="form-select"
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentType)}
            >
              {/* Ensure the 'value' attribute is the correct, lowercase string */}
              <option value="memorandum">Memorandum</option>
              <option value="office_order">Office Order</option>
              <option value="communication_letter">Communication Letter</option>
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor="tags" className="form-label">
              Tags
            </label>
            <Select
              id="tags"
              isMulti
              options={tagOptions}
              value={selectedTags}
              onChange={(selected) => setSelectedTags(selected as any)}
              placeholder="Select tags..."
            />
          </div>
        </div>
        <div className="modal-footer">
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
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Confirm & Upload"}
          </button>
        </div>
      </form>
    </div>
  );
}
