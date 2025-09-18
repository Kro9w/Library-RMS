import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../trpc";
import "./Documents.css"; // Import the stylesheet from your Canvas

type Document = {
  id: string;
  title: string;
  type: string;
  createdAt: string | Date;
  tags: string[];
};

export function Documents() {
  const {
    data: documents,
    isLoading,
    isError,
    error,
  } = trpc.getDocuments.useQuery();
  const trpcCtx = trpc.useContext();

  const deleteDoc = trpc.deleteDocument.useMutation({
    onSuccess: () => {
      trpcCtx.getDocuments.invalidate();
    },
  });

  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

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

  if (isLoading) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mt-4 alert alert-danger">
        Error loading documents: {error.message}
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
        <div className="mb-3">
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

      {/* The <table> has been replaced with the new div-based structure */}
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
              <div className="text-end">
                <Link
                  to={`/documents/${doc.id}`}
                  className="btn btn-sm btn-outline-secondary"
                >
                  <i className="bi bi-eye"></i>
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="document-item text-center text-muted">
            No documents found.
          </div>
        )}
      </div>
    </div>
  );
}
