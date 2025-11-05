import React, { useState } from "react";
import { trpc } from "../trpc";
import { SendDocumentModal } from "./SendDocumentModal";

interface ReviewDocumentModalProps {
  show: boolean;
  onClose: () => void;
  documentId: string;
}

export const ReviewDocumentModal: React.FC<ReviewDocumentModalProps> = ({
  show,
  onClose,
  documentId,
}) => {
  const [status, setStatus] = useState<"approved" | "returned" | "disapproved">(
    "approved"
  );
  const [remarks, setRemarks] = useState("");
  const [showSendModal, setShowSendModal] = useState(false);
  const reviewDocumentMutation = trpc.documents.reviewDocument.useMutation();
  const { data: document } = trpc.documents.getById.useQuery({
    id: documentId,
  });
  const { data: globalTags } = trpc.documents.getGlobalTags.useQuery();

  const sendDocumentMutation = trpc.documents.sendDocument.useMutation();

  const handleSendBack = async () => {
    if (!documentId || !document?.reviewRequesterId) return;

    await reviewDocumentMutation.mutateAsync({
      documentId,
      status,
      remarks,
    });

    const statusTag = globalTags?.find(
      (tag: { name: string }) => tag.name === status
    );

    await sendDocumentMutation.mutateAsync({
      documentId,
      recipientId: document.reviewRequesterId,
      tagIds: [],
      tagsToKeep: statusTag ? [statusTag.id] : [],
    });

    onClose();
  };

  const handleSendToSomeoneElse = async () => {
    await reviewDocumentMutation.mutateAsync({
      documentId,
      status,
      remarks,
    });
    setShowSendModal(true);
  };

  if (!show) return null;

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: "block" }}
        tabIndex={-1}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Review Document</h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
              ></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label htmlFor="status" className="form-label">
                  Status
                </label>
                <select
                  id="status"
                  className="form-select"
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value as "approved" | "returned" | "disapproved"
                    )
                  }
                >
                  <option value="approved">Approved</option>
                  <option value="returned">Returned</option>
                  <option value="disapproved">Disapproved</option>
                </select>
              </div>
              <div className="mb-3">
                <label htmlFor="remarks" className="form-label">
                  Remarks
                </label>
                <textarea
                  id="remarks"
                  className="form-control"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                ></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Close
              </button>
              {document && document.reviewRequesterId && (
                <button
                  type="button"
                  className="btn btn-info"
                  onClick={handleSendBack}
                >
                  Send to {document.reviewRequester?.name}
                </button>
              )}
              <button
                type="button"
                className="btn btn-info"
                onClick={handleSendToSomeoneElse}
              >
                Send to someone else
              </button>
            </div>
          </div>
        </div>
      </div>
      {showSendModal && (
        <SendDocumentModal
          show={showSendModal}
          onClose={() => setShowSendModal(false)}
          documentId={documentId}
        />
      )}
    </>
  );
};
