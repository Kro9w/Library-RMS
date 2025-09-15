import { Link } from "react-router-dom"; // Assuming you use React Router

export function Dashboard() {
  const quickStats = {
    totalDocuments: 125,
    recentUploads: 8,
    activeUsers: 3,
  };

  const recentFiles = [
    { id: "doc1", title: "Q3 Financial Report.pdf", user: "Alice" },
    { id: "doc2", title: "Project Phoenix Plan.docx", user: "Bob" },
    { id: "doc3", title: "HR Policy Update.pdf", user: "Alice" },
  ];

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Dashboard</h1>
        <div className="d-flex gap-2">
          <Link to="/upload" className="btn btn-primary">
            <i className="bi bi-upload me-2"></i>Upload Document
          </Link>
          <Link to="/documents" className="btn btn-secondary">
            <i className="bi bi-search me-2"></i>Search Documents
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="row">
        <div className="col-md-4">
          <div className="card text-bg-primary mb-3">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-file-earmark-text me-2"></i>Total Documents
              </h5>
              <p className="card-text fs-2">{quickStats.totalDocuments}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-bg-info mb-3">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-clock-history me-2"></i>Recent Uploads (24h)
              </h5>
              <p className="card-text fs-2">{quickStats.recentUploads}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-bg-success mb-3">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-people me-2"></i>Active Users
              </h5>
              <p className="card-text fs-2">{quickStats.activeUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-4">
        <h3>
          <i className="bi bi-list-check me-2"></i>Recent Uploads
        </h3>
        <ul className="list-group">
          {recentFiles.map((file) => (
            <li key={file.id} className="list-group-item">
              <Link to={`/documents/${file.id}`}>{file.title}</Link> uploaded by{" "}
              {file.user}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
