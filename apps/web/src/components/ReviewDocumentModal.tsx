import React, { useState, useRef, useEffect } from "react";
import { trpc } from "../trpc";
import { SendDocumentModal } from "./SendDocumentModal";
import { Modal } from "bootstrap";

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
      modalInstanceRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (show) {
      modalInstanceRef.current?.show();
    } else {
      modalInstanceRef.current?.hide();
    }
  }, [show]);

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

  return (
    <>
      <div
        className="modal fade"
        ref={modalRef}
        id="reviewDocumentModal"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Review Document</h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
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
