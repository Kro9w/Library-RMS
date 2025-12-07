import React, { useState, useEffect, useRef } from "react";
import { trpc } from "../trpc";
import { Modal } from "bootstrap";
import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";

type Tag = AppRouterOutputs["documents"]["getTags"][0];

interface TagsManagementModalProps {
  show: boolean;
  onClose: () => void;
}

export function TagsManagementModal({
  show,
  onClose,
}: TagsManagementModalProps) {
  const { data: tags, isLoading, refetch } = trpc.documents.getTags.useQuery();
  const trpcCtx = trpc.useUtils();

  // Mutations
  const createTag = trpc.documents.createTag.useMutation({
    onSuccess: () => {
      refetch();
      trpcCtx.documents.getTags.invalidate();
    },
  });
  const updateTag = trpc.documents.updateTag.useMutation({
    onSuccess: () => {
      refetch();
      trpcCtx.documents.getTags.invalidate();
    },
  });
  const deleteTag = trpc.documents.deleteTag.useMutation({
    onSuccess: () => {
      refetch();
      trpcCtx.documents.getTags.invalidate();
    },
  });

  // State
  const [tagName, setTagName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const modalInstanceRef = useRef<Modal | null>(null);

  useEffect(() => {
    if (modalRef.current) {
      modalInstanceRef.current = new Modal(modalRef.current);
      modalRef.current.addEventListener("hidden.bs.modal", () => {
        onClose();
      });
    }

    return () => {
      // Ensure backdrop is removed if component unmounts while open
      modalInstanceRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (show) {
      modalInstanceRef.current?.show();
      // Reset state when opening
      setTagName("");
      setEditingId(null);
      setError(null);
    } else {
      modalInstanceRef.current?.hide();
    }
  }, [show]);

  const handleSave = () => {
    if (!tagName.trim()) {
      setError("Please enter a tag name.");
      return;
    }
    setError(null);

    if (editingId) {
      updateTag.mutate(
        { id: editingId, name: tagName },
        {
          onSuccess: () => {
            setTagName("");
            setEditingId(null);
          },
        }
      );
    } else {
      createTag.mutate(
        { name: tagName },
        {
          onSuccess: () => {
            setTagName("");
          },
        }
      );
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setTagName(tag.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTagName("");
    setError(null);
  };

  const handleDelete = (id: string) => {
    // Basic confirmation
    if (window.confirm("Are you sure you want to delete this tag?")) {
      deleteTag.mutate(id);
    }
  };

  return (
    <div
      className="modal fade"
      ref={modalRef}
      id="tagsManagementModal"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Manage Tags</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <div className="row">
              {/* Left Column: Create / Edit Form */}
              <div className="col-md-4">
                <h6>{editingId ? "Edit Tag" : "Create New Tag"}</h6>
                <div className="mb-3">
                  <label htmlFor="tagName" className="form-label">
                    Tag Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="tagName"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    placeholder="e.g. For Review"
                  />
                  {error && <div className="text-danger mt-1">{error}</div>}
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={createTag.isPending || updateTag.isPending}
                >
                  {createTag.isPending || updateTag.isPending
                    ? "Saving..."
                    : editingId
                    ? "Save Changes"
                    : "Create Tag"}
                </button>

                {editingId && (
                  <button
                    className="btn btn-secondary ms-2"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </button>
                )}
              </div>

              {/* Right Column: List of Tags */}
              <div className="col-md-8">
                <h6>Existing Tags</h6>
                {isLoading ? (
                  <div>Loading...</div>
                ) : (
                  <ul
                    className="list-group"
                    style={{ maxHeight: "400px", overflowY: "auto" }}
                  >
                    {tags?.map(
                      (tag: {
                        id: React.Key | null | undefined;
                        name:
                          | string
                          | number
                          | bigint
                          | boolean
                          | React.ReactElement<
                              unknown,
                              string | React.JSXElementConstructor<any>
                            >
                          | Iterable<React.ReactNode>
                          | React.ReactPortal
                          | Promise<
                              | string
                              | number
                              | bigint
                              | boolean
                              | React.ReactPortal
                              | React.ReactElement<
                                  unknown,
                                  string | React.JSXElementConstructor<any>
                                >
                              | Iterable<React.ReactNode>
                              | null
                              | undefined
                            >
                          | null
                          | undefined;
                        _count: {
                          documents:
                            | string
                            | number
                            | bigint
                            | boolean
                            | React.ReactElement<
                                unknown,
                                string | React.JSXElementConstructor<any>
                              >
                            | Iterable<React.ReactNode>
                            | React.ReactPortal
                            | Promise<
                                | string
                                | number
                                | bigint
                                | boolean
                                | React.ReactPortal
                                | React.ReactElement<
                                    unknown,
                                    string | React.JSXElementConstructor<any>
                                  >
                                | Iterable<React.ReactNode>
                                | null
                                | undefined
                              >
                            | null
                            | undefined;
                        };
                      }) => (
                        <li
                          key={tag.id}
                          className="list-group-item d-flex justify-content-between align-items-center"
                        >
                          <div>
                            <span className="fw-bold">{tag.name}</span>
                            <small className="text-muted ms-2">
                              ({tag._count.documents} docs)
                            </small>
                          </div>
                          <div>
                            <button
                              className="btn btn-sm btn-outline-primary me-2"
                              onClick={() => handleEdit(tag)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(tag.id as string)}
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      )
                    )}
                    {!tags?.length && (
                      <li className="list-group-item text-muted">
                        No tags found.
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
