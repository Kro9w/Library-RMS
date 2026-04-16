import { useForm } from "react-hook-form";
import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { trpc } from "../trpc";
import { LoadingAnimation } from "../components/ui/LoadingAnimation";

import "./Documents.css";
import "./Dashboard.css";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

import { UploadModal } from "../components/UploadModal";
import { ForwardDocumentModal } from "../components/ForwardDocumentModal";
import { ReceiveDocumentModal } from "../components/ReceiveDocumentModal";
import { PendingDispositionsModal } from "../components/PendingDispositionsModal";
import { DocumentsToReviewList } from "../components/DocumentsToReviewList";

import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";

const RETENTION_COLORS: Record<string, string> = {
  Active: "#28a745",
  Inactive: "#ffc107",
  "Ready for Disposition": "#dc3545",
};

const EMPTY_PIE_DATA = [{ name: "No data", value: 1 }];
const EMPTY_PIE_COLOR = ["#e4e4e7"];

type RecentFile = AppRouterOutputs["getDashboardStats"]["recentFiles"][0];
type DocTypeStat =
  AppRouterOutputs["getDashboardStats"]["overallStats"]["docsByType"][0];
type DocRetentionStat =
  AppRouterOutputs["getDashboardStats"]["overallStats"]["docsByRetention"][0];
type SeriesStat = AppRouterOutputs["getDashboardStats"]["seriesStats"][0];

const EmptyChartLabel = ({ label }: { label: string }) => (
  <text
    x="50%"
    y="50%"
    textAnchor="middle"
    dominantBaseline="middle"
    style={{
      fontSize: "12px",
      fill: "var(--text-muted)",
      fontFamily: "var(--font-sans)",
    }}
  >
    {label}
  </text>
);

