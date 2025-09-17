import React from "react";
import { Link } from "react-router-dom";
import { trpc } from "../trpc";

// 1. Define an explicit type for the recent file object.
//    Making 'uploadedBy' optional resolves the type error.
type RecentFile = {
  id: string;
  title: string;
  uploadedBy?: string;
};

export function Dashboard() {
  // Fetch the dashboard stats from the backend
  const { data, isLoading, isError, error } = trpc.getDashboardStats.useQuery();

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
        Error loading dashboard data: {error.message}
      </div>
    );
  }

  // Use default values to prevent errors if data is temporarily unavailable
  const stats = data || {
    totalDocuments: 0,
    recentUploadsCount: 0,
    totalUsers: 0,
  };

  const recentFiles = data?.recentFiles || [];

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
              <p className="card-text fs-2">{stats.totalDocuments}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-bg-info mb-3">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-clock-history me-2"></i>Recent Uploads (24h)
              </h5>
              <p className="card-text fs-2">{stats.recentUploadsCount}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-bg-success mb-3">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-people me-2"></i>Total Users
              </h5>
              <p className="card-text fs-2">{stats.totalUsers}</p>
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
          {recentFiles.length > 0 ? (
            // 2. This mapping will now work without type errors
            recentFiles.map((file: RecentFile) => (
              <li key={file.id} className="list-group-item">
                <Link to={`/documents/${file.id}`}>{file.title}</Link>
                {file.uploadedBy ? ` uploaded by ${file.uploadedBy}` : ""}
              </li>
            ))
          ) : (
            <li className="list-group-item text-muted">No recent uploads.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
