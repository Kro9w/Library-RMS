import React, { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { trpc } from "../trpc";
import "./ArchivesPage.css";

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

  const typeGroups: Record<string, { count: number; color: string }> = {};
  documents.forEach((doc: any) => {
    const name = doc.documentType?.name || "Uncategorized";
    const rawColor = doc.documentType?.color;
    const color = rawColor
      ? rawColor.startsWith("#")
        ? rawColor
        : `#${rawColor}`
      : "#a1a1aa";
    if (!typeGroups[name]) {
      typeGroups[name] = { count: 0, color };
    }
    typeGroups[name].count++;
  });

  const entries = Object.entries(typeGroups).sort(
    (a, b) => b[1].count - a[1].count,
  );
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

      {/* Stacked bar */}
      <div className="archives-stacked-bar" title={`${total} total records`}>
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
                transition:
                  "opacity 150ms ease, width 400ms cubic-bezier(0.4,0,0.2,1)",
              }}
              onMouseEnter={() => setHoveredType(name)}
              onMouseLeave={() => setHoveredType(null)}
              title={`${name}: ${count} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="archives-type-legend">
        {entries.map(([name, { count, color }]) => {
          const pct = ((count / total) * 100).toFixed(1);
          return (
            <div
              key={name}
              className="archives-type-legend-item"
              onMouseEnter={() => setHoveredType(name)}
              onMouseLeave={() => setHoveredType(null)}
              style={{
                opacity: hoveredType && hoveredType !== name ? 0.4 : 1,
                transition: "opacity 150ms ease",
                cursor: "default",
              }}
            >
              <span
                className="archives-type-legend-dot"
                style={{ backgroundColor: color }}
              />
              <span className="archives-type-legend-name">{name}</span>
              <span className="archives-type-legend-count">
                {count} · {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ArchivesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"archives" | "destruction">(
    "archives",
  );
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 10;

  const { data: _archivedData, isLoading: isLoadingArchived } =
    trpc.archives.getArchivedDocuments.useQuery(
      { page, pageSize, search },
      { enabled: activeTab === "archives" },
    );

  const { data: _destroyedData, isLoading: isLoadingDestroyed } =
    trpc.archives.getDestroyedDocuments.useQuery(
      { page, pageSize, search },
      { enabled: activeTab === "destruction" },
    );

  const { data: archiveAllData } = trpc.archives.getArchivedDocuments.useQuery({
    page: 1,
    pageSize: 1000,
  });
  const { data: destroyAllData } = trpc.archives.getDestroyedDocuments.useQuery(
    {
      page: 1,
      pageSize: 1000,
    },
  );

  const utils = trpc.useUtils();
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(
    null,
  );
  const [downloadingManifestId, setDownloadingManifestId] = useState<
    string | null
  >(null);

  const handleDownloadManifest = async (id: string) => {
    try {
      setDownloadingManifestId(id);
      const result = await utils.archives.getArchiveManifestUrl.fetch({ id });
      if (result.signedUrl) window.open(result.signedUrl, "_blank");
    } catch {
      alert("Failed to fetch manifest");
    } finally {
      setDownloadingManifestId(null);
    }
  };

  const handleDownloadFile = async (documentId: string) => {
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
  };

  const isLoading =
    activeTab === "archives" ? isLoadingArchived : isLoadingDestroyed;
  const archivedData: any = _archivedData;
  const destroyedData: any = _destroyedData;
  const data: any = activeTab === "archives" ? archivedData : destroyedData;
  const documents = data?.documents || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const chartDocs =
    activeTab === "archives"
      ? archiveAllData?.documents || []
      : destroyAllData?.documents || [];

  const archiveTotalCount = archiveAllData?.totalCount ?? 0;
  const destroyTotalCount = destroyAllData?.totalCount ?? 0;

  const groupedDocuments = React.useMemo(() => {
    const groups: Record<string, { docs: typeof documents; color?: string }> =
      {};
    documents.forEach((doc: any) => {
      const typeName = doc.documentType?.name || "Uncategorized";
      if (!groups[typeName]) {
        groups[typeName] = { docs: [], color: doc.documentType?.color };
      }
      groups[typeName].docs.push(doc);
    });
    return groups;
  }, [documents]);

  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>(
    {},
  );
  const toggleAccordion = (groupName: string) => {
    setOpenAccordions((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const switchTab = (tab: "archives" | "destruction") => {
    setActiveTab(tab);
    setPage(1);
    setSearch("");
  };

  return (
    <div className="container mt-4">
      {/* ── Page header with tab strip on right ── */}
      <div className="archives-page-header">
        <div>
          <h2>Disposition Register</h2>
          <p className="text-muted mb-0" style={{ fontSize: "13px" }}>
            Institutional records archived or permanently destroyed per
            retention schedule.
          </p>
        </div>
        <div className="archives-tab-strip">
          <button
            className={`archives-tab ${activeTab === "archives" ? "active" : ""}`}
            onClick={() => switchTab("archives")}
          >
            <i className="bi bi-archive" />
            Archives
          </button>
          <button
            className={`archives-tab tab-destruction ${activeTab === "destruction" ? "active" : ""}`}
            onClick={() => switchTab("destruction")}
          >
            <i className="bi bi-trash3" />
            Destruction Register
          </button>
        </div>
      </div>

      {/* ── Stats + Chart row ── */}
      <div className="archives-overview-row">
        {/* Archive stat chip */}
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
            <span className="archives-stat-chip-label">Archived</span>
            <span className="archives-stat-chip-value">
              {archiveTotalCount}
            </span>
          </div>
        </div>

        {/* Destruction stat chip */}
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
            <span className="archives-stat-chip-label">Destroyed</span>
            <span className="archives-stat-chip-value">
              {destroyTotalCount}
            </span>
          </div>
        </div>

        {/* Type distribution chart */}
        <TypeBarChart documents={chartDocs} tab={activeTab} />
      </div>

      {/* ── Search row ── */}
      <div className="d-flex align-items-center gap-3 mb-4">
        {activeTab === "destruction" && (
          <div
            className="archives-destruction-notice"
            style={{ margin: 0, flex: 1 }}
          >
            <i className="bi bi-shield-exclamation" />
            <span>
              Records below have been <strong>permanently destroyed</strong>{" "}
              from storage. Only metadata tombstones remain for audit
              compliance.
            </span>
          </div>
        )}
      </div>
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="archives-search-wrap" style={{ marginLeft: "auto" }}>
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

      {/* ── Content ── */}
      {isLoading ? (
        <div className="archives-loading">
          <div className="archives-spinner" />
          <span>Loading records…</span>
        </div>
      ) : documents.length === 0 ? (
        <div className="archives-empty">
          <div
            className={`archives-empty-icon ${activeTab === "archives" ? "icon-archive" : "icon-destroy"}`}
          >
            <i
              className={`bi ${activeTab === "archives" ? "bi-archive" : "bi-trash3"}`}
            />
          </div>
          <h4>
            No {activeTab === "archives" ? "archived" : "destroyed"} records
            found
          </h4>
          <p>
            {search
              ? `No records match "${search}". Try a different search term.`
              : `Documents disposed through the ${activeTab === "archives" ? "archival" : "destruction"} process will appear here.`}
          </p>
        </div>
      ) : (
        <div>
          {Object.entries(groupedDocuments)
            .sort(([a], [b]) => {
              if (a === "Uncategorized") return 1;
              if (b === "Uncategorized") return -1;
              return a.localeCompare(b);
            })
            .map(([groupName, { docs: groupDocs, color }]) => {
              const isOpen = openAccordions[groupName];
              const dotColor = color
                ? color.startsWith("#")
                  ? color
                  : `#${color}`
                : "var(--text-muted)";

              return (
                <div className="archives-group" key={groupName}>
                  <button
                    className="archives-group-header"
                    onClick={() => toggleAccordion(groupName)}
                  >
                    <div className="archives-group-header-left">
                      <span
                        className="archives-group-type-dot"
                        style={{ backgroundColor: dotColor }}
                      />
                      <span className="archives-group-title">{groupName}</span>
                    </div>
                    <div className="archives-group-header-right">
                      <span className="archives-group-count">
                        {groupDocs.length}{" "}
                        {groupDocs.length === 1 ? "record" : "records"}
                      </span>
                      <i
                        className={`bi bi-chevron-down archives-group-chevron ${isOpen ? "open" : ""}`}
                      />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="archives-table-wrap">
                      <table className="archives-table">
                        <thead>
                          <tr>
                            <th>Document</th>
                            <th>
                              {activeTab === "archives"
                                ? "Archived"
                                : "Destroyed"}{" "}
                              Date
                            </th>
                            <th>Uploaded By</th>
                            <th style={{ textAlign: "right" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupDocs.map((doc: any) => {
                            const uploaderName = doc.uploadedBy
                              ? `${doc.uploadedBy.firstName ?? ""} ${doc.uploadedBy.lastName ?? ""}`.trim()
                              : "Unknown";

                            return (
                              <tr key={doc.id}>
                                <td>
                                  <span className="archives-doc-title">
                                    {doc.title}
                                  </span>
                                  {doc.controlNumber && (
                                    <span className="archives-doc-cn">
                                      CN: {doc.controlNumber}
                                    </span>
                                  )}
                                </td>
                                <td>
                                  {doc.lifecycle?.dispositionDate ? (
                                    <div className="archives-date">
                                      <div className="archives-date-primary">
                                        {format(
                                          new Date(
                                            doc.lifecycle?.dispositionDate,
                                          ),
                                          "MMM d, yyyy",
                                        )}
                                      </div>
                                      <div className="archives-date-secondary">
                                        {format(
                                          new Date(
                                            doc.lifecycle?.dispositionDate,
                                          ),
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
                                          onClick={() =>
                                            handleDownloadFile(doc.id)
                                          }
                                          disabled={
                                            downloadingFileId === doc.id
                                          }
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
                                              <i className="bi bi-download" />{" "}
                                              Download
                                            </>
                                          )}
                                        </button>
                                        {doc.lifecycle?.archiveManifestUrl && (
                                          <button
                                            className="archives-action-btn btn-manifest"
                                            onClick={() =>
                                              handleDownloadManifest(doc.id)
                                            }
                                            disabled={
                                              downloadingManifestId === doc.id
                                            }
                                            title="View archival manifest"
                                          >
                                            {downloadingManifestId ===
                                            doc.id ? (
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
                                        title="View destruction certificate"
                                      >
                                        <i className="bi bi-shield-check" />{" "}
                                        Certificate
                                      </Link>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {totalPages > 1 && (
                        <div className="archives-pagination">
                          <span className="archives-pagination-info">
                            Page {page} of {totalPages} · {totalCount} total
                            records
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
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};
