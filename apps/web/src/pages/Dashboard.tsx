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

const RETENTION_COLORS: Record<string, string> = {
  Active: "#16a34a",
  Inactive: "#a1a1aa",
  "Ready for Disposition": "#ca8a04",
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

function ChartLegend({
  items,
}: {
  items: { name: string; color: string; value: number; pct: string }[];
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "5px",
        padding: "0 4px",
        maxHeight: "120px",
        overflowY: "auto",
        scrollbarWidth: "thin",
      }}
    >
      {items.map((item) => (
        <div
          key={item.name}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            fontSize: "12px",
            lineHeight: "1.4",
          }}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: item.color,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              flex: 1,
              color: "var(--text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
            title={item.name}
          >
            {item.name}
          </span>
          <span
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              flexShrink: 0,
            }}
          >
            {item.pct}%
          </span>
        </div>
      ))}
    </div>
  );
}

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

  const typeLegendItems = hasTypeData
    ? typeChartData.map((entry) => ({
        name: entry.name,
        color: entry.color || EMPTY_PIE_COLOR[0],
        value: entry.value,
        pct:
          activeTotalDocs > 0
            ? ((entry.value / activeTotalDocs) * 100).toFixed(1)
            : "0",
      }))
    : [];

  const retentionLegendItems = hasRetentionData
    ? retentionChartData.map((entry) => ({
        name: entry.name,
        color: RETENTION_COLORS[entry.name] || "#6c757d",
        value: entry.value,
        pct:
          activeTotalDocs > 0
            ? ((entry.value / activeTotalDocs) * 100).toFixed(1)
            : "0",
      }))
    : [];

  const renderAnalyticsCharts = () => (
    <div style={{ width: "100%", padding: "20px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "200px 1fr 1fr",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Series selector */}
        <div>
          <p
            style={{
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "var(--text-muted)",
              margin: "0 0 10px",
            }}
          >
            Records Series
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            <button
              onClick={() => setSelectedSeriesId(null)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "7px 10px",
                borderRadius: "var(--radius-md)",
                border: "1px solid",
                fontSize: "13px",
                fontWeight: !selectedSeriesId ? 600 : 400,
                cursor: "pointer",
                background: !selectedSeriesId
                  ? "var(--brand-subtle)"
                  : "transparent",
                borderColor: !selectedSeriesId
                  ? "var(--brand-muted)"
                  : "transparent",
                color: !selectedSeriesId
                  ? "var(--brand)"
                  : "var(--text-secondary)",
                transition: "all 100ms ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                }}
              >
                All Series
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "var(--text-muted)",
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border)",
                  padding: "1px 6px",
                  borderRadius: "var(--radius-full)",
                  flexShrink: 0,
                }}
              >
                {stats.totalDocuments}
              </span>
            </button>
            {stats.seriesStats.map((series: SeriesStat) => (
              <button
                key={series.id}
                onClick={() => setSelectedSeriesId(series.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "7px 10px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid",
                  fontSize: "13px",
                  fontWeight: selectedSeriesId === series.id ? 600 : 400,
                  cursor: "pointer",
                  background:
                    selectedSeriesId === series.id
                      ? "var(--brand-subtle)"
                      : "transparent",
                  borderColor:
                    selectedSeriesId === series.id
                      ? "var(--brand-muted)"
                      : "transparent",
                  color:
                    selectedSeriesId === series.id
                      ? "var(--brand)"
                      : "var(--text-secondary)",
                  transition: "all 100ms ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                  }}
                >
                  {series.name}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "var(--text-muted)",
                    background: "var(--bg-subtle)",
                    border: "1px solid var(--border)",
                    padding: "1px 6px",
                    borderRadius: "var(--radius-full)",
                    flexShrink: 0,
                  }}
                >
                  {series.totalDocs}
                </span>
              </button>
            ))}
            {stats.seriesStats.length === 0 && (
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  margin: "8px 0 0",
                  padding: "0 4px",
                }}
              >
                No series yet.
              </p>
            )}
          </div>
        </div>

        {/* Documents by Type */}
        <div
          style={{
            borderLeft: "1px solid var(--border)",
            paddingLeft: "24px",
            height: "auto",
            minHeight: "100%",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "var(--text-muted)",
              margin: "0 0 12px",
            }}
          >
            By Document Type
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={hasTypeData ? typeChartData : EMPTY_PIE_DATA}
                cx="50%"
                cy="50%"
                innerRadius={46}
                outerRadius={72}
                labelLine={false}
                dataKey="value"
                nameKey="name"
                isAnimationActive={hasTypeData}
                strokeWidth={0}
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
                    const pct =
                      activeTotalDocs > 0
                        ? ((value / activeTotalDocs) * 100).toFixed(1)
                        : "0";
                    return (
                      <div className="custom-tooltip">
                        <strong>{name}</strong>: {pct}%
                      </div>
                    );
                  }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
          {hasTypeData ? (
            <div style={{ marginTop: "12px" }}>
              <ChartLegend items={typeLegendItems} />
            </div>
          ) : (
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                margin: "8px 0 0",
                textAlign: "center",
              }}
            >
              Documents will appear here once uploaded.
            </p>
          )}
        </div>

        {/* Retention Status */}
        <div
          style={{
            borderLeft: "1px solid var(--border)",
            paddingLeft: "24px",
            height: "auto",
            minHeight: "100%",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "var(--text-muted)",
              margin: "0 0 12px",
            }}
          >
            Retention Status
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={hasRetentionData ? retentionChartData : EMPTY_PIE_DATA}
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={72}
                labelLine={false}
                dataKey="value"
                nameKey="name"
                isAnimationActive={hasRetentionData}
                strokeWidth={0}
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
                    const pct =
                      activeTotalDocs > 0
                        ? ((value / activeTotalDocs) * 100).toFixed(1)
                        : "0";
                    return (
                      <div className="custom-tooltip">
                        <strong>{name}</strong>: {pct}%
                      </div>
                    );
                  }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
          {hasRetentionData ? (
            <div style={{ marginTop: "12px" }}>
              <ChartLegend items={retentionLegendItems} />
            </div>
          ) : (
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                margin: "8px 0 0",
                textAlign: "center",
              }}
            >
              Status breakdown will appear once documents are reviewed.
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
          <div
            style={{
              padding: "18px 20px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <h5 style={{ margin: 0 }}>
              <i className="bi bi-graph-up-arrow me-2"></i>Analytics
            </h5>
          </div>
          {renderAnalyticsCharts()}
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
