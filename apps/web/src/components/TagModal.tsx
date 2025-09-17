import React, { useState, useEffect } from "react";
// We can reuse the same modal styling from the confirmation modal
import "./ConfirmModal.css";

interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tagName: string) => void;
  isSaving: boolean;
  existingTag?: { id: string; name: string } | null;
}

export function TagModal({
  isOpen,
  onClose,
  onSave,
  isSaving,
  existingTag,
}: TagModalProps) {
  const [tagName, setTagName] = useState("");

  useEffect(() => {
    if (existingTag) {
      setTagName(existingTag.name);
    } else {
      setTagName("");
    }
  }, [existingTag, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tagName.trim()) {
      onSave(tagName.trim());
    }
  };

  return (
    <div className="modal-overlay">
      <form className="modal-content" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h4 className="modal-title">
            {existingTag ? "Edit Tag" : "Create New Tag"}
          </h4>
        </div>
        <div className="modal-body">
          <input
            type="text"
            className="form-control"
            placeholder="Tag name"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSaving || !tagName.trim()}
          >
            {isSaving ? "Saving..." : "Save Tag"}
          </button>
        </div>
      </form>
    </div>
  );
}
