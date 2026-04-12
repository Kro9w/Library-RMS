import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { trpc } from "../../trpc";
import "../ArchivesPage.css";

const getInitials = (name: string) => {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] ?? "?").toUpperCase();
};

interface TypeBarChartProps {
  documents: any[];
  tab: "archives" | "destruction";
}

const TypeBarChart: React.FC<TypeBarChartProps> = ({ documents, tab }) => {
  const [hoveredType, setHoveredType] = useState<string | null>(null);

  const entries = useMemo(() => {
    const typeGroups: Record<string, { count: number; color: string }> = {};
    documents.forEach((doc: any) => {
      const name = doc.documentType?.name || "Uncategorized";
      const rawColor = doc.documentType?.color;
      const color = rawColor
        ? rawColor.startsWith("#")
          ? rawColor
          : `#${rawColor}`
        : "#a1a1aa";
      if (!typeGroups[name]) typeGroups[name] = { count: 0, color };
      typeGroups[name].count++;
    });

    return Object.entries(typeGroups).sort((a, b) => b[1].count - a[1].count);
  }, [documents]);

  const total = documents.length;

  if (total === 0) {
    return (
      <div className="archives-type-chart-card">
        <span className="archives-type-chart-label">By Document Type</span>
        <div className="archives-stacked-bar" />
        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
          No data
        </p>
      </div>
    );
  }

  return (
    <div className="archives-type-chart-card">
      <span className="archives-type-chart-label">
        {tab === "archives" ? "Archived" : "Destroyed"} by Document Type
      </span>
      <div className="archives-stacked-bar">
        {entries.map(([name, { count, color }]) => {
          const pct = (count / total) * 100;
          return (
            <div
              key={name}
              className="archives-stacked-segment"
              style={{
                width: `${pct}%`,
                backgroundColor: color,
                opacity: hoveredType && hoveredType !== name ? 0.35 : 1,
                transition: "opacity 150ms ease",
              }}
              onMouseEnter={() => setHoveredType(name)}
              onMouseLeave={() => setHoveredType(null)}
              title={`${name}: ${count} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>
      <div className="archives-type-legend">
        {entries.map(([name, { count, color }]) => (
          <div
            key={name}
            className="archives-type-legend-item"
            onMouseEnter={() => setHoveredType(name)}
            onMouseLeave={() => setHoveredType(null)}
            style={{
              opacity: hoveredType && hoveredType !== name ? 0.4 : 1,
              cursor: "default",
            }}
          >
            <span
              className="archives-type-legend-dot"
              style={{ backgroundColor: color }}
            />
            <span className="archives-type-legend-name">{name}</span>
            <span className="archives-type-legend-count">
              {count} · {((count / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function AdminMasterArchives() {
  const [activeTab, setActiveTab] = useState<"archives" | "destruction">(
    "archives",
  );
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterCampus, setFilterCampus] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const pageSize = 25;

  const { data: archivedData, isLoading: isLoadingArchived } =
    trpc.archives.getAllArchivedDocuments.useQuery(
      { page, pageSize, search },
      { enabled: activeTab === "archives" },
    );

  const { data: destroyedData, isLoading: isLoadingDestroyed } =
    trpc.archives.getAllDestroyedDocuments.useQuery(
      { page, pageSize, search },
      { enabled: activeTab === "destruction" },
    );

  const { data: archiveAllData } =
    trpc.archives.getAllArchivedDocuments.useQuery({
      page: 1,
      pageSize: 1000,
    });
  const { data: destroyAllData } =
    trpc.archives.getAllDestroyedDocuments.useQuery({
      page: 1,
      pageSize: 1000,
    });

  const utils = trpc.useUtils();
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(
    null,
  );
  const [downloadingManifestId, setDownloadingManifestId] = useState<
    string | null
  >(null);

  const handleDownloadManifest = React.useCallback(
    async (id: string) => {
      try {
        setDownloadingManifestId(id);
        const result = await utils.archives.getArchiveManifestUrl.fetch({ id });
        if (result.signedUrl) window.open(result.signedUrl, "_blank");
      } catch {
        alert("Failed to fetch manifest");
      } finally {
        setDownloadingManifestId(null);
      }
    },
    [utils.archives.getArchiveManifestUrl],
  );

  const handleDownloadFile = React.useCallback(
    async (documentId: string) => {
      try {
        setDownloadingFileId(documentId);
        const result = await utils.documents.getSignedDocumentUrl.fetch({
          documentId,
        });
        if (result.signedUrl) window.open(result.signedUrl, "_blank");
      } catch {
        alert("Failed to fetch document file");
      } finally {
        setDownloadingFileId(null);
      }
    },
    [utils.documents.getSignedDocumentUrl],
  );

  const isLoading =
    activeTab === "archives" ? isLoadingArchived : isLoadingDestroyed;

  const rawTableData: any[] = useMemo(() => {
    return (
      (activeTab === "archives"
        ? archivedData?.documents
        : destroyedData?.documents) || []
    );
  }, [activeTab, archivedData?.documents, destroyedData?.documents]);

  const totalCount = useMemo(() => {
    return (
      (activeTab === "archives"
        ? archivedData?.totalCount
        : destroyedData?.totalCount) || 0
    );
  }, [activeTab, archivedData?.totalCount, destroyedData?.totalCount]);

  const totalPages = useMemo(
    () => Math.ceil(totalCount / pageSize),
    [totalCount, pageSize],
  );

  const chartDocs = useMemo(() => {
    return activeTab === "archives"
      ? archiveAllData?.documents || []
      : destroyAllData?.documents || [];
  }, [activeTab, archiveAllData?.documents, destroyAllData?.documents]);

  const archiveTotalCount = useMemo(
    () => archiveAllData?.totalCount ?? 0,
    [archiveAllData?.totalCount],
  );
  const destroyTotalCount = useMemo(
    () => destroyAllData?.totalCount ?? 0,
    [destroyAllData?.totalCount],
  );

  const campusOptions = useMemo(() => {
    const map: Record<string, string> = {};
    chartDocs.forEach((d: any) => {
      if (d.campus) map[d.campus.id] = d.campus.name;
    });
    return Object.entries(map).sort((a, b) => a[1].localeCompare(b[1]));
  }, [chartDocs]);

  const deptOptions = useMemo(() => {
    const map: Record<string, string> = {};
    chartDocs.forEach((d: any) => {
      if (d.department && (!filterCampus || d.campus?.id === filterCampus)) {
        map[d.department.id] = d.department.name;
      }
    });
    return Object.entries(map).sort((a, b) => a[1].localeCompare(b[1]));
  }, [chartDocs, filterCampus]);

  const tableData = useMemo(() => {
    return rawTableData.filter((d: any) => {
      if (filterCampus && d.campus?.id !== filterCampus) return false;
      if (filterDept && d.department?.id !== filterDept) return false;
      return true;
    });
  }, [rawTableData, filterCampus, filterDept]);

  const switchTab = React.useCallback((tab: "archives" | "destruction") => {
    setActiveTab(tab);
    setPage(1);
    setSearch("");
    setFilterCampus("");
    setFilterDept("");
  }, []);

  return (
    <div>
      {/* ── Page header ── */}
      <div className="archives-page-header" style={{ marginBottom: "20px" }}>
        <div>
          <h2 className="admin-page-title">Master Archives Register</h2>
          <p className="admin-page-desc" style={{ marginBottom: 0 }}>
            Institution-wide view of all archived and destroyed records across
            every campus and office.
          </p>
        </div>
        <div className="archives-tab-strip">
          <button
            className={`archives-tab ${activeTab === "archives" ? "active" : ""}`}
            onClick={() => switchTab("archives")}
          >
            <i className="bi bi-archive" /> Archives Register
          </button>
          <button
            className={`archives-tab tab-destruction ${activeTab === "destruction" ? "active" : ""}`}
            onClick={() => switchTab("destruction")}
          >
            <i className="bi bi-trash3" /> Destruction Register
          </button>
        </div>
      </div>

      {/* ── Stats + Chart ── */}
      <div className="archives-overview-row">
        <div
          className="archives-stat-chip"
          style={{
            borderColor:
              activeTab === "archives" ? "var(--info)" : "var(--border)",
            transition: "border-color 200ms ease",
          }}
        >
          <div className="archives-stat-chip-icon icon-archive">
            <i className="bi bi-archive" />
          </div>
          <div className="d-flex flex-column">
            <span className="archives-stat-chip-label">Total Archived</span>
            <span className="archives-stat-chip-value">
              {archiveTotalCount}
            </span>
          </div>
        </div>
        <div
          className="archives-stat-chip"
          style={{
            borderColor:
              activeTab === "destruction" ? "var(--danger)" : "var(--border)",
            transition: "border-color 200ms ease",
          }}
        >
          <div className="archives-stat-chip-icon icon-destroy">
            <i className="bi bi-trash3" />
          </div>
          <div className="d-flex flex-column">
            <span className="archives-stat-chip-label">Total Destroyed</span>
            <span className="archives-stat-chip-value">
              {destroyTotalCount}
            </span>
          </div>
        </div>
        <TypeBarChart documents={chartDocs} tab={activeTab} />
      </div>

      {/* ── Filters row ── */}
      <div
        className="d-flex align-items-center gap-2 mb-4 flex-wrap"
        style={{
          padding: "12px 14px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        {activeTab === "destruction" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              color: "var(--danger)",
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            <i className="bi bi-shield-exclamation" />
            File contents permanently removed — metadata only
          </div>
        )}

        <div
          style={{
            marginLeft: activeTab === "destruction" ? "auto" : 0,
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {/* Campus filter */}
          <select
            className="filter-dropdown"
            value={filterCampus}
            onChange={(e) => {
              setFilterCampus(e.target.value);
              setFilterDept("");
              setPage(1);
            }}
            style={{ minWidth: "160px" }}
          >
            <option value="">All Campuses</option>
            {campusOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>

          {/* Department filter */}
          <select
            className="filter-dropdown"
            value={filterDept}
            onChange={(e) => {
              setFilterDept(e.target.value);
              setPage(1);
            }}
            disabled={!filterCampus && deptOptions.length === 0}
            style={{ minWidth: "200px" }}
          >
            <option value="">All Offices</option>
            {deptOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>

          {/* Search */}
          <div
            className="archives-search-wrap"
            style={{ minWidth: "200px", flex: 1 }}
          >
            <i className="bi bi-search archives-search-icon" />
            <input
              type="text"
              className="archives-search-input"
              placeholder="Search by title…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Records Table ── */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-xs)",
          overflow: "hidden",
        }}
      >
        {isLoading ? (
          <div className="archives-loading">
            <div className="archives-spinner" />
            <span>Loading records…</span>
          </div>
        ) : tableData.length === 0 ? (
          <div className="archives-empty">
            <div
              className={`archives-empty-icon ${activeTab === "archives" ? "icon-archive" : "icon-destroy"}`}
            >
              <i
                className={`bi ${activeTab === "archives" ? "bi-archive" : "bi-trash3"}`}
              />
            </div>
            <h4>No records found</h4>
            <p>
              {search || filterCampus || filterDept
                ? "Try adjusting your filters or search term."
                : `No ${activeTab === "archives" ? "archived" : "destroyed"} records in the institution yet.`}
            </p>
          </div>
        ) : (
          <>
            <table className="archives-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Campus</th>
                  <th>Office / Department</th>
                  <th>Type</th>
                  <th>
                    {activeTab === "archives" ? "Archived" : "Destroyed"} Date
                  </th>
                  <th>Uploaded By</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((doc: any) => {
                  const uploaderName = doc.uploadedBy
                    ? `${doc.uploadedBy.firstName ?? ""} ${doc.uploadedBy.lastName ?? ""}`.trim()
                    : "Unknown";
                  const typeColor = doc.documentType?.color
                    ? doc.documentType.color.startsWith("#")
                      ? doc.documentType.color
                      : `#${doc.documentType.color}`
                    : "var(--text-muted)";

                  return (
                    <tr key={doc.id}>
                      <td>
                        <span className="archives-doc-title">{doc.title}</span>
                        {doc.controlNumber && (
                          <span className="archives-doc-cn">
                            CN: {doc.controlNumber}
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          fontSize: "13px",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {doc.campus?.name || (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td
                        style={{
                          fontSize: "13px",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {doc.department?.name || (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {doc.documentType ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              fontSize: "12px",
                              fontWeight: 500,
                              color: "var(--text-secondary)",
                            }}
                          >
                            <span
                              style={{
                                width: "7px",
                                height: "7px",
                                borderRadius: "50%",
                                backgroundColor: typeColor,
                                flexShrink: 0,
                              }}
                            />
                            {doc.documentType.name}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--text-muted)",
                            }}
                          >
                            Uncategorized
                          </span>
                        )}
                      </td>
                      <td>
                        {doc.lifecycle?.dispositionDate ? (
                          <div className="archives-date">
                            <div className="archives-date-primary">
                              {format(
                                new Date(doc.lifecycle.dispositionDate),
                                "MMM d, yyyy",
                              )}
                            </div>
                            <div className="archives-date-secondary">
                              {format(
                                new Date(doc.lifecycle.dispositionDate),
                                "h:mm a",
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <div className="archives-uploader">
                          <div className="archives-uploader-avatar">
                            {getInitials(uploaderName)}
                          </div>
                          <span className="archives-uploader-name">
                            {uploaderName}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="archives-actions">
                          {activeTab === "archives" ? (
                            <>
                              <button
                                className="archives-action-btn btn-download"
                                onClick={() => handleDownloadFile(doc.id)}
                                disabled={downloadingFileId === doc.id}
                                title="Download archived file"
                              >
                                {downloadingFileId === doc.id ? (
                                  <>
                                    <span
                                      className="archives-spinner"
                                      style={{
                                        width: 12,
                                        height: 12,
                                        borderWidth: 1.5,
                                      }}
                                    />{" "}
                                    Fetching…
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-download" /> Download
                                  </>
                                )}
                              </button>
                              {doc.lifecycle?.archiveManifestUrl && (
                                <button
                                  className="archives-action-btn btn-manifest"
                                  onClick={() => handleDownloadManifest(doc.id)}
                                  disabled={downloadingManifestId === doc.id}
                                  title="View archival manifest"
                                >
                                  {downloadingManifestId === doc.id ? (
                                    <span
                                      className="archives-spinner"
                                      style={{
                                        width: 12,
                                        height: 12,
                                        borderWidth: 1.5,
                                      }}
                                    />
                                  ) : (
                                    <>
                                      <i className="bi bi-filetype-json" />{" "}
                                      Manifest
                                    </>
                                  )}
                                </button>
                              )}
                            </>
                          ) : (
                            <Link
                              to={`/documents/${doc.id}`}
                              className="archives-action-btn btn-certificate"
                            >
                              <i className="bi bi-shield-check" /> Certificate
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="archives-pagination">
                <span className="archives-pagination-info">
                  Page {page} of {totalPages} · {totalCount} total records
                  {(filterCampus || filterDept) && ` (filtered)`}
                </span>
                <div className="archives-pagination-controls">
                  <button
                    className="archives-page-btn"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                  >
                    <i className="bi bi-chevron-left" /> Previous
                  </button>
                  <button
                    className="archives-page-btn"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page === totalPages}
                  >
                    Next <i className="bi bi-chevron-right" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
