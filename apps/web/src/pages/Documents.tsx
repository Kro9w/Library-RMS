// apps/web/src/pages/Documents.tsx
import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../trpc";
// 1. REPLACED: useUser from Clerk with useAuth from our context
import { useAuth } from "../context/AuthContext";
import "./Documents.css";
// 2. ADDED: Import tRPC types
import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";

// 3. REPLACED: Old types with new inferred types
type OrgDocument = AppRouterOutputs["documents"]["getDocuments"][0];
type AppUser = AppRouterOutputs["documents"]["getAppUsers"][0];

export function Documents() {
  // 4. REPLACED: useUser with useAuth
  const { dbUser } = useAuth();

  // 5. FIXED: Use nested tRPC procedures
  const { data: documents, isLoading: isLoadingDocuments } =
    trpc.documents.getDocuments.useQuery();
  const { data: appUsers, isLoading: isLoadingUsers } =
    trpc.documents.getAppUsers.useQuery();
  const trpcCtx = trpc.useContext();

  // 6. FIXED: Use nested tRPC procedure
  const deleteDoc = trpc.documents.deleteDocument.useMutation({
    onSuccess: () => trpcCtx.documents.getDocuments.invalidate(),
  });

  // 7. FIXED: Use nested tRPC procedure
  const sendDoc = trpc.documents.sendDocument.useMutation({
    onSuccess: () => {
      trpcCtx.documents.getDocuments.invalidate();
      alert("Document sent as a notification!");
    },
    onError: (error) => {
      alert(`Error sending document: ${error.message}`);
    },
  });

  // 8. REMOVED: receiveDoc mutation, as this logic was removed from the new schema
  // const receiveDoc = ...

  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSendModalOpen, setSendModalOpen] = useState(false);
  const [docToSend, setDocToSend] = useState<OrgDocument | null>(null);
  const [recipientId, setRecipientId] = useState("");

  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    // 9. FIXED: 'any' type error
    return documents.filter((doc: OrgDocument) =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [documents, searchTerm]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      // 10. FIXED: 'any' type error
      setSelectedDocs(filteredDocuments.map((d: OrgDocument) => d.id));
    } else {
      setSelectedDocs([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((docId) => docId !== id) : [...prev, id]
    );
  };

  const handleBatchDelete = async () => {
    if (
      window.confirm(
        `Are you sure you want to delete ${selectedDocs.length} documents?`
      )
    ) {
      for (const docId of selectedDocs) {
        await deleteDoc.mutateAsync(docId);
      }
      setSelectedDocs([]);
    }
  };

  // 11. UPDATED: Function to use new OrgDocument type
  const openSendModal = (doc: OrgDocument) => {
    setDocToSend(doc);
    setSendModalOpen(true);
    setRecipientId("");
  };

  const handleSendDocument = async () => {
    if (docToSend && recipientId) {
      await sendDoc.mutateAsync({
        documentId: docToSend.id,
        intendedUserId: recipientId,
      });
      setSendModalOpen(false);
      setDocToSend(null);
      setRecipientId("");
    } else {
      alert("Please select a recipient.");
    }
  };

  // 12. REMOVED: handleReceiveDocument logic

  if (isLoadingDocuments || isLoadingUsers) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Documents</h1>
        <Link to="/upload" className="btn btn-brand-primary">
          <i className="bi bi-upload me-2"></i>Upload New
        </Link>
      </div>

      <div className="row mb-3">
        <div className="col-md-12">
          <input
            type="text"
            className="form-control"
            placeholder="Search documents by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {/* 13. REMOVED: Filter by Type dropdown (field doesn't exist) */}
      </div>

      {selectedDocs.length > 0 && (
        <div className="mb-3 d-flex gap-2">
          <button
            className="btn btn-brand-delete"
            onClick={handleBatchDelete}
            // 14. FIXED: Use 'isPending' for mutations
            disabled={deleteDoc.isPending}
          >
            {deleteDoc.isPending
              ? "Deleting..."
              : `Delete Selected (${selectedDocs.length})`}
          </button>
        </div>
      )}

      <div className="document-list">
        <div className="document-list-header">
          <div>
            <input
              type="checkbox"
              className="form-check-input"
              onChange={handleSelectAll}
            />
          </div>
          <div>Title</div>
          {/* 15. UPDATED: Table columns to match new schema */}
          <div>Uploaded By</div>
          <div>Date Uploaded</div>
          <div className="text-end">Actions</div>
        </div>

        {filteredDocuments.length > 0 ? (
          // 16. FIXED: 'any' type error
          filteredDocuments.map((doc: OrgDocument) => (
            <div key={doc.id} className="document-item">
              <div>
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={selectedDocs.includes(doc.id)}
                  onChange={() => handleSelectOne(doc.id)}
                />
              </div>
              <div>
                <Link to={`/documents/${doc.id}`}>{doc.title}</Link>
              </div>
              {/* 17. UPDATED: Data fields */}
              <div>{doc.uploadedBy.name || "N/A"}</div>
              <div>{new Date(doc.createdAt).toLocaleDateString()}</div>
              <div className="text-end d-flex gap-2 justify-content-end">
                <Link
                  to={`/documents/${doc.id}`}
                  className="btn btn-sm btn-outline-secondary"
                >
                  <i className="bi bi-eye"></i>
                </Link>
                {/* 18. UPDATED: Send logic */}
                {dbUser && doc.uploadedById === dbUser.id && (
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => openSendModal(doc)}
                  >
                    <i className="bi bi-send"></i>
                  </button>
                )}
                {/* 19. REMOVED: Receive button */}
              </div>
            </div>
          ))
        ) : (
          <div className="document-item text-center text-muted">
            No documents found.
          </div>
        )}
      </div>

      {isSendModalOpen && (
        <div className="modal show" style={{ display: "block" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Send Document</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSendModalOpen(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Sending: <strong>{docToSend?.title}</strong>
                </p>
                <div className="mb-3">
                  <label htmlFor="recipientId" className="form-label">
                    Recipient
                  </label>
                  <select
                    id="recipientId"
                    className="form-select"
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                  >
                    <option value="" disabled>
                      Select a user...
                    </option>
                    {/* 20. UPDATED: Modal user list */}
                    {appUsers
                      ?.filter((u: AppUser) => u.id !== dbUser?.id)
                      .map((u: AppUser) => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.email}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSendModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSendDocument}
                  // 21. FIXED: Use 'isPending'
                  disabled={sendDoc.isPending || !recipientId}
                >
                  {sendDoc.isPending ? "Sending..." : "Confirm Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
