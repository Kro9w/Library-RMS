import React, { useState } from "react";
import { trpc } from "../trpc";
import { TagModal } from "../components/TagModal";
import { ConfirmModal } from "../components/ConfirmModal";
import "./Tags.css"; // Import the stylesheet

// Define a type for the Tag object for clarity
type Tag = {
  id: string;
  name: string;
};

export function Tags() {
  const { data: tags, isLoading, isError, error } = trpc.getTags.useQuery();
  const trpcCtx = trpc.useContext();

  // State for controlling the modals
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);

  // tRPC mutations
  const createTag = trpc.createTag.useMutation({
    onSuccess: () => trpcCtx.getTags.invalidate(),
    onSettled: () => setIsTagModalOpen(false),
  });
  const updateTag = trpc.updateTag.useMutation({
    onSuccess: () => trpcCtx.getTags.invalidate(),
    onSettled: () => setIsTagModalOpen(false),
  });
  const deleteTag = trpc.deleteTag.useMutation({
    onSuccess: () => trpcCtx.getTags.invalidate(),
    onSettled: () => setIsDeleteModalOpen(false),
  });

  // Handlers for modal actions
  const handleOpenCreateModal = () => {
    setSelectedTag(null);
    setIsTagModalOpen(true);
  };

  const handleOpenEditModal = (tag: Tag) => {
    setSelectedTag(tag);
    setIsTagModalOpen(true);
  };

  const handleOpenDeleteModal = (tag: Tag) => {
    setSelectedTag(tag);
    setIsDeleteModalOpen(true);
  };

  const handleSaveTag = (tagName: string) => {
    if (selectedTag) {
      updateTag.mutate({ id: selectedTag.id, name: tagName });
    } else {
      createTag.mutate({ name: tagName });
    }
  };

  const handleConfirmDelete = () => {
    if (selectedTag) {
      deleteTag.mutate(selectedTag.id);
    }
  };

  if (isLoading)
    return <div className="container mt-4 text-center">Loading...</div>;
  if (isError)
    return (
      <div className="container mt-4 alert alert-danger">
        Error: {error.message}
      </div>
    );

  return (
    <>
      <div className="container mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>Manage Tags</h1>
          <button
            className="btn btn-brand-primary"
            onClick={handleOpenCreateModal}
          >
            <i className="bi bi-plus-circle me-2"></i>Create New Tag
          </button>
        </div>

        {/* The table has been replaced with a div-based list structure */}
        <div className="tag-list-container">
          {/* Header Row */}
          <div className="tag-list-header">
            <div className="tag-name-header">Tag Name</div>
            <div className="tag-actions-header">Actions</div>
          </div>

          {/* List of Tags */}
          {tags?.map((tag) => (
            <div key={tag.id} className="tag-list-item">
              <div className="tag-name-content">
                <span className="badge tag-badge">{tag.name}</span>
              </div>
              <div className="tag-actions-content">
                <button
                  className="btn btn-sm btn-brand-edit me-2"
                  onClick={() => handleOpenEditModal(tag)}
                >
                  <i className="bi bi-pencil"></i>
                </button>
                <button
                  className="btn btn-sm btn-brand-delete"
                  onClick={() => handleOpenDeleteModal(tag)}
                >
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TagModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        onSave={handleSaveTag}
        isSaving={createTag.isPending || updateTag.isPending}
        existingTag={selectedTag}
      />
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Confirm Deletion"
        message={`Are you sure you want to delete the tag "${selectedTag?.name}"? This cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        isConfirming={deleteTag.isPending}
      />
    </>
  );
}
