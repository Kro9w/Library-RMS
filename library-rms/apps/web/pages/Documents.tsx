// /pages/Documents.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";

export function Documents() {
  // Mock data - replace with tRPC query
  const mockDocuments = [
    {
      id: "doc1",
      title: "Q3 Financial Report.pdf",
      type: "memorandum",
      date: "2025-09-12",
    },
    {
      id: "doc2",
      title: "Project Phoenix Plan.docx",
      type: "office_order",
      date: "2025-09-11",
    },
    {
      id: "doc3",
      title: "HR Policy Update.pdf",
      type: "communication_letter",
      date: "2025-09-10",
    },
  ];

  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedDocs(mockDocuments.map((d) => d.id));
    } else {
      setSelectedDocs([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((docId) => docId !== id) : [...prev, id]
    );
  };

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
        <div className="col-md-6">
          <input
            type="text"
            className="form-control"
            placeholder="Search documents..."
          />
        </div>
        <div className="col-md-3">
          <select className="form-select">
            <option>Filter by Type...</option>
            <option>memorandum</option>
            <option>office_order</option>
          </select>
        </div>
        <div className="col-md-3">
          <button className="btn btn-outline-secondary w-100">
            Apply Filters
          </button>
        </div>
      </div>

      {/* Batch Actions */}
      {selectedDocs.length > 0 && (
        <div className="mb-3">
          <button className="btn btn-danger">
            <i className="bi bi-trash me-2"></i>Delete Selected (
            {selectedDocs.length})
          </button>
        </div>
      )}

      {/* Document Table */}
      <table className="table table-hover">
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
          {mockDocuments.map((doc) => (
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
              <td>{doc.date}</td>
              <td>
                <Link
                  to={`/documents/${doc.id}`}
                  className="btn btn-sm btn-outline-primary"
                >
                  <i className="bi bi-eye"></i>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
