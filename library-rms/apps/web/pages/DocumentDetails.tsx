// /pages/DocumentDetails.tsx
import { useParams } from "react-router-dom"; // Hook to get URL params

export function DocumentDetails() {
  const { documentId } = useParams(); // Example: /documents/doc1

  // Mock data - replace with a tRPC query using documentId
  const doc = {
    id: documentId,
    title: "Q3 Financial Report.pdf",
    type: "memorandum",
    tags: ["finance", "quarterly", "report"],
    uploadedBy: "Alice",
    date: "2025-09-12",
    isPdf: true,
  };

  return (
    <div className="container mt-4">
      <h2>{doc.title}</h2>
      <hr />
      <div className="row">
        {/* Preview Pane */}
        <div className="col-md-8">
          <div className="card" style={{ height: "80vh" }}>
            <div className="card-body d-flex justify-content-center align-items-center bg-light">
              {/* This is where your preview component goes.
                Use the conditional logic from our previous conversation.
              */}
              <p className="text-muted">Document Preview Pane</p>
              {/* <iframe src={previewUrl} ... /> OR <DocViewer documents={...} /> */}
            </div>
          </div>
        </div>

        {/* Metadata and Actions */}
        <div className="col-md-4">
          <div className="card">
            <div className="card-header">
              <i className="bi bi-info-circle me-2"></i>Document Details
            </div>
            <div className="card-body">
              <ul className="list-group list-group-flush">
                <li className="list-group-item">
                  <strong>Type:</strong> {doc.type}
                </li>
                <li className="list-group-item">
                  <strong>Uploaded by:</strong> {doc.uploadedBy}
                </li>
                <li className="list-group-item">
                  <strong>Date:</strong> {doc.date}
                </li>
                <li className="list-group-item">
                  <strong>Tags:</strong>{" "}
                  {doc.tags.map((tag) => (
                    <span key={tag} className="badge bg-primary me-1">
                      {tag}
                    </span>
                  ))}
                </li>
              </ul>
            </div>
            <div className="card-footer d-flex justify-content-around">
              <button className="btn btn-success">
                <i className="bi bi-download me-2"></i>Download
              </button>
              <button className="btn btn-warning">
                <i className="bi bi-pencil me-2"></i>Edit
              </button>
              <button className="btn btn-danger">
                <i className="bi bi-trash me-2"></i>Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
