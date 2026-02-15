import { useState, useEffect, useRef } from "react";
import { Modal } from "bootstrap";
import { trpc } from "../trpc";

interface SendMultipleDocumentsModalProps {
  show: boolean;
  onClose: () => void;
  documentIds: string[];
  initialRecipientId: string | null;
  onSuccess?: () => void;
}

export function SendMultipleDocumentsModal({
  show,
  onClose,
  documentIds,
  initialRecipientId,
  onSuccess,
}: SendMultipleDocumentsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const bsModalRef = useRef<Modal | null>(null);

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [recipientId, setRecipientId] = useState<string>(
    initialRecipientId || "",
  );

  const utils = trpc.useContext();
  const sendMutation = trpc.documents.sendDocument.useMutation();
  const { data: users } = trpc.documents.getAppUsers.useQuery();
  const { data: tags } = trpc.documents.getTags.useQuery();
  const { data: globalTags } = trpc.documents.getGlobalTags.useQuery();

  const allTags = [...(tags || []), ...(globalTags || [])];

  useEffect(() => {
    if (initialRecipientId) {
      setRecipientId(initialRecipientId);
    }
  }, [initialRecipientId]);

  useEffect(() => {
    const modalElement = modalRef.current;
    if (modalElement) {
      if (!bsModalRef.current) {
        bsModalRef.current = new Modal(modalElement, {
          backdrop: "static",
          keyboard: false,
        });
        modalElement.addEventListener("hidden.bs.modal", onClose);
      }
      if (show) {
        bsModalRef.current.show();
      } else {
        bsModalRef.current.hide();
      }
    }
    return () => {
      if (modalElement) {
        modalElement.removeEventListener("hidden.bs.modal", onClose);
      }
    };
  }, [show, onClose]);

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  };

  const handleSend = async () => {
    if (!recipientId || documentIds.length === 0) return;

    try {
      // Send all documents sequentially (or in parallel)
      await Promise.all(
        documentIds.map((docId) =>
          sendMutation.mutateAsync({
            documentId: docId,
            recipientId: recipientId,
            tagIds: selectedTagIds,
          }),
        ),
      );

      utils.documents.getAll.invalidate();
      utils.user.getOrgHierarchy.invalidate(); // Refresh graph data
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to send documents:", error);
      alert("Failed to send some documents. Please try again.");
    }
  };

  return (
    <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              Send {documentIds.length} Document
              {documentIds.length !== 1 && "s"}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Recipient</label>
              <select
                className="form-select"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
              >
                <option value="">Select User</option>
                {users?.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Tags (Optional)</label>
              <div className="d-flex flex-wrap gap-2">
                {allTags.map((tag: any) => (
                  <span
                    key={tag.id}
                    className={`badge ${
                      selectedTagIds.includes(tag.id)
                        ? "bg-primary"
                        : "bg-secondary"
                    }`}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleTagToggle(tag.id)}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>

            {sendMutation.isPending && (
              <div className="text-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Sending...</span>
                </div>
                <p className="mt-2">Sending documents...</p>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={sendMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSend}
              disabled={!recipientId || sendMutation.isPending}
            >
              Send All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
