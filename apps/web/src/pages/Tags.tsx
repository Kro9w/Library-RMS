// apps/web/src/pages/Tags.tsx
import { useState } from "react";
import { trpc } from "../trpc";
import { TagModal } from "../components/TagModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { LoadingAnimation } from "../components/ui/LoadingAnimation";

// --- 1. THIS IS THE FIX ---
// Import Documents.css from the *same* 'pages' directory.
import "./Documents.css";
// Import Tags.css *second* to override the grid.
import "./Tags.css";
// -----------------------------

import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";

type Tag = AppRouterOutputs["documents"]["getTags"][0];

export function Tags() {
  const {
    data: tags,
    isLoading,
    isError,
    error,
  } = trpc.documents.getTags.useQuery();
  const trpcCtx = trpc.useUtils();

  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);

  const createTag = trpc.documents.createTag.useMutation({
    onSuccess: () => trpcCtx.documents.getTags.invalidate(),
    onSettled: () => setIsTagModalOpen(false),
  });
  const updateTag = trpc.documents.updateTag.useMutation({
    onSuccess: () => trpcCtx.documents.getTags.invalidate(),
    onSettled: () => setIsTagModalOpen(false),
  });
  const deleteTag = trpc.documents.deleteTag.useMutation({
    onSuccess: () => trpcCtx.documents.getTags.invalidate(),
    onSettled: () => setIsDeleteModalOpen(false),
  });

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

  if (isLoading) return <LoadingAnimation />;
  if (isError)
    return (
      <div className="container mt-4 alert alert-danger">
        Error: {error.message}
      </div>
    );

  return (
    <>
      <div className="container">
        <div className="page-header">
          <h2>Manage Tags</h2>
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <i className="bi bi-plus-circle me-2"></i>Create New Tag
          </button>
        </div>

        <div className="document-table-card">
          <div className="document-list-header tag-list-header">
            <span>Tag Name</span>
            <span>Documents</span>
            <span>Actions</span>
          </div>

          <ul className="document-list">
            {tags?.map((tag: Tag) => (
              <li key={tag.id} className="document-item tag-list-item">
                <span className="tag-name">{tag.name}</span>

                <span className="tag-doc-count">{tag._count.documents}</span>

                <div className="document-actions">
                  <button
                    className="btn-icon btn-edit"
                    onClick={() => handleOpenEditModal(tag)}
                    title="Edit Tag"
                  >
                    <i className="bi bi-pencil"></i>
                  </button>
                  <button
                    className="btn-icon btn-delete"
                    onClick={() => handleOpenDeleteModal(tag)}
                    title="Delete Tag"
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </li>
            ))}
          </ul>
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
        show={isDeleteModalOpen}
        title="Confirm Deletion"
        onConfirm={handleConfirmDelete}
        onClose={() => setIsDeleteModalOpen(false)}
        isConfirming={deleteTag.isPending}
      >
        Are you sure you want to delete the tag "{selectedTag?.name}"? It is
        currently used in {selectedTag?._count.documents || 0} document(s).
      </ConfirmModal>
    </>
  );
}
