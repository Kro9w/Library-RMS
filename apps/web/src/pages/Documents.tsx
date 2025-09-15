import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../trpc";

// Define a clear type for the document object
// This should match the data returned by your tRPC `getDocuments` procedure
type Document = {
  id: string;
  title: string;
  type: string;
  createdAt: string | Date;
  // Add any other fields your getDocuments query returns, like tags
  tags: string[];
};

// Ensure this function uses a named export to match the import in App.tsx
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
        <Link to="/upload" className="btn btn-primary">
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
            <option>memorandum</option>
            <option>office_order</option>
            <option>communication_letter</option>
          </select>
        </div>
      </div>

      {selectedDocs.length > 0 && (
        <div className="mb-3">
          <button
            className="btn btn-danger"
            onClick={handleBatchDelete}
            disabled={deleteDoc.isPending}
          >
            {deleteDoc.isPending
              ? "Deleting..."
              : `Delete Selected (${selectedDocs.length})`}
          </button>
        </div>
      )}

      <table className="table table-hover align-middle">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                className="form-check-input"
                onChange={handleSelectAll}
              />
            </th>
            <th>Title</th>
            <th>Type</th>
            <th>Date Uploaded</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredDocuments.length > 0 ? (
            filteredDocuments.map((doc: Document) => (
              <tr key={doc.id}>
                <td>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={selectedDocs.includes(doc.id)}
                    onChange={() => handleSelectOne(doc.id)}
                  />
                </td>
                <td>
                  <Link to={`/documents/${doc.id}`}>{doc.title}</Link>
                </td>
                <td>
                  <span className="badge bg-secondary">{doc.type}</span>
                </td>
                <td>{new Date(doc.createdAt).toLocaleDateString()}</td>
                <td>
                  <Link
                    to={`/documents/${doc.id}`}
                    className="btn btn-sm btn-outline-primary"
                  >
                    <i className="bi bi-eye"></i>
                  </Link>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="text-center text-muted">
                No documents found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
