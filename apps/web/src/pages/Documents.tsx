import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../trpc";
import { useUser } from "@clerk/clerk-react";
import "./Documents.css";

type AppUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | undefined;
};

type Document = {
  id: string;
  title: string;
  type: string;
  createdAt: string | Date;
  tags: string[];
  inTransit: boolean;
  heldById: string;
  controlNumber: string;
  intendedHolderId: string | null; // 1. Added this field to the type
};

export function Documents() {
  const { user } = useUser();

  const { data: documents, isLoading: isLoadingDocuments } =
    trpc.getDocuments.useQuery();
  const { data: appUsers, isLoading: isLoadingUsers } =
    trpc.getUsers.useQuery();
  const trpcCtx = trpc.useContext();

  const deleteDoc = trpc.deleteDocument.useMutation({
    onSuccess: () => trpcCtx.getDocuments.invalidate(),
  });

  const sendDoc = trpc.sendDocument.useMutation({
    onSuccess: () => trpcCtx.getDocuments.invalidate(),
  });

  const receiveDoc = trpc.receiveDocument.useMutation({
    onSuccess: (data) => {
      // Check if the backend sent file content
      if (data.success && data.fileContent) {
        // 1. Decode the base64 string into binary data
        const byteCharacters = atob(data.fileContent);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        // 2. Create a "blob" (a file-like object)
        const blob = new Blob([byteArray], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        // 3. Create a temporary link element to trigger the download
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = data.fileName || "document.docx";
        document.body.appendChild(link);
        link.click(); // Programmatically click the link to start the download
        document.body.removeChild(link); // Clean up the temporary link
      }

      // 4. Refresh the document list to show the status change
      trpcCtx.getDocuments.invalidate();
    },
    onError: (error) => {
      // Optional: Add better error handling
      alert(`Error receiving document: ${error.message}`);
    },
  });

  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSendModalOpen, setSendModalOpen] = useState(false);
  const [docToSend, setDocToSend] = useState<Document | null>(null);
  const [recipientId, setRecipientId] = useState("");

  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    return documents.filter((doc: Document) =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [documents, searchTerm]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedDocs(filteredDocuments.map((d: Document) => d.id));
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

  const openSendModal = (doc: Document) => {
    setDocToSend(doc);
    setSendModalOpen(true);
    setRecipientId("");
  };

  const handleSendDocument = async () => {
    if (docToSend && recipientId) {
      await sendDoc.mutateAsync({
        controlNumber: docToSend.controlNumber,
        intendedHolderId: recipientId,
      });
      setSendModalOpen(false);
      setDocToSend(null);
      setRecipientId("");
    } else {
      alert("Please select a recipient.");
    }
  };

  const handleReceiveDocument = async (controlNumber: string) => {
    if (!user) {
      alert("You must be logged in to receive a document.");
      return;
    }
    if (window.confirm("Are you sure you want to receive this document?")) {
      await receiveDoc.mutateAsync({
        controlNumber,
        receiverId: user.id,
      });
    }
  };

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
        <div className="col-md-9">
          <input
            type="text"
            className="form-control"
            placeholder="Search documents by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <select className="form-select">
            <option>Filter by Type...</option>
            <option value="memorandum">Memorandum</option>
            <option value="office_order">Office Order</option>
            <option value="communication_letter">Communication Letter</option>
          </select>
        </div>
      </div>

      {selectedDocs.length > 0 && (
        <div className="mb-3 d-flex gap-2">
          <button
            className="btn btn-brand-delete"
            onClick={handleBatchDelete}
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
          <div>Type</div>
          <div>Date Uploaded</div>
          <div>Status</div>
          <div className="text-end">Actions</div>
        </div>

        {filteredDocuments.length > 0 ? (
          filteredDocuments.map((doc: Document) => (
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
              <div>
                <span className="doc-type-badge">
                  {doc.type.replace("_", " ")}
                </span>
              </div>
              <div>{new Date(doc.createdAt).toLocaleDateString()}</div>
              <div>
                {doc.inTransit ? (
                  <span className="badge bg-warning text-dark">In Transit</span>
                ) : (
                  <span className="badge bg-success">Available</span>
                )}
              </div>
              <div className="text-end d-flex gap-2 justify-content-end">
                <Link
                  to={`/documents/${doc.id}`}
                  className="btn btn-sm btn-outline-secondary"
                >
                  <i className="bi bi-eye"></i>
                </Link>
                {user && !doc.inTransit && doc.heldById === user.id && (
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => openSendModal(doc)}
                  >
                    <i className="bi bi-send"></i>
                  </button>
                )}
                {/* 2. ADDED CHECK: This button now only shows if the current user is the intended recipient */}
                {user && doc.inTransit && doc.intendedHolderId === user.id && (
                  <button
                    className="btn btn-sm btn-brand-primary"
                    onClick={() => handleReceiveDocument(doc.controlNumber)}
                  >
                    Receive
                  </button>
                )}
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
                    {appUsers
                      ?.filter((u: AppUser) => u.id !== user?.id)
                      .map((u: AppUser) => (
                        <option key={u.id} value={u.id}>
                          {`${u.firstName} ${u.lastName}`.trim()}
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
