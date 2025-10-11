import React from "react";
import { Link } from "react-router-dom";
import { trpc } from "../trpc";
import "./Dashboard.css";
// Import the necessary components from the charting library
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts";
import { useForm } from "react-hook-form";

type RecentFile = {
  id: string;
  title: string;
  uploadedBy?: string;
};

// Define colors for the pie chart slices, using your brand palette
const PIE_CHART_COLORS = ["#BA3B46", "#ED9B40", "#AAB8C2", "#E1E8ED"];

export function Dashboard() {
  const { data, isLoading, isError, error } = trpc.getDashboardStats.useQuery();
  const transferDocumentMutation = trpc.transferDocument.useMutation({
    onSuccess: () => {
      alert("Document transferred successfully!");
    },
    onError: (error) => {
      alert(`Error transferring document: ${error.message}`);
    },
  });
  const { register, handleSubmit, reset } = useForm<{
    controlNumber: string;
  }>();

  const onSubmit = (formData: { controlNumber: string }) => {
    // In a real application, you'd likely have a user selection dropdown
    // to select the new owner.
    transferDocumentMutation.mutate({
      ...formData,
      newOwnerId: "user_2aF9Q8R7j6K5P4T3s2E1aBcDeFg", // Example User ID
      newOwnerName: "John Doe", // Example User Name
    });
    reset();
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
        Error loading dashboard data: {error.message}
      </div>
    );
  }

  // Use default values for all stats to prevent errors
  const stats = data || {
    totalDocuments: 0,
    recentUploadsCount: 0,
    totalUsers: 0,
    docsByType: [],
    topTags: [],
  };

  const recentFiles = data?.recentFiles || [];

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Dashboard</h1>
        <div className="d-flex gap-2 align-items-center">
          <form onSubmit={handleSubmit(onSubmit)} className="d-flex gap-2">
            <input
              {...register("controlNumber")}
              type="text"
              className="form-control"
              placeholder="Scan or Enter Control Number"
            />
            <button type="submit" className="btn btn-outline-primary">
              <i className="bi bi-arrow-right-circle"></i> Transfer
            </button>
          </form>
          <Link to="/upload" className="btn btn-brand-primary">
            <i className="bi bi-upload me-2"></i>Upload Document
          </Link>
          <Link to="/documents" className="btn btn-secondary">
            <i className="bi bi-search me-2"></i>Search Documents
          </Link>
        </div>
      </div>

      {/* Top row of main stat cards */}
      <div className="row">
        <div className="col-md-4">
          <div className="card stat-card stat-card-primary mb-3">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-file-earmark-text me-2"></i>Total Documents
              </h5>
              <p className="card-text fs-2">{stats.totalDocuments}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card stat-card stat-card-primary mb-3">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-clock-history me-2"></i>Recent Uploads (24h)
              </h5>
              <p className="card-text fs-2">{stats.recentUploadsCount}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card stat-card stat-card-primary mb-3">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-people me-2"></i>Total Users
              </h5>
              <p className="card-text fs-2">{stats.totalUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lower section with recent uploads and new stats */}
      <div className="row mt-3">
        {/* Left Column: Recent Uploads */}
        <div className="col-lg-8">
          <h5>
            <i className="bi bi-list-check me-2"></i>Recent Uploads
          </h5>
          <div className="recent-uploads-list">
            {recentFiles.length > 0 ? (
              recentFiles.map((file: RecentFile) => (
                <div key={file.id} className="recent-uploads-item">
                  <Link to={`/documents/${file.id}`}>{file.title}</Link>
                  <span className="text-muted">
                    {file.uploadedBy ? ` by ${file.uploadedBy}` : ""}
                  </span>
                </div>
              ))
            ) : (
              <div className="recent-uploads-item text-muted">
                No recent uploads.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Two new functional cards */}
        <div className="col-lg-4">
          <h5>
            <i className="bi bi-graph-up-arrow me-2"></i>Analytics
          </h5>
          {/* Documents by Type Card */}
          <div className="card mini-stat-card mb-3">
            <div className="card-body d-flex flex-column align-items-center">
              <h5 className="card-title">Documents by Type</h5>
              {stats.docsByType.length > 0 ? (
                <PieChart width={300} height={200}>
                  <Pie
                    data={stats.docsByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                  >
                    {stats.docsByType.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value, entry: any) => entry.payload.name}
                  />
                </PieChart>
              ) : (
                <p className="card-text text-muted">
                  No documents found to generate stats.
                </p>
              )}
            </div>
          </div>
          {/* Most Used Tags Card */}
          <div className="card mini-stat-card">
            <div className="card-body">
              <h5 className="card-title">Most Used Tags</h5>
              {stats.topTags.length > 0 ? (
                <ol className="list-group list-group-numbered">
                  {stats.topTags.map((tag) => (
                    <li
                      // This now correctly uses 'tag.name'
                      key={tag.name}
                      className="list-group-item d-flex justify-content-between align-items-start"
                    >
                      {/* This now correctly uses 'tag.name' */}
                      <div className="ms-2 me-auto">{tag.name}</div>
                      <span className="badge bg-primary rounded-pill">
                        {tag.count}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="card-text text-muted">
                  No tags have been used yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
