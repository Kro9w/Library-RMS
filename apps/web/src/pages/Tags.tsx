import React, { useState } from "react";
import { trpc } from "../trpc";
import { TagModal } from "../components/TagModal";
import { ConfirmModal } from "../components/ConfirmModal";
import "./Tags.css";

// Define a type for the Tag object to include the document count
type Tag = {
  id: string;
  name: string;
  documentCount?: number;
};

export function Tags() {
  const { data: tags, isLoading, isError, error } = trpc.getTags.useQuery();
  const trpcCtx = trpc.useContext();

  // State for controlling the modals
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // State to keep track of the tag being edited or deleted
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);

  // tRPC mutations for CRUD operations
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

  // Handlers to open the correct modals
  const handleOpenCreateModal = () => {
    setSelectedTag(null); // Clear selected tag to ensure we're in "create" mode
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

  // Handler passed to the TagModal to save changes
  const handleSaveTag = (tagName: string) => {
    if (selectedTag) {
      // If a tag is selected, we are updating it
      updateTag.mutate({ id: selectedTag.id, name: tagName });
    } else {
      // Otherwise, we are creating a new one
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

        <div className="tag-list">
          <div className="tag-list-header">
            <div>Tag Name</div>
            <div className="text-center">Documents</div>
            <div className="text-end">Actions</div>
          </div>

          {tags?.map((tag) => (
            <div key={tag.id} className="tag-list-item">
              <div>
                <span className="badge tag-badge">{tag.name}</span>
              </div>
              <div className="text-center">
                <span className="tag-doc-count">{tag.documentCount}</span>
              </div>
              <div className="text-end">
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
        message={`Are you sure you want to delete the tag "${selectedTag?.name}"? It is currently used in ${selectedTag?.documentCount} document(s).`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        isConfirming={deleteTag.isPending}
      />
    </>
  );
}