export function Dashboard() {
  const { data, isLoading, isError, error } = trpc.getDashboardStats.useQuery();
  const { data: user } = trpc.user.getMe.useQuery();

  const isLevel0Or1 = useMemo(
    () => user?.roles?.some((r) => r.level === 0 || r.level === 1) || false,
    [user],
  );

  const { data: pendingDispositionsData } =
    trpc.documents.getPendingDispositions.useQuery(undefined, {
      enabled: isLevel0Or1,
    });

  const pendingDispositionsCount = pendingDispositionsData?.length || 0;

  useForm<{ controlNumber: string; email: string }>();

  const [showSendModal, setShowSendModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showPendingDispositionsModal, setShowPendingDispositionsModal] =
    useState(false);
  const [selectedDocId, _setSelectedDocId] = useState<string | null>(null);

  const { data: pendingDistributions } =
    trpc.documents.getMyPendingDistributions.useQuery();

  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
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
    if (hour >= 12 && hour < 18) timeGreeting = "Good afternoon";
    else if (hour >= 18) timeGreeting = "Good evening";
    return `${timeGreeting}, ${user?.firstName || "User"}`;
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
    seriesStats: [],
    overallStats: {
      docsByType: [],
      docsByRetention: [],
    },
  };

  const selectedSeries = stats.seriesStats.find(
    (s: SeriesStat) => s.id === selectedSeriesId,
  );
  const activeStats = selectedSeries || stats.overallStats;
  const activeTotalDocs = selectedSeries
    ? selectedSeries.totalDocs
    : stats.totalDocuments;

  const typeChartData: DocTypeStat[] = activeStats.docsByType || [];
  const hasTypeData = typeChartData.length > 0;
  const retentionChartData: DocRetentionStat[] =
    activeStats.docsByRetention || [];
  const hasRetentionData = retentionChartData.length > 0;

  const renderAnalyticsCharts = () => (
    <div className="card-body d-flex flex-column w-100">
      <div className="row g-4 w-100">
        <div className="col-md-4">
          <h5 className="card-title mb-3">Series Statistics</h5>
          <div className="list-group">
            <button
              className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${!selectedSeriesId ? "active" : ""}`}
              onClick={() => setSelectedSeriesId(null)}
            >
              <div>
                <strong>All Series</strong>
              </div>
              <span className="badge bg-primary rounded-pill">
                {stats.totalDocuments}
              </span>
            </button>
            {stats.seriesStats.map((series: SeriesStat) => (
              <button
                key={series.id}
                className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${selectedSeriesId === series.id ? "active" : ""}`}
                onClick={() => setSelectedSeriesId(series.id)}
              >
                <div>
                  <strong>{series.name}</strong>
                  <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                    {series.docsByType.length} Types
                  </div>
                </div>
                <span className="badge bg-primary rounded-pill">
                  {series.totalDocs}
                </span>
              </button>
            ))}
            {stats.seriesStats.length === 0 && (
              <div
                className="text-muted"
                style={{ fontSize: "0.85rem", padding: "1rem" }}
              >
                No series data available.
              </div>
            )}
          </div>
        </div>

        <div className="col-md-4 text-center border-start border-end">
          <h5 className="card-title mb-3">Documents by Type</h5>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={hasTypeData ? typeChartData : EMPTY_PIE_DATA}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                labelLine={false}
                dataKey="value"
                nameKey="name"
                isAnimationActive={hasTypeData}
              >
                {hasTypeData ? (
                  typeChartData.map((entry: DocTypeStat, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || EMPTY_PIE_COLOR[0]}
                    />
                  ))
                ) : (
                  <Cell fill={EMPTY_PIE_COLOR[0]} />
                )}
                {!hasTypeData && <EmptyChartLabel label="No data yet" />}
              </Pie>
              {hasTypeData && (
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const { name, value } = payload[0].payload;
                    const percentage = (
                      (value / activeTotalDocs) *
                      100
                    ).toFixed(2);
                    return (
                      <div className="custom-tooltip">
                        <strong>{name}</strong>: {percentage}%
                      </div>
                    );
                  }}
                />
              )}
              {hasTypeData && <Legend verticalAlign="bottom" height={36} />}
            </PieChart>
          </ResponsiveContainer>
          {!hasTypeData && (
            <p className="card-text text-muted" style={{ fontSize: "12px" }}>
              Documents will appear here once uploaded.
            </p>
          )}
        </div>

        <div className="col-md-4 text-center">
          <h5 className="card-title mb-3 mt-4 mt-md-0">Retention Status</h5>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={hasRetentionData ? retentionChartData : EMPTY_PIE_DATA}
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={90}
                labelLine={false}
                dataKey="value"
                nameKey="name"
                isAnimationActive={hasRetentionData}
              >
                {hasRetentionData ? (
                  retentionChartData.map(
                    (entry: DocRetentionStat, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={RETENTION_COLORS[entry.name] || "#6c757d"}
                      />
                    ),
                  )
                ) : (
                  <Cell fill={EMPTY_PIE_COLOR[0]} />
                )}
                {!hasRetentionData && <EmptyChartLabel label="No data yet" />}
              </Pie>
              {hasRetentionData && (
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const { name, value } = payload[0].payload;
                    const percentage = (
                      (value / activeTotalDocs) *
                      100
                    ).toFixed(2);
                    return (
                      <div className="custom-tooltip">
                        <strong>{name}</strong>: {percentage}%
                      </div>
                    );
                  }}
                />
              )}
              {hasRetentionData && (
                <Legend verticalAlign="bottom" height={36} />
              )}
            </PieChart>
          </ResponsiveContainer>
          {!hasRetentionData && (
            <p className="card-text text-muted" style={{ fontSize: "12px" }}>
              Status breakdown will appear here once documents are reviewed.
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const recentFiles = data?.recentFiles || [];

  return (
    <div className="container mt-4">
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

      <div className="document-table-card mt-3">
        <div className="p-4">
          <div className="row">
            <div className={isLevel0Or1 ? "col-lg-8" : "col-lg-12"}>
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

            {isLevel0Or1 && (
              <div className="col-lg-4">
                <h5>
                  <i className="bi bi-journal-check me-2"></i>Documents to
                  Review
                </h5>
                <DocumentsToReviewList />
              </div>
            )}
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
