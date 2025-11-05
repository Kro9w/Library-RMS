// apps/web/src/pages/Dashboard.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../trpc";

// --- Imports ---
import "./Documents.css";
import "./Dashboard.css";

import { PieChart, Pie, Cell, Legend } from "recharts";
import { useForm } from "react-hook-form";
import { useUser } from "@supabase/auth-helpers-react";

import { ConfirmModal } from "../components/ConfirmModal";
import { UploadModal } from "../components/UploadModal";
import { SendDocumentModal } from "../components/SendDocumentModal";
import { SelectDocumentModal } from "../components/SelectDocumentModal";

// --- 1. IMPORT TRPC OUTPUT TYPE (Fixes 'any' errors) ---
import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";

const PIE_CHART_COLORS = ["#BA3B46", "#ED9B40", "#AAB8C2", "#E1E8ED"];

// --- 2. DEFINE TYPES FROM TRPC (Fixes 'any' errors) ---
type RecentFile = AppRouterOutputs["getDashboardStats"]["recentFiles"][0];
type DocTypeStat = AppRouterOutputs["getDashboardStats"]["docsByType"][0];
type TopTagStat = AppRouterOutputs["getDashboardStats"]["topTags"][0];

export function Dashboard() {
  const user = useUser();
  // --- 3. STRAY UNDERSCORE REMOVED ---
  const { data, isLoading, isError, error } = trpc.getDashboardStats.useQuery();
  useForm<{
    controlNumber: string;
    email: string;
  }>();

  const [showSendModal, setShowSendModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSelectDocumentModal, setShowSelectDocumentModal] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

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
      {/* --- Page Header (Unchanged) --- */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Dashboard</h1>
        <div className="d-flex gap-2 align-items-center">
          <button
            onClick={() => setShowSelectDocumentModal(true)}
            className="btn btn-outline-primary"
          >
            <i className="bi bi-send"></i> Send
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn btn-brand-primary"
          >
            <i className="bi bi-upload me-2"></i>Upload Document
          </button>
        </div>
      </div>

      {/* --- Top row of stats (Unchanged) --- */}
      <div className="row">
        <div className="col-md-4">
          <div className="card stat-card stat-card-primary mb-3 h-100">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-file-earmark-text me-2"></i>Total Documents
              </h5>
              <p className="card-text fs-2">{stats.totalDocuments}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card stat-card stat-card-primary mb-3 h-100">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-clock-history me-2"></i>Recent Uploads (24h)
              </h5>
              <p className="card-text fs-2">{stats.recentUploadsCount}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card stat-card stat-card-primary mb-3 h-100">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-people me-2"></i>Total Users
              </h5>
              <p className="card-text fs-2">{stats.totalUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- Lower Section Wrapper (Unchanged) --- */}
      <div className="document-table-card mt-3">
        <div className="p-4">
          <div className="row">
            {/* --- Left Column (Unchanged) --- */}
            <div className="col-lg-8">
              <h5>
                <i className="bi bi-list-check me-2"></i>Recent Uploads
              </h5>
              <div>
                <div className="document-list-header recent-uploads-header">
                  <span>Title</span>
                  <span>Uploaded By</span>
                </div>
                <ul className="document-list">
                  {recentFiles.length > 0 ? (
                    // --- 5. EXPLICIT TYPE ADDED ---
                    recentFiles.map((file: RecentFile) => (
                      <li
                        key={file.id}
                        className="document-item recent-upload-item"
                      >
                        <Link to={`/documents/${file.id}`}>{file.title}</Link>
                        <span className="document-owner">
                          {file.uploadedBy
                            ? `by ${file.uploadedBy}`
                            : "Unknown"}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="document-item text-muted">
                      No recent uploads.
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* --- Right Column (Unchanged) --- */}
            <div className="col-lg-4">
              <h5>
                <i className="bi bi-graph-up-arrow me-2"></i>Analytics
              </h5>
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
                        {/* --- 6. EXPLICIT TYPES ADDED --- */}
                        {stats.docsByType.map(
                          (_entry: DocTypeStat, index: number) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                PIE_CHART_COLORS[
                                  index % PIE_CHART_COLORS.length
                                ]
                              }
                            />
                          )
                        )}
                      </Pie>
                      <Legend
                        formatter={(_value, entry: any) => entry.payload.name}
                      />
                    </PieChart>
                  ) : (
                    <p className="card-text text-muted">
                      No documents found to generate stats.
                    </p>
                  )}
                </div>
              </div>
              <div className="card mini-stat-card">
                <div className="card-body">
                  <h5 className="card-title">Most Used Tags</h5>
                  {stats.topTags.length > 0 ? (
                    <ol className="list-group list-group-numbered">
                      {/* --- 7. EXPLICIT TYPE ADDED --- */}
                      {stats.topTags.map((tag: TopTagStat) => (
                        <li
                          key={tag.name}
                          className="list-group-item d-flex justify-content-between align-items-start"
                        >
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
      </div>

      {selectedDocId && (
        <SendDocumentModal
          show={showSendModal}
          onClose={() => setShowSendModal(false)}
          documentId={selectedDocId}
        />
      )}

      <SelectDocumentModal
        show={showSelectDocumentModal}
        onClose={() => setShowSelectDocumentModal(false)}
        onSelect={(docId) => {
          setSelectedDocId(docId);
          setShowSelectDocumentModal(false);
          setShowSendModal(true);
        }}
      />

      <UploadModal
        show={showUploadModal}
        onClose={() => setShowUploadModal(false)}
      />
    </div>
  );
}
