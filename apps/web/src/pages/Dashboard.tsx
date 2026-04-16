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

const PIE_CHART_COLORS = ["#BA3B46", "#ED9B40", "#AAB8C2", "#E1E8ED"];

const EMPTY_PIE_DATA = [{ name: "No data", value: 1 }];
const EMPTY_PIE_COLOR = ["#e4e4e7"];

type RecentFile = AppRouterOutputs["getDashboardStats"]["recentFiles"][0];
type DocTypeStat = AppRouterOutputs["getDashboardStats"]["docsByType"][0];
type DocStatusStat = AppRouterOutputs["getDashboardStats"]["docsByStatus"][0];

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
    docsByType: [],
    docsByStatus: [],
  };

  const hasTypeData = stats.docsByType.length > 0;
  const hasStatusData = stats.docsByStatus.length > 0;

  const typeChartData = hasTypeData ? stats.docsByType : EMPTY_PIE_DATA;
  const typeChartColors = hasTypeData ? PIE_CHART_COLORS : EMPTY_PIE_COLOR;
  const statusChartData = hasStatusData ? stats.docsByStatus : EMPTY_PIE_DATA;
  const statusChartColors = hasStatusData ? PIE_CHART_COLORS : EMPTY_PIE_COLOR;

  const renderAnalyticsCharts = () => (
    <div className="card-body d-flex flex-column align-items-center w-100">
      <div className="w-100 d-flex flex-column flex-md-row justify-content-around">
        <div className="flex-grow-1 text-center">
          <h5 className="card-title mb-3">Documents by Type</h5>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={typeChartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                labelLine={false}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                isAnimationActive={hasTypeData}
              >
                {typeChartData.map((_entry: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={typeChartColors[index % typeChartColors.length]}
                  />
                ))}
                {!hasTypeData && <EmptyChartLabel label="No data yet" />}
              </Pie>
              {hasTypeData && (
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
                      <div className="custom-tooltip">
                        <strong>{name}</strong>: {percentage}%
                      </div>
                    );
                  }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
          {!hasTypeData && (
            <p className="card-text text-muted" style={{ fontSize: "12px" }}>
              Documents will appear here once uploaded.
            </p>
          )}
        </div>

        <div className="flex-grow-1 text-center">
          <h5 className="card-title mb-3 mt-4 mt-md-0">Documents by Status</h5>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusChartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                labelLine={false}
                fill="#82ca9d"
                dataKey="value"
                nameKey="name"
                isAnimationActive={hasStatusData}
              >
                {statusChartData.map((_entry: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      statusChartColors[(index + 2) % statusChartColors.length]
                    }
                  />
                ))}
                {!hasStatusData && <EmptyChartLabel label="No data yet" />}
              </Pie>
              {hasStatusData && (
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
                      <div className="custom-tooltip">
                        <strong>{name}</strong>: {percentage}%
                      </div>
                    );
                  }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
          {!hasStatusData && (
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
