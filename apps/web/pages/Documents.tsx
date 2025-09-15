import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../../api/src/trpc/trpc";

type Document = {
  id: string;
  title: string;
  type: string;
  createdAt: string | Date;
};

export function Documents() {
  // 2. Fetch documents from the database using the tRPC query hook
  const {
    data: documents,
    isLoading,
    isError,
    error,
  } = trpc.getDocuments.useQuery();
  const trpcCtx = trpc.useContext();

  // 3. Add the tRPC mutation hook for deleting documents
  const deleteDoc = trpc.deleteDocument.useMutation({
    onSuccess: () => {
      // When a deletion is successful, refetch the document list
      trpcCtx.getDocuments.invalidate();
    },
  });

  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter documents based on the search term
  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    // Explicitly type the 'doc' parameter to fix the error
    return documents.filter((doc: Document) =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [documents, searchTerm]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      // Use the live data instead of mock data
      // Explicitly type the 'd' parameter to fix the error
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

  // 4. Implement the batch delete functionality
  const handleBatchDelete = async () => {
    if (
      window.confirm(
        `Are you sure you want to delete ${selectedDocs.length} documents?`
      )
    ) {
      for (const docId of selectedDocs) {
        await deleteDoc.mutateAsync(docId);
      }
      setSelectedDocs([]); // Clear selection after deleting
    }
  };

  // 5. Add loading and error states for a better user experience
  if (isLoading) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mt-4 alert alert-danger">
        Error: {error.message}
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

      {/* Search and Filter Bar */}
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

      {/* Batch Actions */}
      {selectedDocs.length > 0 && (
        <div className="mb-3">
          <button
            className="btn btn-danger"
            onClick={handleBatchDelete}
            disabled={deleteDoc.isPending}
          >
            {deleteDoc.isPending ? (
              "Deleting..."
            ) : (
              <>
                <i className="bi bi-trash me-2"></i>Delete Selected (
                {selectedDocs.length})
              </>
            )}
          </button>
        </div>
      )}

      {/* Document Table */}
      <table className="table table-hover align-middle">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                className="form-check-input"
                onChange={handleSelectAll}
                checked={
                  filteredDocuments.length > 0 &&
                  selectedDocs.length === filteredDocuments.length
                }
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
            // Explicitly type the 'doc' parameter here as well
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
                {/* 6. Format the date from the database */}
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
