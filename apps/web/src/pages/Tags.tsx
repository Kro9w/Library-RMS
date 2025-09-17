import React, { useState } from "react";
import { trpc } from "../trpc";
import { TagModal } from "../components/TagModal";
import { ConfirmModal } from "../components/ConfirmModal";

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

  // State to keep track of the tag being edited or deleted
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
    setSelectedTag(null); // Ensure we're in "create" mode
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
      // If there's a selected tag, we're updating it
      updateTag.mutate({ id: selectedTag.id, name: tagName });
    } else {
      // Otherwise, we're creating a new one
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
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <i className="bi bi-plus-circle me-2"></i>Create New Tag
          </button>
        </div>
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>Tag Name</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tags?.map((tag) => (
              <tr key={tag.id}>
                <td>
                  <span className="badge bg-primary fs-6">{tag.name}</span>
                </td>
                <td className="text-end">
                  <button
                    className="btn btn-sm btn-warning me-2"
                    onClick={() => handleOpenEditModal(tag)}
                  >
                    <i className="bi bi-pencil"></i>
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleOpenDeleteModal(tag)}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals for Create/Edit and Delete */}
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
