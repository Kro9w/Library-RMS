import React, { useState, useEffect } from "react";
// 1. This is the crucial step: Import the stylesheet from your Canvas
import "./TagModal.css";

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

  // When the modal opens, if we are editing an existing tag,
  // pre-fill the input with its name. Otherwise, clear it.
  useEffect(() => {
    if (existingTag) {
      setTagName(existingTag.name);
    } else {
      setTagName("");
    }
  }, [existingTag, isOpen]);

  // If the modal isn't open, render nothing.
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
    // 2. These class names now correctly match the styles in your Canvas
    <div className="tag-modal-overlay">
      <form className="tag-modal-content" onSubmit={handleSubmit}>
        <div className="tag-modal-header">
          <h4 className="tag-modal-title">
            {existingTag ? "Edit Tag" : "Create New Tag"}
          </h4>
        </div>
        <div className="tag-modal-body">
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
        <div className="tag-modal-footer">
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
