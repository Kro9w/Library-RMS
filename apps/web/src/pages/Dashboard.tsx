import { useForm } from "react-hook-form";
import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { trpc } from "../trpc";
import { LoadingAnimation } from "../components/ui/LoadingAnimation";

import "./Documents.css";
import "./Dashboard.css";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

import { UploadModal } from "../components/UploadModal";
import { ForwardDocumentModal } from "../components/ForwardDocumentModal";
import { ReceiveDocumentModal } from "../components/ReceiveDocumentModal";
import { PendingDispositionsModal } from "../components/PendingDispositionsModal";
import { DocumentsToReviewList } from "../components/DocumentsToReviewList";

import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";

const PIE_CHART_COLORS = ["#BA3B46", "#ED9B40", "#AAB8C2", "#E1E8ED"];

type RecentFile = AppRouterOutputs["getDashboardStats"]["recentFiles"][0];
type DocTypeStat = AppRouterOutputs["getDashboardStats"]["docsByType"][0];
type DocStatusStat = AppRouterOutputs["getDashboardStats"]["docsByStatus"][0];

export function Dashboard() {
  const { data, isLoading, isError, error } = trpc.getDashboardStats.useQuery();
  const { data: user } = trpc.user.getMe.useQuery();

  const isLevel0Or1 = useMemo(() => {
    return user?.roles?.some((r) => r.level === 0 || r.level === 1) || false;
  }, [user]);

  const { data: pendingDispositionsData } =
    trpc.documents.getPendingDispositions.useQuery(undefined, {
      enabled: isLevel0Or1,
    });

  const pendingDispositionsCount = pendingDispositionsData?.length || 0;

  useForm<{
    controlNumber: string;
    email: string;
  }>();

  const [showSendModal, setShowSendModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showPendingDispositionsModal, setShowPendingDispositionsModal] =
    useState(false);
  const [selectedDocId, _setSelectedDocId] = useState<string | null>(null);

  const { data: pendingDistributions } =
    trpc.documents.getMyPendingDistributions.useQuery();

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("openReceiveModal") === "true") {
      setShowReceiveModal(true);
      setSearchParams(
        (params) => {
          params.delete("openReceiveModal");
          return params;
        },
        { replace: true },
      );
    }
  }, [searchParams, setSearchParams]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    let timeGreeting = "Good morning";
    if (hour >= 12 && hour < 18) {
      timeGreeting = "Good afternoon";
    } else if (hour >= 18) {
      timeGreeting = "Good evening";
    }

    const name = user?.firstName || "User";
    return `${timeGreeting}, ${name}`;
  }, [user]);

  if (isLoading) {
    return (
      <div className="container mt-4 text-center">
        <LoadingAnimation />
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
    docsByStatus: [],
  };

  const renderAnalyticsCharts = () => (
    <div className="card-body d-flex flex-column align-items-center w-100">
      <div className="w-100 d-flex flex-column flex-md-row justify-content-around">
        <div className="flex-grow-1 text-center">
          <h5 className="card-title mb-3">Documents by Type</h5>
          {stats.docsByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats.docsByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  labelLine={false}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                >
                  {stats.docsByType.map(
                    (_entry: DocTypeStat, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]}
                      />
                    ),
                  )}
                </Pie>
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const { name, value } = payload[0].payload;
                    const percentage = (
                      (value / stats.totalDocuments) *
                      100
                    ).toFixed(2);
                    return (
                      <div
                        style={{
                          backgroundColor: "rgba(0, 0, 0, 0.8)",
                          color: "#fff",
                          borderRadius: "5px",
                          padding: "6px 10px",
                          fontSize: "0.85rem",
                        }}
                      >
                        <strong>{name}</strong>: {percentage}%
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="card-text text-muted mt-4">
              No documents found to generate stats.
            </p>
          )}
        </div>

        <div className="flex-grow-1 text-center">
          <h5 className="card-title mb-3 mt-4 mt-md-0">Documents by Status</h5>
          {stats.docsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats.docsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  labelLine={false}
                  fill="#82ca9d"
                  dataKey="value"
                  nameKey="name"
                >
                  {stats.docsByStatus.map(
                    (_entry: DocStatusStat, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          PIE_CHART_COLORS[
                            (index + 2) % PIE_CHART_COLORS.length
                          ]
                        }
                      />
                    ),
                  )}
                </Pie>
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const { name, value } = payload[0].payload;
                    const percentage = (
                      (value / stats.totalDocuments) *
                      100
                    ).toFixed(2);
                    return (
                      <div
                        style={{
                          backgroundColor: "rgba(0, 0, 0, 0.8)",
                          color: "#fff",
                          borderRadius: "5px",
                          padding: "6px 10px",
                          fontSize: "0.85rem",
                        }}
                      >
                        <strong>{name}</strong>: {percentage}%
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="card-text text-muted mt-4">
              No status data available.
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const recentFiles = data?.recentFiles || [];

  return (
    <div className="container mt-4">
      {/* --- Page Header (Updated with Greeting) --- */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>{greeting}</h1>
        <div className="d-flex gap-2 align-items-center">
          {isLevel0Or1 && pendingDispositionsCount > 0 && (
            <button
              onClick={() => setShowPendingDispositionsModal(true)}
              className="btn btn-outline-danger position-relative"
              style={{ fontWeight: "500" }}
            >
              <i className="bi bi-exclamation-circle me-2"></i>Action Needed
              <span
                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                style={{ fontSize: "0.6rem", padding: "0.25em 0.5em" }}
              >
                {pendingDispositionsCount}
                <span className="visually-hidden">pending dispositions</span>
              </span>
            </button>
          )}
          <button
            onClick={() => setShowReceiveModal(true)}
            className="btn btn-outline-primary position-relative"
          >
            <i className="bi bi-box-arrow-in-down me-2"></i> Receive Document
            {pendingDistributions && pendingDistributions.length > 0 && (
              <span
                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                style={{ fontSize: "0.6rem", padding: "0.25em 0.5em" }}
              >
                {pendingDistributions.length}
                <span className="visually-hidden">pending documents</span>
              </span>
            )}
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn btn-primary"
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

            {/* --- Right Column --- */}
            <div className="col-lg-4">
              {isLevel0Or1 ? (
                <>
                  <h5>
                    <i className="bi bi-journal-check me-2"></i>Documents to
                    Review
                  </h5>
                  <DocumentsToReviewList />
                </>
              ) : (
                <>
                  <h5>
                    <i className="bi bi-graph-up-arrow me-2"></i>Analytics
                  </h5>
                  {renderAnalyticsCharts()}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {isLevel0Or1 && (
        <div className="document-table-card mt-3">
          <div className="p-4">
            <h5>
              <i className="bi bi-graph-up-arrow me-2"></i>Analytics
            </h5>
            <div className="card mini-stat-card mb-3 flex-row justify-content-around">
              {renderAnalyticsCharts()}
            </div>
          </div>
        </div>
      )}

      {selectedDocId && (
        <ForwardDocumentModal
          show={showSendModal}
          onClose={() => setShowSendModal(false)}
          documentId={selectedDocId}
        />
      )}

      <UploadModal
        show={showUploadModal}
        onClose={() => setShowUploadModal(false)}
      />

      <ReceiveDocumentModal
        show={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
      />

      <PendingDispositionsModal
        show={showPendingDispositionsModal}
        onClose={() => setShowPendingDispositionsModal(false)}
      />
    </div>
  );
}
